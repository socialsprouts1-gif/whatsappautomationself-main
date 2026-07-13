import { ensureLoaded, getAiAssistant, persist, updateAiAssistant } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ assistant: getAiAssistant() });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const assistant = updateAiAssistant(body);
  await persist();
  return Response.json({ ok: true, assistant });
}
