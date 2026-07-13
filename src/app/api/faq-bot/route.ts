import { createFaq, deleteFaq, ensureLoaded, listFaqs, persist, updateFaq } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ faqs: listFaqs() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { question?: string; answer?: string; category?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.question || !body.answer) {
    return Response.json({ ok: false, error: "`question` and `answer` are required" }, { status: 400 });
  }
  const faq = createFaq({ question: body.question, answer: body.answer, category: body.category ?? "General", enabled: true });
  await persist();
  return Response.json({ ok: true, faq }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...patch } = body;
  if (!id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const faq = updateFaq(id, patch);
  if (!faq) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, faq });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteFaq(id);
  await persist();
  return Response.json({ ok: true });
}
