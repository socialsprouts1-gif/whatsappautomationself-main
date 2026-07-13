import { createContact, deleteContact, ensureLoaded, listContacts, persist, updateContact } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ contacts: listContacts() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { name?: string; phone?: string; email?: string; tags?: string[]; status?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const phone = body.phone?.replace(/[^\d]/g, "");
  if (!body.name || !phone) {
    return Response.json({ ok: false, error: "`name` and `phone` are required" }, { status: 400 });
  }
  const contact = createContact({
    name: body.name, phone, email: body.email,
    tags: body.tags ?? [], status: (body.status as never) ?? "lead",
  });
  await persist();
  return Response.json({ ok: true, contact }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; name?: string; email?: string; tags?: string[]; status?: string; attributes?: Record<string, string> };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const contact = updateContact(body.id, {
    name: body.name, email: body.email, tags: body.tags,
    status: body.status as never, attributes: body.attributes,
  });
  if (!contact) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, contact });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteContact(id);
  await persist();
  return Response.json({ ok: true });
}
