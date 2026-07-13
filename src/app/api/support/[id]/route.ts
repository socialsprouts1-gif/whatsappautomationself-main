import { addSupportReply, ensureLoaded, getSupportTicket, persist, updateSupportTicket } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await ensureLoaded();
  const { id } = await params;
  const ticket = getSupportTicket(id);
  if (!ticket) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  return Response.json({ ticket });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await ensureLoaded();
  const { id } = await params;
  let body: { status?: "open" | "pending" | "resolved"; priority?: "low" | "medium" | "high"; reply?: string };
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.reply) {
    addSupportReply(id, "agent", body.reply);
  }
  const patch: { status?: "open" | "pending" | "resolved"; priority?: "low" | "medium" | "high" } = {};
  if (body.status) patch.status = body.status;
  if (body.priority) patch.priority = body.priority;
  const ticket = Object.keys(patch).length ? updateSupportTicket(id, patch) : getSupportTicket(id);

  if (!ticket) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, ticket });
}
