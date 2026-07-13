import { createGroup, deleteGroup, ensureLoaded, listGroups, persist, updateGroup } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ groups: listGroups() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { name?: string; description?: string; contactIds?: string[] };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name) return Response.json({ ok: false, error: "`name` is required" }, { status: 400 });
  const group = createGroup({ name: body.name, description: body.description, contactIds: body.contactIds ?? [] });
  await persist();
  return Response.json({ ok: true, group }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...patch } = body;
  if (!id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const group = updateGroup(id, patch);
  if (!group) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, group });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteGroup(id);
  await persist();
  return Response.json({ ok: true });
}
