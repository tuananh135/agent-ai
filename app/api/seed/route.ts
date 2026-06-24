import { snapshot } from "@/lib/store";
import { seedAll } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await seedAll(true);
  return Response.json(await snapshot());
}
