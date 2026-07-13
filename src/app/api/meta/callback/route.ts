/**
 * GET /api/meta/callback
 *
 * Handles the redirect Meta sends after the user completes OAuth / Embedded Signup.
 * Steps:
 *   1. Exchange auth code for a short-lived user access token.
 *   2. Extend it to a 60-day long-lived token.
 *   3. Walk the Graph API to find all WhatsApp phone numbers the user owns.
 *   4a. If exactly one phone → auto-save credentials and redirect to Integrations.
 *   4b. If multiple  → redirect to Integrations with the list encoded in the URL
 *       so the user can pick one.
 *
 * Required env vars:
 *   META_APP_ID, META_APP_SECRET, NEXT_PUBLIC_APP_URL
 */
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface PhoneOption {
  phoneId: string;
  displayPhone: string;
  verifiedName: string;
  wabaId: string;
  businessName: string;
  token: string;
}

/* ─── save helper ────────────────────────────────────────────────────────── */

async function saveCredentials(
  phoneId: string,
  accessToken: string,
  wabaId?: string,
  displayPhone?: string,
): Promise<void> {
  // 1. Update in-memory store + process.env so current request picks it up immediately
  const { updateSettings, persist } = await import("@/lib/store");
  updateSettings({
    waPhoneNumberId: phoneId,
    waAccessToken: accessToken,
    waBusinessAccountId: wabaId ?? "",
    whatsappNumber: displayPhone ?? "",
    sandboxMode: false,
  });
  process.env.WHATSAPP_PHONE_NUMBER_ID = phoneId;
  process.env.WHATSAPP_ACCESS_TOKEN = accessToken;
  if (wabaId) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = wabaId;

  // 2. Persist to .env.local so creds survive a restart
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let existing = "";
    try { existing = fs.readFileSync(envPath, "utf8"); } catch { /* new file */ }

    const updates: Record<string, string> = {
      WHATSAPP_PHONE_NUMBER_ID: phoneId,
      WHATSAPP_ACCESS_TOKEN: accessToken,
    };
    if (wabaId) updates.WHATSAPP_BUSINESS_ACCOUNT_ID = wabaId;

    let content = existing;
    for (const [key, value] of Object.entries(updates)) {
      const re = new RegExp(`^${key}=.*$`, "m");
      const line = `${key}=${value}`;
      content = re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
  } catch (err) {
    console.warn("[meta/callback] could not write .env.local:", err);
  }

  await persist();
}

/* ─── route ──────────────────────────────────────────────────────────────── */

export async function GET(request: Request): Promise<Response> {
  const url    = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const base   = `${origin}/dashboard/integrations`;

  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    const reason = url.searchParams.get("error_description") ?? error ?? "unknown";
    return Response.redirect(`${base}?meta_error=${encodeURIComponent(reason)}`);
  }

  const appId      = process.env.META_APP_ID;
  const appSecret  = process.env.META_APP_SECRET;
  const callbackUrl = `${origin}/api/meta/callback`;

  if (!appId || !appSecret) {
    return Response.redirect(`${base}?meta_error=app_not_configured`);
  }

  /* ── Step 1: exchange code → short-lived token ── */
  const shortRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `client_id=${appId}&client_secret=${appSecret}&` +
    `redirect_uri=${encodeURIComponent(callbackUrl)}&code=${code}`,
  );
  const shortData = await shortRes.json() as { access_token?: string; error?: { message?: string } };
  if (!shortData.access_token) {
    const msg = shortData.error?.message ?? "token_exchange_failed";
    return Response.redirect(`${base}?meta_error=${encodeURIComponent(msg)}`);
  }

  /* ── Step 2: extend to long-lived token (60 days) ── */
  let accessToken = shortData.access_token;
  try {
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&` +
      `fb_exchange_token=${shortData.access_token}`,
    );
    const longData = await longRes.json() as { access_token?: string };
    if (longData.access_token) accessToken = longData.access_token;
  } catch { /* use short-lived token */ }

  /* ── Step 3: fetch WhatsApp phone numbers ── */
  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?` +
    `fields=id,name,businesses{id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,verified_name,display_phone_number,quality_rating}}}` +
    `&access_token=${accessToken}`,
  );
  const meData = await meRes.json() as {
    id?: string; name?: string;
    businesses?: { data?: Array<{
      id: string; name: string;
      owned_whatsapp_business_accounts?: { data?: Array<{
        id: string; name: string;
        phone_numbers?: { data?: Array<{
          id: string; verified_name: string; display_phone_number: string;
        }> };
      }> };
    }> };
  };

  const phones: PhoneOption[] = [];
  for (const biz of (meData.businesses?.data ?? [])) {
    for (const waba of (biz.owned_whatsapp_business_accounts?.data ?? [])) {
      for (const ph of (waba.phone_numbers?.data ?? [])) {
        phones.push({
          phoneId:      ph.id,
          displayPhone: ph.display_phone_number,
          verifiedName: ph.verified_name,
          wabaId:       waba.id,
          businessName: biz.name,
          token:        accessToken,
        });
      }
    }
  }

  /* ── Step 4: connect ── */
  if (phones.length === 0) {
    return Response.redirect(`${base}?meta_error=no_whatsapp_numbers_found`);
  }

  if (phones.length === 1) {
    const p = phones[0];
    await saveCredentials(p.phoneId, p.token, p.wabaId, p.displayPhone);
    return Response.redirect(
      `${base}?meta_connected=1&phone=${encodeURIComponent(p.displayPhone)}`,
    );
  }

  // Multiple numbers → let the user pick on the integrations page
  const encoded = Buffer.from(JSON.stringify(phones.map(p => ({
    ...p,
    token: p.token, // included so the selection handler can save the right token
  })))).toString("base64url");

  return Response.redirect(`${base}?meta_select=1&phones=${encoded}`);
}
