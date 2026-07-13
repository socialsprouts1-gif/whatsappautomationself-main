import { createApiKey, deleteApiKey, ensureLoaded, listApiKeys, persist, revokeApiKey } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ keys: listApiKeys() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { name?: string; scopes?: string[] };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name) return Response.json({ ok: false, error: "`name` is required" }, { status: 400 });
  const key = createApiKey({ name: body.name, scopes: body.scopes ?? ["read"] });
  await persist();
  return Response.json({ ok: true, key }, { status: 201 });
}

/** Revoke (disable) a key without deleting it, so its history stays visible. */
export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const key = revokeApiKey(body.id);
  if (!key) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, key });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteApiKey(id);
  await persist();
  return Response.json({ ok: true });
}
