import { listLeads } from "@/lib/store";
import { runEvaluation } from "@/lib/agents/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // l'évaluation par lot (scénario E) peut être longue

// Évaluation par lot (scénario E) ou d'un lead précis.
export async function POST(req: Request) {
  const { all, leadId } = (await req.json().catch(() => ({}))) as { all?: boolean; leadId?: string };
  if (all) {
    const pending = (await listLeads()).filter((l) => l.status === "discovering" || l.status === "new");
    // En parallèle pour tenir dans la limite de durée Vercel (sinon N × temps Opus).
    const results = await Promise.allSettled(pending.map((l) => runEvaluation(l.id)));
    const count = results.filter((r) => r.status === "fulfilled" && r.value).length;
    return Response.json({ evaluated: count });
  }
  if (leadId) {
    const r = await runEvaluation(leadId);
    return Response.json({ result: r });
  }
  return Response.json({ error: "Préciser { all: true } ou { leadId }." }, { status: 400 });
}
