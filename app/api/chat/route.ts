import { addMessage, getLead } from "@/lib/store";
import { runClientTurn } from "@/lib/agents/clientAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Un tour de conversation côté prospect (EF3/EF5/EF6/EF8).
export async function POST(req: Request) {
  const { leadId, message } = (await req.json()) as { leadId: string; message?: string };
  if (!(await getLead(leadId))) return Response.json({ error: "Lead introuvable." }, { status: 404 });
  if (message) await addMessage(leadId, "client", message);
  try {
    const reply = await runClientTurn(leadId);
    await addMessage(leadId, "ai", reply);
    return Response.json({ reply });
  } catch (e) {
    console.error("chat error", e);
    const reply = "Désolé, une erreur est survenue. Un conseiller vous recontactera.";
    await addMessage(leadId, "ai", reply);
    return Response.json({ reply }, { status: 200 });
  }
}
