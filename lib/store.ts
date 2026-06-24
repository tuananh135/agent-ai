import { supabase } from "./supabase";
import type {
  Appointment,
  Escalation,
  Evaluation,
  Lead,
  LeadCriteria,
  LeadStatus,
  Message,
  Property,
  QualificationCriteria,
  Report,
  Sender,
  Slot,
} from "./types";

// Store sur Supabase Postgres. Même surface de fonctions qu'avant (mais async),
// pour que les agents/outils/routes restent inchangés dans leur logique.

const NIL = "00000000-0000-0000-0000-000000000000"; // filtre "tout" pour les delete

// ---- Mappers (snake_case DB -> camelCase app) ----
const num = (v: unknown) => (v == null ? undefined : Number(v));
type Row = Record<string, any>;

const mapProperty = (r: Row): Property => ({
  id: r.id, title: r.title, type: r.type, price: Number(r.price),
  area: r.area, rooms: r.rooms, surface: r.surface, description: r.description,
});
const mapMessage = (r: Row): Message => ({ id: r.id, sender: r.sender, text: r.text, at: Number(r.at) });
const mapLead = (r: Row, msgs: Message[] = []): Lead => ({
  id: r.id, name: r.name ?? undefined, phone: r.phone ?? undefined, source: r.source,
  propertyId: r.property_id ?? undefined, status: r.status as LeadStatus,
  criteria: (r.criteria ?? {}) as LeadCriteria, evaluation: (r.evaluation ?? undefined) as Evaluation | undefined,
  messages: msgs, createdAt: Number(r.created_at),
});
const mapSlot = (r: Row): Slot => ({ id: r.id, start: Number(r.start_ms), end: Number(r.end_ms), booked: r.booked });
const mapAppt = (r: Row): Appointment => ({
  id: r.id, leadId: r.lead_id, slotId: r.slot_id, propertyId: r.property_id ?? undefined,
  status: r.status, at: Number(r.at),
});
const mapReport = (r: Row): Report => ({ id: r.id, type: r.type, leadId: r.lead_id ?? undefined, content: r.content, at: Number(r.at) });
const mapEsc = (r: Row): Escalation => ({
  id: r.id, leadId: r.lead_id, reason: r.reason, draftReply: r.draft_reply, status: r.status, at: Number(r.at),
});
const DEFAULT_CRITERIA: QualificationCriteria = {
  id: "crit", naturalText: "Aucun critère défini. Tous les leads sont acceptés.", active: true, updatedAt: 0,
};
const mapCriteria = (r: Row | null): QualificationCriteria =>
  !r ? DEFAULT_CRITERIA : {
    id: "crit", naturalText: r.natural_text, minBudget: num(r.min_budget),
    financingRequired: r.financing_required ?? undefined, areas: r.areas ?? undefined,
    propertyTypes: r.property_types ?? undefined, maxTimelineMonths: r.max_timeline_months ?? undefined,
    active: r.active, updatedAt: Number(r.updated_at),
  };

// ---- Machine à états du lead (gérée par le code, pas par le LLM) ----
const ALLOWED: Record<LeadStatus, LeadStatus[]> = {
  new: ["discovering", "pending_human", "closed"],
  discovering: ["qualified", "rejected", "pending_human", "booked", "closed"],
  qualified: ["booked", "pending_human", "rejected", "closed"],
  rejected: ["discovering", "pending_human", "closed"],
  booked: ["pending_human", "closed"],
  pending_human: ["discovering", "qualified", "rejected", "booked", "closed"],
  closed: [],
};

export async function setStatus(leadId: string, next: LeadStatus): Promise<void> {
  const { data } = await supabase.from("leads").select("status").eq("id", leadId).single();
  if (!data) return;
  const current = data.status as LeadStatus;
  if (current === next || !ALLOWED[current].includes(next)) return;
  await supabase.from("leads").update({ status: next }).eq("id", leadId);
}

// ---- Messages helpers internes ----
async function messagesFor(leadIds: string[]): Promise<Map<string, Message[]>> {
  const map = new Map<string, Message[]>();
  if (leadIds.length === 0) return map;
  const { data } = await supabase.from("messages").select("*").in("lead_id", leadIds).order("at", { ascending: true });
  for (const r of data ?? []) {
    const arr = map.get(r.lead_id) ?? [];
    arr.push(mapMessage(r));
    map.set(r.lead_id, arr);
  }
  return map;
}

// ---- Lead ----
export async function createLead(input: { name?: string; phone?: string; source?: string; propertyId?: string }): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({ name: input.name ?? null, phone: input.phone ?? null, source: input.source ?? "form", property_id: input.propertyId ?? null, status: "new", criteria: {}, created_at: Date.now() })
    .select("*")
    .single();
  if (error) throw error;
  return mapLead(data, []);
}

export async function getLead(leadId: string): Promise<Lead | undefined> {
  const { data } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!data) return undefined;
  const msgs = (await messagesFor([leadId])).get(leadId) ?? [];
  return mapLead(data, msgs);
}

export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const rows = data ?? [];
  const msgs = await messagesFor(rows.map((r) => r.id));
  return rows.map((r) => mapLead(r, msgs.get(r.id) ?? []));
}

export async function addMessage(leadId: string, sender: Sender, text: string): Promise<Message | undefined> {
  const { data, error } = await supabase.from("messages").insert({ lead_id: leadId, sender, text, at: Date.now() }).select("*").single();
  if (error) return undefined;
  return mapMessage(data);
}

export async function updateLeadInfo(leadId: string, patch: Partial<LeadCriteria> & { name?: string; phone?: string }): Promise<Lead | undefined> {
  const { data: cur } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (!cur) return undefined;
  const { name, phone, ...crit } = patch;
  const merged = { ...(cur.criteria ?? {}) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(crit)) if (v !== undefined && v !== null) merged[k] = v;
  const upd: Row = { criteria: merged };
  if (name) upd.name = name;
  if (phone) upd.phone = phone;
  if (cur.status === "new") upd.status = "discovering";
  await supabase.from("leads").update(upd).eq("id", leadId);
  return getLead(leadId);
}

export async function setEvaluation(leadId: string, evaluation: Evaluation): Promise<void> {
  await supabase.from("leads").update({ evaluation }).eq("id", leadId);
}

// ---- Critères de qualification (EF2) ----
export async function getActiveCriteria(): Promise<QualificationCriteria> {
  const { data } = await supabase.from("qualification_criteria").select("*").eq("id", "crit").single();
  return mapCriteria(data ?? null);
}
export async function setCriteria(patch: Partial<QualificationCriteria>): Promise<QualificationCriteria> {
  const cur = await getActiveCriteria();
  const m = { ...cur, ...patch };
  await supabase.from("qualification_criteria").upsert({
    id: "crit", natural_text: m.naturalText, min_budget: m.minBudget ?? null,
    financing_required: m.financingRequired ?? null, areas: m.areas ?? null,
    property_types: m.propertyTypes ?? null, max_timeline_months: m.maxTimelineMonths ?? null,
    active: true, updated_at: Date.now(),
  }, { onConflict: "id" });
  return getActiveCriteria();
}

// ---- Catalogue (EF5) ----
export async function getProperty(propertyId: string): Promise<Property | undefined> {
  const { data } = await supabase.from("properties").select("*").eq("id", propertyId).single();
  return data ? mapProperty(data) : undefined;
}
export async function searchProperties(f: { type?: string; minPrice?: number; maxPrice?: number; area?: string; rooms?: number }): Promise<Property[]> {
  let q = supabase.from("properties").select("*");
  if (f.type) q = q.ilike("type", `%${f.type}%`);
  if (f.area) q = q.ilike("area", `%${f.area}%`);
  if (f.minPrice) q = q.gte("price", f.minPrice);
  if (f.maxPrice) q = q.lte("price", f.maxPrice);
  if (f.rooms) q = q.gte("rooms", f.rooms);
  const { data } = await q;
  return (data ?? []).map(mapProperty);
}

// ---- Agenda (EF6) ----
export async function freeSlots(): Promise<Slot[]> {
  const { data } = await supabase.from("slots").select("*").eq("booked", false).gt("start_ms", Date.now()).order("start_ms", { ascending: true });
  return (data ?? []).map(mapSlot);
}
export async function allSlots(): Promise<Slot[]> {
  const { data } = await supabase.from("slots").select("*").order("start_ms", { ascending: true });
  return (data ?? []).map(mapSlot);
}
// Réservation atomique: UPDATE conditionnel (booked=false) — empêche le double-booking (EF6),
// y compris entre plusieurs instances serverless.
export async function bookSlot(leadId: string, slotId: string, propertyId?: string): Promise<{ ok: boolean; appointment?: Appointment; error?: string }> {
  const { data: locked } = await supabase.from("slots").update({ booked: true }).eq("id", slotId).eq("booked", false).select("*");
  if (!locked || locked.length === 0) {
    const { data: exists } = await supabase.from("slots").select("id").eq("id", slotId).single();
    return { ok: false, error: exists ? "Ce créneau vient d'être pris." : "Créneau introuvable." };
  }
  const { data: appt, error } = await supabase.from("appointments").insert({ lead_id: leadId, slot_id: slotId, property_id: propertyId ?? null, status: "confirmed", at: Date.now() }).select("*").single();
  if (error) {
    await supabase.from("slots").update({ booked: false }).eq("id", slotId); // rollback du verrou
    return { ok: false, error: "Échec de la création du rendez-vous." };
  }
  await setStatus(leadId, "booked");
  return { ok: true, appointment: mapAppt(appt) };
}
export async function listAppointments(): Promise<Appointment[]> {
  const { data } = await supabase.from("appointments").select("*").order("at", { ascending: true });
  return (data ?? []).map(mapAppt);
}

// ---- Rapports (EF7) ----
export async function addReport(r: Omit<Report, "id" | "at">): Promise<Report> {
  const { data } = await supabase.from("reports").insert({ type: r.type, lead_id: r.leadId ?? null, content: r.content, at: Date.now() }).select("*").single();
  return mapReport(data);
}
export async function listReports(): Promise<Report[]> {
  const { data } = await supabase.from("reports").select("*").order("at", { ascending: false });
  return (data ?? []).map(mapReport);
}

// ---- Escalades (EF8) ----
export async function addEscalation(e: Omit<Escalation, "id" | "at" | "status">): Promise<Escalation> {
  const { data } = await supabase.from("escalations").insert({ lead_id: e.leadId, reason: e.reason, draft_reply: e.draftReply, status: "pending", at: Date.now() }).select("*").single();
  await setStatus(e.leadId, "pending_human");
  return mapEsc(data);
}
export async function listEscalations(): Promise<Escalation[]> {
  const { data } = await supabase.from("escalations").select("*").order("at", { ascending: false });
  return (data ?? []).map(mapEsc);
}

// ---- Snapshot (UI) ----
export async function snapshot() {
  const [properties, leads, slots, appointments, reports, escalations, criteria] = await Promise.all([
    supabase.from("properties").select("*"),
    listLeads(),
    allSlots(),
    listAppointments(),
    listReports(),
    listEscalations(),
    getActiveCriteria(),
  ]);
  return {
    properties: (properties.data ?? []).map(mapProperty),
    leads, slots, appointments, reports, escalations, criteria,
  };
}

// ---- Reset (réinitialisation de la démo) ----
export async function resetDB() {
  // Ordre sûr vis-à-vis des FK; on supprime explicitement (sans dépendre du cascade).
  await supabase.from("appointments").delete().neq("id", NIL);
  await supabase.from("escalations").delete().neq("id", NIL);
  await supabase.from("reports").delete().neq("id", NIL);
  await supabase.from("messages").delete().neq("id", NIL);
  await supabase.from("leads").delete().neq("id", NIL);
  await supabase.from("slots").delete().neq("id", NIL);
  await supabase.from("properties").delete().neq("id", NIL);
  await supabase.from("qualification_criteria").delete().neq("id", "___none___");
}
