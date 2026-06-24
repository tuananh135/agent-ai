import { supabase } from "./supabase";
import { addMessage, createLead, resetDB, setCriteria, updateLeadInfo } from "./store";
import type { Property } from "./types";

// Catalogue publié (simulé) — marché français, secteur Lyon.
const PROPERTIES: Omit<Property, "id">[] = [
  { title: "Appartement T3 lumineux — Lyon 6e", type: "appartement", price: 385000, area: "Lyon 6e", rooms: 3, surface: 72, description: "Proche parc de la Tête d'Or, 2 chambres, balcon, 3e étage avec ascenseur." },
  { title: "Maison familiale — Caluire-et-Cuire", type: "maison", price: 620000, area: "Caluire", rooms: 5, surface: 140, description: "Jardin 300m², 4 chambres, garage double, quartier calme." },
  { title: "Studio rénové — Lyon 3e", type: "studio", price: 175000, area: "Lyon 3e", rooms: 1, surface: 28, description: "Idéal investissement, proche Part-Dieu, refait à neuf." },
  { title: "Appartement T4 — Villeurbanne", type: "appartement", price: 445000, area: "Villeurbanne", rooms: 4, surface: 95, description: "3 chambres, double séjour, proche métro, cave et parking." },
  { title: "Villa contemporaine — Écully", type: "villa", price: 980000, area: "Écully", rooms: 6, surface: 210, description: "Piscine, 5 chambres, prestations haut de gamme, terrain 800m²." },
  { title: "Appartement T2 — Lyon 7e", type: "appartement", price: 268000, area: "Lyon 7e", rooms: 2, surface: 48, description: "1 chambre, proche Guillotière, balcon, faibles charges." },
];

function buildSlotRows(): { start_ms: number; end_ms: number; booked: boolean }[] {
  const rows: { start_ms: number; end_ms: number; booked: boolean }[] = [];
  const now = new Date();
  for (let d = 1; d <= 5; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    for (const hour of [10, 14, 16]) {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1);
      rows.push({ start_ms: start.getTime(), end_ms: end.getTime(), booked: false });
    }
  }
  return rows;
}

const SCENARIO_E = [
  { name: "Camille Bernard", phone: "0612345678", crit: { projectType: "buy" as const, minBudget: 380000, maxBudget: 420000, financing: "loan_approved" as const, timelineMonths: 2, area: "Lyon 6e" }, msg: "Bonjour, je suis intéressée par le T3 à Lyon 6e. Mon prêt est déjà accordé, budget 400k, je souhaite acheter sous 2 mois." },
  { name: "Thomas Petit", phone: "0623456789", crit: { projectType: "buy" as const, minBudget: 250000, maxBudget: 300000, financing: "will_loan" as const, area: "Lyon 6e" }, msg: "Le T3 Lyon 6e m'intéresse mais mon budget est plutôt 280k, je n'ai pas encore vu la banque." },
  { name: "Sophie Durand", phone: "0634567890", crit: { projectType: "buy" as const, minBudget: 400000, maxBudget: 450000, financing: "cash" as const, timelineMonths: 1, area: "Lyon 6e" }, msg: "Je veux visiter le T3 Lyon 6e rapidement, achat comptant, je suis très sérieuse." },
  { name: "Lucas Moreau", phone: "", crit: { projectType: "buy" as const, area: "Lyon 6e" }, msg: "C'est encore dispo le Lyon 6e ?" },
  { name: "Inès Laurent", phone: "0656789012", crit: { projectType: "buy" as const, minBudget: 390000, maxBudget: 410000, financing: "loan_approved" as const, timelineMonths: 4, area: "Lyon 6e" }, msg: "Bonjour, prêt accordé, budget 400k, je cherche pour les 4 prochains mois. Le T3 Lyon 6e correspond." },
  { name: "Marc Garnier", phone: "0667890123", crit: { projectType: "rent" as const, area: "Lyon 6e" }, msg: "Vous faites de la location pour ce T3 ?" },
];

export async function seedAll(withScenarioE = true) {
  await resetDB();

  const { data: props } = await supabase.from("properties").insert(PROPERTIES).select("*");
  await supabase.from("slots").insert(buildSlotRows());

  await setCriteria({
    naturalText:
      "On ne prend que les acheteurs avec un budget d'au moins 350 000 €, un financement déjà accordé ou un achat comptant, dans la région de Lyon, et un projet d'achat sous 6 mois.",
    minBudget: 350000,
    financingRequired: ["loan_approved", "cash"],
    areas: ["Lyon", "Caluire", "Villeurbanne", "Écully"],
    propertyTypes: ["appartement", "maison", "studio", "villa"],
    maxTimelineMonths: 6,
  });

  if (withScenarioE) {
    const t3 = (props ?? []).find((p) => p.area === "Lyon 6e" && p.type === "appartement");
    for (const s of SCENARIO_E) {
      const lead = await createLead({ name: s.name, phone: s.phone || undefined, source: "seloger", propertyId: t3?.id });
      await addMessage(lead.id, "client", s.msg);
      await updateLeadInfo(lead.id, s.crit);
    }
  }
}

// Auto-seed si la base est vide (premier chargement).
export async function ensureSeeded() {
  const { count } = await supabase.from("properties").select("id", { count: "exact", head: true });
  if (!count) await seedAll();
}
