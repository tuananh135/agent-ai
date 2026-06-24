"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Appointment,
  Escalation,
  Lead,
  Property,
  QualificationCriteria,
  Report,
  Slot,
} from "@/lib/types";

interface Snapshot {
  properties: Property[];
  leads: Lead[];
  slots: Slot[];
  appointments: Appointment[];
  reports: Report[];
  escalations: Escalation[];
  criteria: QualificationCriteria;
}

const STATUS_FR: Record<string, string> = {
  new: "nouveau",
  discovering: "découverte",
  qualified: "qualifié",
  rejected: "non qualifié",
  booked: "RDV pris",
  pending_human: "attente humain",
  closed: "clôturé",
};

const fmt = (ms: number) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));

const euro = (n?: number) => (n == null ? "?" : `${n.toLocaleString("fr-FR")} €`);

export default function Monitor() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"agenda" | "rapports" | "escalades" | "agent">("agenda");

  // Polling du snapshot toutes les 2s (compatible serverless / Vercel) — EF9.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        const j = await r.json();
        if (active) setSnap(j);
      } catch {/* réseau momentané */}
    };
    load();
    const t = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const leads = snap?.leads ?? [];
  const selected = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId]);

  async function seed() {
    setBusy(true);
    await fetch("/api/seed", { method: "POST" });
    setSelectedId(null);
    setBusy(false);
  }
  async function evalAll() {
    setBusy(true);
    await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setBusy(false);
  }

  return (
    <div className="app">
      {/* Colonne 1 — leads + contrôles */}
      <div className="col">
        <div className="pad">
          <div className="row" style={{ marginBottom: 10 }}>
            <strong>Leads ({leads.length})</strong>
            <span className="small muted">EF9 — supervision</span>
          </div>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>
            <button onClick={seed} disabled={busy}>↻ Réinitialiser</button>
            <button onClick={evalAll} disabled={busy} title="Évalue les leads en découverte (scénario E)">⚙ Évaluer en attente</button>
          </div>
          <NewProspect properties={snap?.properties ?? []} onCreated={setSelectedId} />
          <div style={{ marginTop: 12 }}>
            {leads.map((l) => (
              <div key={l.id} className={`card ${selectedId === l.id ? "sel" : ""}`} onClick={() => setSelectedId(l.id)} style={{ cursor: "pointer" }}>
                <div className="row">
                  <b>{l.name ?? "Prospect inconnu"}</b>
                  <span className={`badge ${l.status}`}>{STATUS_FR[l.status]}</span>
                </div>
                <div className="kv">{snap?.properties.find((p) => p.id === l.propertyId)?.title ?? "Sans bien précis"}</div>
                {l.evaluation && (
                  <div className="kv">
                    <span className={`prio-${l.evaluation.priority}`}>● {l.evaluation.priority}</span>{" "}
                    sérieux {l.evaluation.seriousness}/100
                  </div>
                )}
              </div>
            ))}
            {leads.length === 0 && <p className="muted small">Aucun lead. Réinitialisez ou créez un prospect.</p>}
          </div>
        </div>
      </div>

      {/* Colonne 2 — conversation du lead sélectionné */}
      <div className="col">
        <div className="pad">
          {selected ? (
            <LeadConversation lead={selected} property={snap?.properties.find((p) => p.id === selected.propertyId)} />
          ) : (
            <p className="muted">Sélectionnez un lead pour voir la conversation, ou créez un prospect (colonne de gauche).</p>
          )}
        </div>
      </div>

      {/* Colonne 3 — agenda / rapports / escalades / agent */}
      <div className="col">
        <div className="pad">
          <div className="tabs">
            <button className={tab === "agenda" ? "active" : ""} onClick={() => setTab("agenda")}>Agenda</button>
            <button className={tab === "rapports" ? "active" : ""} onClick={() => setTab("rapports")}>Rapports</button>
            <button className={tab === "escalades" ? "active" : ""} onClick={() => setTab("escalades")}>
              Escalades{snap && snap.escalations.length ? ` (${snap.escalations.length})` : ""}
            </button>
            <button className={tab === "agent" ? "active" : ""} onClick={() => setTab("agent")}>Agent</button>
          </div>
          {tab === "agenda" && <Agenda snap={snap} />}
          {tab === "rapports" && <Rapports reports={snap?.reports ?? []} leads={leads} />}
          {tab === "escalades" && <Escalades escalations={snap?.escalations ?? []} leads={leads} />}
          {tab === "agent" && <BrokerChat criteria={snap?.criteria} />}
        </div>
      </div>
    </div>
  );
}

function NewProspect({ properties, onCreated }: { properties: Property[]; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setBusy(true);
    const r = await fetch("/api/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || undefined, propertyId: propertyId || undefined, source: "form", message }),
    });
    const data = await r.json();
    setBusy(false);
    setOpen(false);
    setName(""); setMessage(""); setPropertyId("");
    if (data.leadId) onCreated(data.leadId);
  }

  if (!open) return <button className="primary" style={{ width: "100%" }} onClick={() => setOpen(true)}>+ Nouveau prospect (yêu cầu vào)</button>;
  return (
    <div className="card">
      <div className="h">Nouvelle demande entrante</div>
      <input placeholder="Nom (optionnel)" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 6 }} />
      <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={{ marginBottom: 6, width: "100%", padding: 8, background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <option value="">— Sans bien précis —</option>
        {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <textarea placeholder="Message du prospect…" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} style={{ marginBottom: 6 }} />
      <div className="row">
        <button onClick={() => setOpen(false)}>Annuler</button>
        <button className="primary" onClick={submit} disabled={busy}>{busy ? "Envoi…" : "Envoyer"}</button>
      </div>
    </div>
  );
}

function LeadConversation({ lead, property }: { lead: Lead; property?: Property }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lead.messages.length, sending]);

  async function send() {
    if (!text.trim() || sending) return;
    const msg = text;
    setText("");
    setSending(true);
    await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, message: msg }) });
    setSending(false);
  }

  return (
    <>
      <div className="row">
        <strong>{lead.name ?? "Prospect inconnu"}</strong>
        <span className={`badge ${lead.status}`}>{STATUS_FR[lead.status]}</span>
      </div>
      <div className="kv" style={{ margin: "4px 0 10px" }}>
        {property ? property.title : "Sans bien précis"} · projet {lead.criteria.projectType ?? "?"} ·
        budget {euro(lead.criteria.minBudget)}–{euro(lead.criteria.maxBudget)} · fin. {lead.criteria.financing ?? "?"} ·
        échéance {lead.criteria.timelineMonths ?? "?"} mois
      </div>
      {lead.evaluation && (
        <div className="card">
          <div className="h">Évaluation (EF4)</div>
          <div className="small">
            <b>Conclusion:</b> {lead.evaluation.conclusion} · <b>priorité:</b>{" "}
            <span className={`prio-${lead.evaluation.priority}`}>{lead.evaluation.priority}</span> ·{" "}
            <b>sérieux:</b> {lead.evaluation.seriousness}/100
          </div>
          <ul className="small muted" style={{ margin: "6px 0 0", paddingLeft: 16 }}>
            {lead.evaluation.reasons.map((r, i) => <li key={i}>{r}</li>)}
            {lead.evaluation.missing.map((m, i) => <li key={`m${i}`}>⚠ manque: {m}</li>)}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {lead.messages.map((m) => (
          <div key={m.id} className="msg">
            <div className="who">{m.sender === "client" ? "Prospect" : m.sender === "ai" ? "Assistant IA" : "Agent"} · {fmt(m.at)}</div>
            <div className={`bubble ${m.sender}`}>{m.text}</div>
          </div>
        ))}
        {sending && <div className="typing">L'assistant rédige…</div>}
        <div ref={endRef} />
      </div>

      {lead.status !== "closed" && (
        <div className="chatbar">
          <input
            placeholder="Répondre EN TANT QUE prospect…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="primary" onClick={send} disabled={sending}>Envoyer</button>
        </div>
      )}
    </>
  );
}

function Agenda({ snap }: { snap: Snapshot | null }) {
  if (!snap) return null;
  const leadName = (id: string) => snap.leads.find((l) => l.id === id)?.name ?? id;
  return (
    <>
      <div className="h">Rendez-vous confirmés</div>
      {snap.appointments.length === 0 && <p className="muted small">Aucun RDV.</p>}
      {snap.appointments.map((a) => {
        const slot = snap.slots.find((s) => s.id === a.slotId);
        const prop = snap.properties.find((p) => p.id === a.propertyId);
        return (
          <div key={a.id} className="card">
            <b>{leadName(a.leadId)}</b>
            <div className="kv">{slot ? fmt(slot.start) : "?"}{prop ? ` · ${prop.title}` : ""}</div>
          </div>
        );
      })}
      <div className="h" style={{ marginTop: 14 }}>Créneaux</div>
      <div>
        {snap.slots.map((s) => (
          <span key={s.id} className={`slot ${s.booked ? "booked" : ""}`}>{fmt(s.start)}</span>
        ))}
      </div>
    </>
  );
}

function Rapports({ reports, leads }: { reports: Report[]; leads: Lead[] }) {
  const name = (id?: string) => leads.find((l) => l.id === id)?.name ?? id ?? "";
  return (
    <>
      <div className="h">Rapports à l'agent (EF7)</div>
      {reports.length === 0 && <p className="muted small">Aucun rapport.</p>}
      {reports.map((r) => (
        <div key={r.id} className="card">
          <div className="row"><span className={`badge ${r.type === "booked" ? "qualified" : r.type === "rejected" ? "rejected" : "pending_human"}`}>{r.type}</span><span className="small muted">{fmt(r.at)}</span></div>
          <div className="small" style={{ marginTop: 4 }}>{r.content}</div>
          {r.leadId && <div className="kv">{name(r.leadId)}</div>}
        </div>
      ))}
    </>
  );
}

function Escalades({ escalations, leads }: { escalations: Escalation[]; leads: Lead[] }) {
  const name = (id: string) => leads.find((l) => l.id === id)?.name ?? id;
  return (
    <>
      <div className="h">Escalades — brouillons à valider (EF8)</div>
      {escalations.length === 0 && <p className="muted small">Aucune escalade.</p>}
      {escalations.map((e) => (
        <div key={e.id} className="card">
          <div className="row"><b>{name(e.leadId)}</b><span className="badge pending_human">{e.status}</span></div>
          <div className="small" style={{ marginTop: 4 }}><b>Raison:</b> {e.reason}</div>
          <div className="small" style={{ marginTop: 6, padding: 8, background: "var(--panel-2)", borderRadius: 8 }}>
            <div className="h" style={{ marginBottom: 4 }}>Brouillon de réponse</div>
            {e.draftReply}
          </div>
        </div>
      ))}
    </>
  );
}

function BrokerChat({ criteria }: { criteria?: QualificationCriteria }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, busy]);

  async function send() {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setText("");
    setBusy(true);
    const r = await fetch("/api/broker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
    const data = await r.json();
    setMessages([...next, { role: "assistant", content: data.reply }]);
    setBusy(false);
  }

  return (
    <>
      <div className="h">Assistant de l'agent (EF2/EF7)</div>
      <div className="card small">
        <div className="h" style={{ marginBottom: 4 }}>Critères en vigueur</div>
        {criteria?.naturalText ?? "—"}
      </div>
      <div style={{ marginTop: 8, maxHeight: "45vh", overflowY: "auto" }}>
        {messages.length === 0 && (
          <p className="muted small">
            Essayez: «&nbsp;Définis les critères: budget min 300k, prêt accordé ou comptant, Lyon&nbsp;» ·
            «&nbsp;Liste courte pour le T3 Lyon 6e&nbsp;» · «&nbsp;Quels leads qualifiés ?&nbsp;»
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="msg">
            <div className="who">{m.role === "user" ? "Agent" : "Assistant"}</div>
            <div className={`bubble ${m.role === "user" ? "broker" : "ai"}`}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="typing">…</div>}
        <div ref={endRef} />
      </div>
      <div className="chatbar">
        <input placeholder="Parler à l'assistant…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="primary" onClick={send} disabled={busy}>Envoyer</button>
      </div>
    </>
  );
}
