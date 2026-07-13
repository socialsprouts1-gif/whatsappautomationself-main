/**
 * Live credential validation for each Integrations catalog connector.
 *
 * Every validator here makes a real network call to the provider's real API
 * (or checks a real record in our own store, for the two connectors that work
 * via inbound webhooks rather than outbound API calls) and only reports
 * success if the provider actually accepts the credential. No connector is
 * ever marked "connected" without this passing — see the POST handler in
 * `src/app/api/integrations/route.ts`.
 *
 * Server-only: uses `node:crypto` and outbound `fetch` to third-party APIs.
 * Do not import this from a "use client" component.
 */

import crypto from "node:crypto";
import { listApiKeys } from "@/lib/store";

export interface ValidationResult {
  ok: boolean;
  /** Human-readable confirmation of *what* got connected (account name, workspace, etc). */
  accountLabel?: string;
  error?: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function safeFetch(url: string, init?: RequestInit): Promise<{ res: Response; json: unknown } | { error: string }> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { error: e instanceof Error ? `Could not reach the provider: ${e.message}` : "Could not reach the provider." };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response (HTML error page, empty body, etc) — leave json null.
  }
  return { res, json };
}

/* -------------------------------------------------------------------------- */

async function validateStripe(c: Record<string, string>): Promise<ValidationResult> {
  const key = c.secretKey?.trim();
  if (!key) return { ok: false, error: "Secret key is required." };
  const result = await safeFetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { error?: { message?: string }; business_profile?: { name?: string }; settings?: { dashboard?: { display_name?: string } }; id?: string } | null;
  if (!result.res.ok) return { ok: false, error: body?.error?.message ?? `Stripe rejected the key (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body?.business_profile?.name ?? body?.settings?.dashboard?.display_name ?? body?.id ?? "Stripe account" };
}

async function validateOpenAi(c: Record<string, string>): Promise<ValidationResult> {
  const key = c.apiKey?.trim();
  if (!key) return { ok: false, error: "API key is required." };
  const result = await safeFetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { error?: { message?: string }; data?: unknown[] } | null;
  if (!result.res.ok) return { ok: false, error: body?.error?.message ?? `OpenAI rejected the key (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: `${body?.data?.length ?? 0} models available` };
}

async function validateMeta(c: Record<string, string>): Promise<ValidationResult> {
  const token = c.accessToken?.trim();
  if (!token) return { ok: false, error: "Access token is required." };
  const result = await safeFetch(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`);
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { error?: { message?: string }; name?: string; id?: string } | null;
  if (!result.res.ok) return { ok: false, error: body?.error?.message ?? `Meta rejected the token (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body?.name ?? body?.id ?? "Meta account" };
}

async function validateWooCommerce(c: Record<string, string>): Promise<ValidationResult> {
  const storeUrl = c.storeUrl?.trim().replace(/\/+$/, "");
  const consumerKey = c.consumerKey?.trim();
  const consumerSecret = c.consumerSecret?.trim();
  if (!storeUrl || !consumerKey || !consumerSecret) return { ok: false, error: "Store URL, consumer key and consumer secret are all required." };
  if (!/^https?:\/\//.test(storeUrl)) return { ok: false, error: "Store URL must start with http:// or https://." };
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const result = await safeFetch(`${storeUrl}/wp-json/wc/v3/system_status`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { message?: string; environment?: { site_url?: string } } | null;
  if (!result.res.ok) return { ok: false, error: body?.message ?? `WooCommerce rejected the credentials (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body?.environment?.site_url ?? storeUrl };
}

async function validateTelegram(c: Record<string, string>): Promise<ValidationResult> {
  const token = c.botToken?.trim();
  if (!token) return { ok: false, error: "Bot token is required." };
  const result = await safeFetch(`https://api.telegram.org/bot${token}/getMe`);
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { ok?: boolean; description?: string; result?: { username?: string; first_name?: string } } | null;
  if (!result.res.ok || !body?.ok) return { ok: false, error: body?.description ?? `Telegram rejected the bot token (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body.result?.username ? `@${body.result.username}` : body.result?.first_name };
}

async function validateTwilio(c: Record<string, string>): Promise<ValidationResult> {
  const sid = c.accountSid?.trim();
  const token = c.authToken?.trim();
  if (!sid || !token) return { ok: false, error: "Account SID and auth token are both required." };
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const result = await safeFetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { message?: string; friendly_name?: string; status?: string } | null;
  if (!result.res.ok) return { ok: false, error: body?.message ?? `Twilio rejected the credentials (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body?.friendly_name ?? sid };
}

async function validateMailchimp(c: Record<string, string>): Promise<ValidationResult> {
  const key = c.apiKey?.trim();
  if (!key) return { ok: false, error: "API key is required." };
  const dc = key.split("-").pop();
  if (!dc || dc === key) return { ok: false, error: "That doesn't look like a Mailchimp API key — it should end in a data-center suffix like \"-us21\"." };
  const auth = Buffer.from(`anystring:${key}`).toString("base64");
  const result = await safeFetch(`https://${dc}.api.mailchimp.com/3.0/`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { detail?: string; account_name?: string } | null;
  if (!result.res.ok) return { ok: false, error: body?.detail ?? `Mailchimp rejected the key (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body?.account_name ?? "Mailchimp account" };
}

async function validateSlack(c: Record<string, string>): Promise<ValidationResult> {
  const token = c.botToken?.trim();
  if (!token) return { ok: false, error: "Bot token is required." };
  const result = await safeFetch("https://slack.com/api/auth.test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { ok?: boolean; error?: string; team?: string; user?: string } | null;
  if (!body?.ok) return { ok: false, error: body?.error ?? "Slack rejected the token." };
  return { ok: true, accountLabel: body.team ? `${body.team} (${body.user})` : body.user };
}

async function validateAirtable(c: Record<string, string>): Promise<ValidationResult> {
  const token = c.personalAccessToken?.trim();
  if (!token) return { ok: false, error: "Personal access token is required." };
  const result = await safeFetch("https://api.airtable.com/v0/meta/bases", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { error?: { message?: string } | string; bases?: unknown[] } | null;
  if (!result.res.ok) {
    const err = body?.error;
    return { ok: false, error: (typeof err === "string" ? err : err?.message) ?? `Airtable rejected the token (HTTP ${result.res.status}).` };
  }
  return { ok: true, accountLabel: `${body?.bases?.length ?? 0} base(s) accessible` };
}

async function validateRazorpay(c: Record<string, string>): Promise<ValidationResult> {
  const keyId = c.keyId?.trim();
  const keySecret = c.keySecret?.trim();
  if (!keyId || !keySecret) return { ok: false, error: "Key ID and key secret are both required." };
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const result = await safeFetch("https://api.razorpay.com/v1/payments?count=1", {
    headers: { Authorization: `Basic ${auth}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { error?: { description?: string } } | null;
  if (!result.res.ok) return { ok: false, error: body?.error?.description ?? `Razorpay rejected the credentials (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: keyId };
}

async function validateHubSpot(c: Record<string, string>): Promise<ValidationResult> {
  const token = c.accessToken?.trim();
  if (!token) return { ok: false, error: "Access token is required." };
  const result = await safeFetch("https://api.hubapi.com/account-info/v3/details", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { message?: string; portalId?: number; accountType?: string } | null;
  if (!result.res.ok) return { ok: false, error: body?.message ?? `HubSpot rejected the token (HTTP ${result.res.status}).` };
  return { ok: true, accountLabel: body?.portalId ? `Portal ${body.portalId}` : "HubSpot account" };
}

async function validateGoogleSheets(c: Record<string, string>): Promise<ValidationResult> {
  const raw = c.serviceAccountJson?.trim();
  if (!raw) return { ok: false, error: "Service account JSON key is required." };
  let sa: { client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That isn't valid JSON — paste the full contents of the service account key file." };
  }
  if (!sa.client_email || !sa.private_key) {
    return { ok: false, error: "The JSON is missing `client_email` or `private_key` — make sure it's a service-account key file, not an OAuth client file." };
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;

  let signature: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    signature = base64url(signer.sign(sa.private_key));
  } catch {
    return { ok: false, error: "Could not sign a request with this private key — it may be malformed." };
  }

  const jwt = `${unsigned}.${signature}`;
  const result = await safeFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if ("error" in result) return { ok: false, error: result.error };
  const body = result.json as { error?: string; error_description?: string; access_token?: string } | null;
  if (!result.res.ok || !body?.access_token) {
    return { ok: false, error: body?.error_description ?? body?.error ?? `Google rejected the service account (HTTP ${result.res.status}).` };
  }
  return { ok: true, accountLabel: sa.client_email };
}

/** Zapier/Make don't hold real credentials of ours — they call *into* this app
 * using one of our own API keys. "Connecting" them means picking a real,
 * active key from `/dashboard/api-keys`. */
function validateSelfIssuedKey(c: Record<string, string>, providerLabel: string): ValidationResult {
  const keyId = c.apiKeyId?.trim();
  if (!keyId) return { ok: false, error: `Select an API key for ${providerLabel} to use.` };
  const key = listApiKeys().find((k) => k.id === keyId);
  if (!key) return { ok: false, error: "That API key no longer exists — refresh and pick another." };
  if (key.revoked) return { ok: false, error: "That API key has been revoked. Generate a new one from API Endpoints first." };
  return { ok: true, accountLabel: `Using key "${key.name}"` };
}

export async function validateIntegration(key: string, credentials: Record<string, string>): Promise<ValidationResult> {
  switch (key) {
    case "stripe": return validateStripe(credentials);
    case "openai": return validateOpenAi(credentials);
    case "meta": return validateMeta(credentials);
    case "woocommerce": return validateWooCommerce(credentials);
    case "telegram": return validateTelegram(credentials);
    case "twilio": return validateTwilio(credentials);
    case "mailchimp": return validateMailchimp(credentials);
    case "slack": return validateSlack(credentials);
    case "airtable": return validateAirtable(credentials);
    case "razorpay": return validateRazorpay(credentials);
    case "hubspot": return validateHubSpot(credentials);
    case "google_sheets": return validateGoogleSheets(credentials);
    case "zapier": return validateSelfIssuedKey(credentials, "Zapier");
    case "make": return validateSelfIssuedKey(credentials, "Make");
    default: return { ok: false, error: `No connector is registered for "${key}".` };
  }
}
