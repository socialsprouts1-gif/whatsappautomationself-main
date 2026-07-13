import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { ensureLoaded, getSettings, persist, updateSettings, type Settings } from "@/lib/store";
import { persistenceMode } from "@/lib/persistence";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  const settings = getSettings();
  return Response.json({
    settings,
    whatsappConfigured: isWhatsAppConfigured(),
    webhookPath: "/api/whatsapp/webhook",
    persistence: persistenceMode(),
    // Redact tokens for the client
    waAccessTokenSet: !!(process.env.WHATSAPP_ACCESS_TOKEN || settings.waAccessToken),
    waPhoneNumberIdSet: !!(process.env.WHATSAPP_PHONE_NUMBER_ID || settings.waPhoneNumberId),
  });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let patch: Partial<Settings>;
  try {
    patch = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  // When WA credentials are cleared, also clear process.env so the runtime picks it up
  if (patch.waAccessToken === "" || patch.waAccessToken === null) {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    patch.waAccessToken = "";
  }
  if (patch.waPhoneNumberId === "" || patch.waPhoneNumberId === null) {
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    patch.waPhoneNumberId = "";
  }
  const settings = updateSettings(patch);
  await persist();
  return Response.json({ ok: true, settings });
}

/** Save WhatsApp Cloud API credentials — stores in-memory + writes .env.local */
export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: {
    phoneNumberId?: string;
    accessToken?: string;
    verifyToken?: string;
    businessAccountId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.phoneNumberId || !body.accessToken) {
    return Response.json({ ok: false, error: "phoneNumberId and accessToken are required" }, { status: 400 });
  }

  // 1. Save to in-memory store so credentials are available immediately
  updateSettings({
    waPhoneNumberId: body.phoneNumberId,
    waAccessToken: body.accessToken,
    waVerifyToken: body.verifyToken,
    waBusinessAccountId: body.businessAccountId,
    sandboxMode: false,
  });

  // 2. Also update process.env so the same process picks them up without restart
  process.env.WHATSAPP_PHONE_NUMBER_ID = body.phoneNumberId;
  process.env.WHATSAPP_ACCESS_TOKEN = body.accessToken;
  if (body.verifyToken) process.env.WHATSAPP_VERIFY_TOKEN = body.verifyToken;
  if (body.businessAccountId) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = body.businessAccountId;

  // 3. Persist to .env.local so credentials survive a server restart
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let existing = "";
    try { existing = fs.readFileSync(envPath, "utf8"); } catch { /* file may not exist */ }

    const updates: Record<string, string> = {
      WHATSAPP_PHONE_NUMBER_ID: body.phoneNumberId,
      WHATSAPP_ACCESS_TOKEN: body.accessToken,
    };
    if (body.verifyToken) updates.WHATSAPP_VERIFY_TOKEN = body.verifyToken;
    if (body.businessAccountId) updates.WHATSAPP_BUSINESS_ACCOUNT_ID = body.businessAccountId;

    let envContent = existing;
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      const line = `${key}=${value}`;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, line);
      } else {
        envContent = envContent ? `${envContent.trimEnd()}\n${line}\n` : `${line}\n`;
      }
    }
    fs.writeFileSync(envPath, envContent, "utf8");
  } catch (err) {
    // Non-fatal: in-memory creds already work
    console.warn("[settings] Could not write .env.local:", err);
  }

  await persist();

  // Test the connection
  let testOk = false;
  let testError: string | undefined;
  try {
    const { getWhatsAppConfig } = await import("@/lib/whatsapp");
    const cfg = getWhatsAppConfig();
    const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    const data = await res.json().catch(() => null) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } } | null;
    if (res.ok && data) {
      testOk = true;
      // Update the whatsapp number in settings from Meta
      if (data.display_phone_number) {
        updateSettings({ whatsappNumber: data.display_phone_number });
      }
    } else {
      testError = data?.error?.message ?? `Meta API returned ${res.status}`;
    }
  } catch (err) {
    testError = err instanceof Error ? err.message : "Connection test failed";
  }

  return Response.json({
    ok: true,
    connected: testOk,
    testError,
    message: testOk
      ? "WhatsApp connected successfully! Credentials saved."
      : `Credentials saved but connection test failed: ${testError}`,
  });
}
