import { snapshot } from "@/lib/store";
import { ensureSeeded } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  return Response.json(await snapshot(), {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
