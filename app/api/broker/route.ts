import type { ModelMessage } from "ai";
import { runBrokerTurn } from "@/lib/agents/brokerAgent";
import { ensureSeeded } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EF2/EF7 — l'agent immobilier pilote par conversation. Le front envoie l'historique.
export async function POST(req: Request) {
  ensureSeeded();
  const { messages } = (await req.json()) as { messages: ModelMessage[] };
  try {
    const reply = await runBrokerTurn(messages ?? []);
    return Response.json({ reply });
  } catch (e) {
    console.error("broker error", e);
    return Response.json({ reply: "Une erreur est survenue côté assistant." }, { status: 200 });
  }
}
