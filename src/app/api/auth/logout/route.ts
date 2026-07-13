import { ensureLoaded } from "@/lib/store";
import { endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await ensureLoaded();
  await endSession();
  return Response.json({ ok: true });
}
