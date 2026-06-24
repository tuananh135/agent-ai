import { addMessage, createLead } from "@/lib/store";
import { ensureSeeded } from "@/lib/seed";
import { runClientTurn } from "@/lib/agents/clientAgent";
import type { InboundRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EF1 — tiếp nhận một yêu cầu đến (đã chuẩn hóa) và khởi động luồng xử lý.
export async function POST(req: Request) {
  ensureSeeded();
  const body = (await req.json()) as InboundRequest;
  const lead = await createLead({
    name: body.name,
    phone: body.phone,
    source: body.source ?? "form",
    propertyId: body.propertyId,
  });
  if (body.message) await addMessage(lead.id, "client", body.message);
  let reply = "";
  try {
    reply = await runClientTurn(lead.id);
    await addMessage(lead.id, "ai", reply);
  } catch (e) {
    reply = "Désolé, une erreur est survenue. Un conseiller vous recontactera.";
    await addMessage(lead.id, "ai", reply);
    console.error("inbound error", e);
  }
  return Response.json({ leadId: lead.id, reply });
}
