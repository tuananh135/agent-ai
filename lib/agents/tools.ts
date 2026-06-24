import { tool } from "ai";
import { z } from "zod";
import {
  addEscalation,
  addReport,
  bookSlot,
  freeSlots,
  getActiveCriteria,
  getLead,
  getProperty,
  listEscalations,
  listLeads,
  searchProperties,
  setCriteria,
  updateLeadInfo,
} from "../store";
import { runEvaluation } from "./evaluate";
import type { LeadStatus } from "../types";

const fmtSlot = (start: number) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(start));

async function leadSummary(leadId: string) {
  const l = await getLead(leadId);
  if (!l) return "Lead introuvable.";
  const prop = l.propertyId ? await getProperty(l.propertyId) : undefined;
  return {
    id: l.id, name: l.name ?? "inconnu", phone: l.phone ?? null, status: l.status,
    bien: prop ? prop.title : null, criteria: l.criteria, evaluation: l.evaluation ?? null,
  };
}

// ---- Outils côté CLIENT (assistant commercial) ----
export function clientTools(leadId: string) {
  return {
    update_lead_info: tool({
      description: "Enregistre les informations du prospect au fil de la conversation. N'appelle qu'avec les champs réellement fournis.",
      inputSchema: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        projectType: z.enum(["buy", "rent"]).optional(),
        propertyType: z.string().optional(),
        minBudget: z.number().optional(),
        maxBudget: z.number().optional(),
        area: z.string().optional(),
        rooms: z.number().optional(),
        timelineMonths: z.number().optional(),
        financing: z.enum(["cash", "will_loan", "loan_approved", "unknown"]).optional(),
        notes: z.string().optional(),
      }),
      execute: async (patch) => {
        const l = await updateLeadInfo(leadId, patch);
        if (!l) return { error: "Lead introuvable." };
        const known = Object.entries(l.criteria).filter(([, v]) => v != null).map(([k]) => k);
        return { saved: true, known, criteria: l.criteria, name: l.name, phone: l.phone };
      },
    }),

    get_qualification_criteria: tool({
      description: "Lit les critères de qualification en vigueur définis par l'agence.",
      inputSchema: z.object({}),
      execute: async () => getActiveCriteria(),
    }),

    evaluate_lead: tool({
      description: "Évalue le prospect selon les critères de qualification. À utiliser quand assez d'informations sont collectées.",
      inputSchema: z.object({}),
      execute: async () => (await runEvaluation(leadId)) ?? { error: "Lead introuvable." },
    }),

    search_properties: tool({
      description: "Recherche dans le catalogue des biens PUBLIÉS par l'agence. Ne jamais inventer de bien hors catalogue.",
      inputSchema: z.object({
        type: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        area: z.string().optional(),
        rooms: z.number().optional(),
      }),
      execute: async (f) => {
        const res = (await searchProperties(f)).slice(0, 3);
        return res.length ? res : { results: [], note: "Aucun bien correspondant dans le catalogue publié." };
      },
    }),

    get_property: tool({
      description: "Détaille un bien du catalogue par son id.",
      inputSchema: z.object({ propertyId: z.string() }),
      execute: async ({ propertyId }) => (await getProperty(propertyId)) ?? { error: "Bien introuvable au catalogue." },
    }),

    get_available_slots: tool({
      description: "Liste les créneaux de visite réellement disponibles.",
      inputSchema: z.object({}),
      execute: async () => (await freeSlots()).map((s) => ({ slotId: s.id, label: fmtSlot(s.start) })),
    }),

    book_appointment: tool({
      description: "Réserve un créneau de visite. Uniquement si le prospect est qualifié (évaluation = pass).",
      inputSchema: z.object({ slotId: z.string(), propertyId: z.string().optional() }),
      execute: async ({ slotId, propertyId }) => {
        const lead = await getLead(leadId);
        if (!lead) return { error: "Lead introuvable." };
        if (lead.status !== "qualified" && lead.status !== "booked")
          return { error: "Le prospect n'est pas qualifié — évaluation requise avant réservation." };
        const r = await bookSlot(leadId, slotId, propertyId ?? lead.propertyId);
        if (!r.ok) return { error: r.error };
        const pid = propertyId ?? lead.propertyId;
        const prop = pid ? await getProperty(pid) : undefined;
        await addReport({
          type: "booked",
          leadId,
          content: `RDV confirmé — ${lead.name ?? leadId}${prop ? `, ${prop.title}` : ""}. Critères remplis: ${lead.evaluation?.reasons.join("; ") ?? "-"}.`,
        });
        return { confirmed: true, appointmentId: r.appointment!.id, bien: prop?.title ?? null };
      },
    }),

    escalate: tool({
      description: "Transfère le dossier à un agent humain avec un brouillon de réponse. À utiliser pour les questions hors périmètre/sensibles, une demande explicite de contact humain, ou une décision humaine requise.",
      inputSchema: z.object({
        reason: z.string().describe("Raison du transfert + contexte court"),
        draftReply: z.string().describe("Brouillon de réponse que l'humain pourra valider/éditer"),
      }),
      execute: async ({ reason, draftReply }) => {
        const lead = await getLead(leadId);
        if (!lead) return { error: "Lead introuvable." };
        await addEscalation({ leadId, reason, draftReply });
        await addReport({ type: "escalation", leadId, content: `Escalade — ${lead.name ?? leadId}: ${reason}` });
        return { escalated: true };
      },
    }),
  };
}

// ---- Outils côté AGENT IMMOBILIER (assistant personnel) ----
export function brokerTools() {
  return {
    set_criteria: tool({
      description: "Définit/met à jour les critères de qualification en langage naturel. Renseigne aussi les champs structurés correspondants.",
      inputSchema: z.object({
        naturalText: z.string(),
        minBudget: z.number().optional(),
        financingRequired: z.array(z.enum(["cash", "will_loan", "loan_approved", "unknown"])).optional(),
        areas: z.array(z.string()).optional(),
        propertyTypes: z.array(z.string()).optional(),
        maxTimelineMonths: z.number().optional(),
      }),
      execute: async (patch) => setCriteria(patch),
    }),
    get_criteria: tool({
      description: "Lit les critères de qualification en vigueur.",
      inputSchema: z.object({}),
      execute: async () => getActiveCriteria(),
    }),
    list_leads: tool({
      description: "Liste les leads, éventuellement filtrés par statut.",
      inputSchema: z.object({
        status: z.enum(["new", "discovering", "qualified", "rejected", "booked", "pending_human", "closed"]).optional(),
      }),
      execute: async ({ status }) => {
        const leads = await listLeads(status as LeadStatus | undefined);
        return Promise.all(leads.map((l) => leadSummary(l.id)));
      },
    }),
    get_lead_summary: tool({
      description: "Résumé détaillé d'un lead.",
      inputSchema: z.object({ leadId: z.string() }),
      execute: async ({ leadId }) => leadSummary(leadId),
    }),
    get_shortlist: tool({
      description: "Liste courte pour un bien: les leads qualifiés et sérieux, classés par priorité (valeur clé du produit).",
      inputSchema: z.object({ propertyId: z.string() }),
      execute: async ({ propertyId }) => {
        const rank = { high: 3, medium: 2, low: 1 } as const;
        const all = await listLeads();
        const forProp = all.filter((l) => l.propertyId === propertyId);
        const qualified = forProp
          .filter((l) => l.status === "qualified" || l.status === "booked")
          .sort(
            (a, b) =>
              (rank[b.evaluation?.priority ?? "low"] - rank[a.evaluation?.priority ?? "low"]) ||
              (b.evaluation?.seriousness ?? 0) - (a.evaluation?.seriousness ?? 0),
          );
        const shortlist = await Promise.all(qualified.map((l) => leadSummary(l.id)));
        return { propertyId, totalRequests: forProp.length, shortlist };
      },
    }),
    list_escalations: tool({
      description: "Liste les escalades en attente de traitement humain.",
      inputSchema: z.object({}),
      execute: async () => listEscalations(),
    }),
  };
}
