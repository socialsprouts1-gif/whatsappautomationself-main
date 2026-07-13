import { createReminder, deleteReminder, ensureLoaded, listReminders, persist, updateReminder } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ reminders: listReminders() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { title?: string; note?: string; dueAt?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.title || !body.dueAt) {
    return Response.json({ ok: false, error: "`title` and `dueAt` are required" }, { status: 400 });
  }
  const reminder = createReminder({ title: body.title, note: body.note, dueAt: body.dueAt });
  await persist();
  return Response.json({ ok: true, reminder }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...patch } = body;
  if (!id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const reminder = updateReminder(id, patch);
  if (!reminder) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, reminder });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteReminder(id);
  await persist();
  return Response.json({ ok: true });
}
