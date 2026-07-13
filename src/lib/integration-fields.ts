/**
 * Credential field metadata for each connector in the Integrations catalog.
 *
 * This file is pure data (no server-only imports) so it is safe to import
 * from both client components (to render the "Connect" form) and server
 * code (to validate submitted values against the same field list). The
 * actual live validation logic lives in `integration-providers.ts`, which is
 * server-only.
 */

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "textarea" | "apikey-select";
  placeholder?: string;
  helpText?: string;
  helpUrl?: string;
}

/**
 * "zapier" and "make" don't authenticate *you* to a third party — instead
 * they call back *into* this app using one of your own API keys (Webhooks by
 * Zapier / Make's HTTP module). Their field type "apikey-select" tells the
 * frontend to render a picker over this app's own `/api/api-keys` instead of
 * a text field, and the backend validates that the chosen key is real and
 * not revoked.
 */
export const INTEGRATION_FIELDS: Record<string, CredentialField[]> = {
  stripe: [
    { key: "secretKey", label: "Secret key", type: "password", placeholder: "sk_live_… or sk_test_…", helpUrl: "https://dashboard.stripe.com/apikeys" },
  ],
  zapier: [
    { key: "apiKeyId", label: "API key to use for Zapier", type: "apikey-select", helpText: "Zapier calls into your account using this key via \"Webhooks by Zapier\"." },
  ],
  openai: [
    { key: "apiKey", label: "API key", type: "password", placeholder: "sk-…", helpUrl: "https://platform.openai.com/api-keys" },
  ],
  meta: [
    { key: "accessToken", label: "Access token", type: "password", placeholder: "EAAG…", helpText: "A Facebook/Meta Marketing API access token (System User or long-lived User token).", helpUrl: "https://developers.facebook.com/tools/explorer/" },
  ],
  woocommerce: [
    { key: "storeUrl", label: "Store URL", type: "url", placeholder: "https://yourstore.com" },
    { key: "consumerKey", label: "Consumer key", type: "text", placeholder: "ck_…" },
    { key: "consumerSecret", label: "Consumer secret", type: "password", placeholder: "cs_…" },
  ],
  telegram: [
    { key: "botToken", label: "Bot token", type: "password", placeholder: "123456789:AAExxxxxxxxxxxxxxxxxxxxxxx", helpUrl: "https://core.telegram.org/bots#botfather" },
  ],
  twilio: [
    { key: "accountSid", label: "Account SID", type: "text", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    { key: "authToken", label: "Auth token", type: "password" },
  ],
  mailchimp: [
    { key: "apiKey", label: "API key", type: "password", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21", helpText: "The -usXX suffix tells us which Mailchimp data center to call." },
  ],
  slack: [
    { key: "botToken", label: "Bot User OAuth token", type: "password", placeholder: "xoxb-…", helpUrl: "https://api.slack.com/apps" },
  ],
  airtable: [
    { key: "personalAccessToken", label: "Personal access token", type: "password", placeholder: "pat…", helpUrl: "https://airtable.com/create/tokens" },
  ],
  make: [
    { key: "apiKeyId", label: "API key to use for Make", type: "apikey-select", helpText: "Make calls into your account using this key via an HTTP module." },
  ],
  razorpay: [
    { key: "keyId", label: "Key ID", type: "text", placeholder: "rzp_live_…" },
    { key: "keySecret", label: "Key secret", type: "password" },
  ],
  google_sheets: [
    { key: "serviceAccountJson", label: "Service account JSON key", type: "textarea", placeholder: "Paste the full contents of your service-account-xxxx.json file", helpUrl: "https://console.cloud.google.com/iam-admin/serviceaccounts" },
  ],
  hubspot: [
    { key: "accessToken", label: "Private app access token", type: "password", placeholder: "pat-na1-…", helpUrl: "https://developers.hubspot.com/docs/api/private-apps" },
  ],
};
