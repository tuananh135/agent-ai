import { generateObject } from "ai";
import { reasoningModel } from "../model";
import { addReport, getActiveCriteria, getLead, getProperty, setEvaluation, setStatus } from "../store";
import type { Lead } from "../types";
import { evaluationSchema, type EvaluationOutput } from "./schemas";

// EF4 — đánh giá 2 chiều (đủ điều kiện + nghiêm túc) bằng structured output.
export async function evaluateLead(lead: Lead): Promise<EvaluationOutput> {
  const crit = await getActiveCriteria();
  const prop = lead.propertyId ? await getProperty(lead.propertyId) : undefined;

  const system =
    "Tu es l'assistant d'évaluation d'une agence immobilière. " +
    "Tu compares un prospect aux critères de qualification définis par l'agent (la seule référence) " +
    "et tu évalues son sérieux. Sois rigoureux et factuel. " +
    "conclusion=incomplete UNIQUEMENT s'il manque une donnée indispensable pour trancher un critère obligatoire. " +
    "La priorité reflète à la fois l'adéquation aux critères et le sérieux.";

  const prompt = `## Critères de qualification en vigueur (référence unique)
Texte: ${crit.naturalText}
Budget minimum: ${crit.minBudget ?? "non spécifié"}
Financement requis: ${crit.financingRequired?.join(", ") ?? "non spécifié"}
Zones desservies: ${crit.areas?.join(", ") ?? "non spécifié"}
Types de biens: ${crit.propertyTypes?.join(", ") ?? "non spécifié"}
Échéance max (mois): ${crit.maxTimelineMonths ?? "non spécifié"}

## Bien concerné
${prop ? `${prop.title} — ${prop.type}, ${prop.price} €, ${prop.area}, ${prop.rooms} pièces` : "Aucun bien précis"}

## Prospect
Nom: ${lead.name ?? "inconnu"}
Projet: ${lead.criteria.projectType ?? "inconnu"} (achat=buy / location=rent)
Type recherché: ${lead.criteria.propertyType ?? "inconnu"}
Budget: ${lead.criteria.minBudget ?? "?"} - ${lead.criteria.maxBudget ?? "?"}
Zone: ${lead.criteria.area ?? "inconnue"}
Pièces: ${lead.criteria.rooms ?? "?"}
Financement: ${lead.criteria.financing ?? "inconnu"}
Échéance (mois): ${lead.criteria.timelineMonths ?? "inconnue"}
Notes: ${lead.criteria.notes ?? "-"}

## Conversation
${lead.messages.map((m) => `${m.sender}: ${m.text}`).join("\n") || "(vide)"}

Évalue ce prospect.`;

  const { object } = await generateObject({
    model: reasoningModel,
    schema: evaluationSchema,
    system,
    prompt,
    maxOutputTokens: 1500,
  });
  return object;
}

// Évalue ET applique le résultat au store (statut + rapport). Partagé par l'outil
// evaluate_lead et la route d'évaluation par lot (scénario E).
export async function runEvaluation(leadId: string): Promise<EvaluationOutput | null> {
  const lead = await getLead(leadId);
  if (!lead) return null;
  const result = await evaluateLead(lead);
  await setEvaluation(leadId, { ...result, at: Date.now() });
  if (result.conclusion === "pass") await setStatus(leadId, "qualified");
  else if (result.conclusion === "fail") {
    await setStatus(leadId, "rejected");
    await addReport({
      type: "rejected",
      leadId,
      content: `Lead non qualifié — ${lead.name ?? leadId}. Motifs: ${result.reasons.join("; ")}`,
    });
  }
  return result;
}
