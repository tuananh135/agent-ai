import { z } from "zod";

// EF4: schema buộc kết quả đánh giá ra cấu trúc đáng tin.
export const evaluationSchema = z.object({
  conclusion: z
    .enum(["pass", "fail", "incomplete"])
    .describe("pass = remplit tous les critères obligatoires; fail = au moins un critère manqué; incomplete = données insuffisantes"),
  // NB: pas de .min()/.max() — les contraintes numériques ne sont pas supportées
  // par la sortie structurée d'Anthropic (la borne 0-100 reste dans la description).
  seriousness: z
    .number()
    .describe("Degré de sérieux du prospect, de 0 à 100: réponses claires, attentes réalistes, échéance précise, prêt à avancer"),
  priority: z.enum(["high", "medium", "low"]),
  reasons: z
    .array(z.string())
    .describe("Justifications courtes: quels critères remplis/manqués, quels signaux de sérieux"),
  missing: z
    .array(z.string())
    .describe("Informations encore manquantes pour conclure (vide si conclusion != incomplete)"),
});

export type EvaluationOutput = z.infer<typeof evaluationSchema>;
