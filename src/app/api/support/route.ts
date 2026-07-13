import { createSupportTicket, ensureLoaded, listSupportTickets, persist, type SupportTicketPriority } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ tickets: listSupportTickets() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { subject?: string; message?: string; priority?: SupportTicketPriority };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.subject || !body.message) {
    return Response.json({ ok: false, error: "`subject` and `message` are required" }, { status: 400 });
  }
  const ticket = createSupportTicket({ subject: body.subject, message: body.message, priority: body.priority ?? "medium" });
  await persist();
  return Response.json({ ok: true, ticket }, { status: 201 });
}
