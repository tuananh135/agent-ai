import { anthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

// Si OPENROUTER_API_KEY est défini → on passe par OpenRouter (un seul compte,
// plusieurs fournisseurs). Sinon → appel direct à Anthropic via ANTHROPIC_API_KEY.
const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
  : null;

// On force le routage OpenRouter vers Anthropic uniquement (sans repli): seul
// Anthropic supporte la sortie structurée (output_config.format) dont dépend l'EF4.
const orOpts = {
  extraBody: { provider: { order: ["Anthropic"], allow_fallbacks: false } },
} as const;

// Opus 4.8: évaluation EF4 + escalade. Sonnet 4.6: conversation + rapports.
export const reasoningModel: LanguageModel = openrouter
  ? openrouter("anthropic/claude-opus-4.8", orOpts)
  : anthropic("claude-opus-4-8");

export const chatModel: LanguageModel = openrouter
  ? openrouter("anthropic/claude-sonnet-4.6", orOpts)
  : anthropic("claude-sonnet-4-6");
