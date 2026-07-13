import { createCustomField, deleteCustomField, ensureLoaded, listCustomFields, persist, type CustomFieldType } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ columns: listCustomFields() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { key?: string; label?: string; type?: CustomFieldType };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.label) return Response.json({ ok: false, error: "`label` is required" }, { status: 400 });
  const key = (body.key ?? body.label).toLowerCase().trim().replace(/\s+/g, "_");
  const column = createCustomField({ key, label: body.label, type: body.type ?? "text" });
  await persist();
  return Response.json({ ok: true, column }, { status: 201 });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteCustomField(id);
  await persist();
  return Response.json({ ok: true });
}
