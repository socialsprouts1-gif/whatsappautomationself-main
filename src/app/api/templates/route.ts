import {
  createTemplate,
  ensureLoaded,
  listTemplates,
  persist,
  updateTemplate,
  type TemplateCategory,
} from "@/lib/store";
import { isWhatsAppConfigured, createMetaTemplate, listMetaTemplates } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();

  // Try to sync live templates from Meta if credentials are available
  if (isWhatsAppConfigured()) {
    try {
      const result = await listMetaTemplates();
      if (result.ok && result.templates) {
        for (const mt of result.templates as Array<{ name: string; status: string; category: string; language: string; components?: Array<{ type: string; text?: string }> }>) {
          const existing = listTemplates().find((t) => t.name === mt.name);
          const status = mt.status?.toLowerCase() as "approved" | "pending" | "rejected";
          if (existing) {
            if (existing.status !== status) updateTemplate(existing.id, { status });
          } else {
            const body = mt.components?.find((c) => c.type === "BODY")?.text ?? "";
            createTemplate({
              name: mt.name,
              category: (mt.category?.toLowerCase() ?? "utility") as TemplateCategory,
              language: mt.language ?? "en_US",
              body,
              variableCount: (body.match(/\{\{\s*\d+\s*\}\}/g) ?? []).length,
            });
          }
        }
      }
    } catch {
      // Non-fatal: return local templates on Meta API failure
    }
  }

  return Response.json({ templates: listTemplates() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { name?: string; category?: TemplateCategory; language?: string; body?: string; header?: string; footer?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name || !body.body) {
    return Response.json({ ok: false, error: "`name` and `body` are required" }, { status: 400 });
  }

  const variableCount = (body.body.match(/\{\{\s*\d+\s*\}\}/g) ?? []).length;
  const normalizedName = body.name.toLowerCase().replace(/\s+/g, "_");

  // Build Meta API component payload
  const components: Array<{ type: string; format?: string; text?: string }> = [];
  if (body.header) components.push({ type: "HEADER", format: "TEXT", text: body.header });
  components.push({ type: "BODY", text: body.body });
  if (body.footer) components.push({ type: "FOOTER", text: body.footer });

  let metaStatus: "pending" | "approved" = "pending";
  let metaError: string | undefined;

  // Try to submit to Meta API
  if (isWhatsAppConfigured()) {
    try {
      const result = await createMetaTemplate({
        name: normalizedName,
        category: ((body.category ?? "utility").toUpperCase()) as "MARKETING" | "UTILITY" | "AUTHENTICATION",
        language: body.language ?? "en_US",
        components: components as import("@/lib/whatsapp").MetaTemplateComponent[],
      });
      if (result.ok) {
        metaStatus = "pending"; // Meta always starts pending review
      } else {
        metaError = result.error;
      }
    } catch (err) {
      metaError = err instanceof Error ? err.message : "Meta API call failed";
    }
  }

  const template = createTemplate({
    name: normalizedName,
    category: body.category ?? "utility",
    language: body.language ?? "en_US",
    body: body.body,
    variableCount,
  });

  await persist();
  return Response.json({
    ok: true,
    template,
    metaSubmitted: isWhatsAppConfigured() && !metaError,
    metaError,
    note: metaError
      ? `Template saved locally. Meta submission failed: ${metaError}`
      : isWhatsAppConfigured()
      ? "Template submitted to Meta for review. Approval usually takes a few minutes."
      : "Template saved locally. Connect WhatsApp in Settings to submit to Meta.",
    status: metaStatus,
  }, { status: 201 });
}
