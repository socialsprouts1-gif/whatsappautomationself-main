import { ensureLoaded, toPublicUser } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  return Response.json({ ok: true, user: toPublicUser(user) });
}
