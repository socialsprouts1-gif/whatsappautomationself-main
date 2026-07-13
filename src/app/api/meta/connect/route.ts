/**
 * GET /api/meta/connect
 *
 * Kicks off the Meta OAuth flow for WhatsApp Embedded Signup.
 * Redirects the browser to facebook.com/dialog/oauth with the correct scopes.
 *
 * Required env vars:
 *   META_APP_ID              – Your Meta App ID (developers.facebook.com)
 *   NEXT_PUBLIC_APP_URL      – Your app's public URL (e.g. https://myapp.ngrok.io)
 *   META_SIGNUP_CONFIG_ID    – (optional) Embedded Signup Configuration ID for
 *                               the guided WhatsApp number setup UI
 */
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    const base = new URL(request.url).origin;
    return Response.redirect(`${base}/dashboard/integrations?meta_error=meta_not_configured`);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const callbackUrl = `${origin}/api/meta/callback`;

  const configId = process.env.META_SIGNUP_CONFIG_ID;

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set(
    "scope",
    "whatsapp_business_management,whatsapp_business_messaging,business_management",
  );
  authUrl.searchParams.set("response_type", "code");
  if (configId) {
    // Embedded Signup guided flow (phone creation + verification UI)
    authUrl.searchParams.set("config_id", configId);
  }

  return Response.redirect(authUrl.toString());
}
