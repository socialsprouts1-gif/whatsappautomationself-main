import { createCannedMessage, deleteCannedMessage, ensureLoaded, listCannedMessages, persist, updateCannedMessage } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ cannedMessages: listCannedMessages() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { shortcut?: string; text?: string; category?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.shortcut || !body.text) {
    return Response.json({ ok: false, error: "`shortcut` and `text` are required" }, { status: 400 });
  }
  const shortcut = body.shortcut.startsWith("/") ? body.shortcut : `/${body.shortcut}`;
  const message = createCannedMessage({ shortcut, text: body.text, category: body.category ?? "General" });
  await persist();
  return Response.json({ ok: true, message }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...patch } = body;
  if (!id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const message = updateCannedMessage(id, patch);
  if (!message) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, message });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteCannedMessage(id);
  await persist();
  return Response.json({ ok: true });
}
