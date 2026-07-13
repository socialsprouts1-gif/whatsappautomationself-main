import { deleteForm, ensureLoaded, getForm, listFormSubmissions, persist, submitForm, updateForm } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await ensureLoaded();
  const { id } = await params;
  const form = getForm(id);
  if (!form) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  return Response.json({ form, submissions: listFormSubmissions(id) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await ensureLoaded();
  const { id } = await params;
  let body: { [key: string]: unknown; submit?: Record<string, string> };
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.submit) {
    const submission = submitForm(id, body.submit);
    if (!submission) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    await persist();
    return Response.json({ ok: true, submission });
  }

  const { submit: _submit, ...patch } = body;
  const form = updateForm(id, patch);
  if (!form) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, form });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await ensureLoaded();
  const { id } = await params;
  deleteForm(id);
  await persist();
  return Response.json({ ok: true });
}
