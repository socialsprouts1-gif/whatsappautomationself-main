import { createTagDef, deleteTagDef, ensureLoaded, listTagDefs, persist } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ tags: listTagDefs() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { name?: string; color?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name) return Response.json({ ok: false, error: "`name` is required" }, { status: 400 });
  const tag = createTagDef({ name: body.name.toLowerCase().trim(), color: body.color ?? "#2563eb" });
  await persist();
  return Response.json({ ok: true, tag }, { status: 201 });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteTagDef(id);
  await persist();
  return Response.json({ ok: true });
}
