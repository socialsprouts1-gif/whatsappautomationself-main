/**
 * POST /api/meta/select
 * Body: { phoneId, token, wabaId, displayPhone }
 *
 * Called when the user picks one of multiple WhatsApp numbers after OAuth.
 */
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: { phoneId?: string; token?: string; wabaId?: string; displayPhone?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { phoneId, token, wabaId, displayPhone } = body;
  if (!phoneId || !token) {
    return Response.json({ ok: false, error: "phoneId and token are required" }, { status: 400 });
  }

  const { updateSettings, persist } = await import("@/lib/store");
  updateSettings({
    waPhoneNumberId: phoneId,
    waAccessToken: token,
    waBusinessAccountId: wabaId ?? "",
    whatsappNumber: displayPhone ?? "",
    sandboxMode: false,
  });
  process.env.WHATSAPP_PHONE_NUMBER_ID = phoneId;
  process.env.WHATSAPP_ACCESS_TOKEN = token;
  if (wabaId) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = wabaId;

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let content = "";
    try { content = fs.readFileSync(envPath, "utf8"); } catch { /* */ }
    const entries: Record<string, string> = { WHATSAPP_PHONE_NUMBER_ID: phoneId, WHATSAPP_ACCESS_TOKEN: token };
    if (wabaId) entries.WHATSAPP_BUSINESS_ACCOUNT_ID = wabaId;
    for (const [k, v] of Object.entries(entries)) {
      const re = new RegExp(`^${k}=.*$`, "m");
      const line = `${k}=${v}`;
      content = re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
  } catch { /* non-fatal */ }

  await persist();
  return Response.json({ ok: true });
}
