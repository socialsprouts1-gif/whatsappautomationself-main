import { createForm, ensureLoaded, listForms, persist, type WaFormFieldType } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ forms: listForms() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: {
    name?: string;
    description?: string;
    fields?: Array<{ label: string; type: WaFormFieldType; required?: boolean; options?: string[] }>;
  };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name) return Response.json({ ok: false, error: "`name` is required" }, { status: 400 });
  const form = createForm({
    name: body.name,
    description: body.description,
    fields: (body.fields ?? []).map((f) => ({ label: f.label, type: f.type, required: !!f.required, options: f.options })),
  });
  await persist();
  return Response.json({ ok: true, form }, { status: 201 });
}
