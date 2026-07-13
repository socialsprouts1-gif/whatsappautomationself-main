import { ensureLoaded, listWebhookEvents, logWebhookEvent, persist } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ events: listWebhookEvents() });
}

/** Fire a simulated test event so the log/UI can be exercised without a real webhook. */
export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { source?: string; event?: string };
  try { body = await request.json(); } catch { body = {}; }
  const source = body.source ?? "test";
  const event = body.event ?? "ping";
  const logged = logWebhookEvent({
    source,
    event,
    summary: `Test event "${event}" sent from ${source}`,
    payload: { test: true, sentAt: new Date().toISOString() },
    status: "processed",
  });
  await persist();
  return Response.json({ ok: true, event: logged }, { status: 201 });
}
