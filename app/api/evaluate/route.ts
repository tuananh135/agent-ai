import { listLeads } from "@/lib/store";
import { runEvaluation } from "@/lib/agents/evaluate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Évaluation par lot (scénario E) ou d'un lead précis.
export async function POST(req: Request) {
  const { all, leadId } = (await req.json().catch(() => ({}))) as { all?: boolean; leadId?: string };
  if (all) {
    const pending = (await listLeads()).filter((l) => l.status === "discovering" || l.status === "new");
    let count = 0;
    for (const l of pending) {
      try {
        await runEvaluation(l.id);
        count++;
      } catch (e) {
        console.error("eval error", l.id, e);
      }
    }
    return Response.json({ evaluated: count });
  }
  if (leadId) {
    const r = await runEvaluation(leadId);
    return Response.json({ result: r });
  }
  return Response.json({ error: "Préciser { all: true } ou { leadId }." }, { status: 400 });
}
