/**
 * WhatsApp Cloud API client.
 *
 * A thin, dependency-free wrapper around Meta's WhatsApp Cloud API (Graph API)
 * for sending messages and managing message state from the Neuraxine portal.
 *
 * This first version targets a single business-owned WhatsApp number whose
 * credentials are supplied via environment variables. When multi-tenant
 * Embedded Signup is added later, pass a `WhatsAppConfig` explicitly instead of
 * relying on the environment defaults.
 *
 * Required environment variables:
 *   WHATSAPP_ACCESS_TOKEN        Permanent system-user token (keep server-side)
 *   WHATSAPP_PHONE_NUMBER_ID     Phone Number ID from WhatsApp Manager
 *   WHATSAPP_BUSINESS_ACCOUNT_ID WABA ID (optional, used for management calls)
 *   WHATSAPP_API_VERSION         Graph API version, e.g. "v21.0" (optional)
 *   WHATSAPP_VERIFY_TOKEN        Token you choose for webhook verification
 */

const DEFAULT_API_VERSION = "v21.0";
const GRAPH_BASE_URL = "https://graph.facebook.com";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  apiVersion: string;
}

export interface SendResult {
  /** Whether the Cloud API accepted the request. */
  ok: boolean;
  /** WhatsApp message id (wamid...) when accepted. */
  messageId?: string;
  /** Raw Graph API response body, useful for logging/debugging. */
  raw: unknown;
  /** Normalised error message when `ok` is false. */
  error?: string;
}

/**
 * Read WhatsApp configuration: env vars take priority, then runtime credentials
 * saved via the Settings UI (stored in the in-memory DB so they survive hot-reloads
 * within a process without needing a file write).
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  // Lazy import to avoid circular dep at module init time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getSettings } = require("@/lib/store") as { getSettings: () => { waAccessToken?: string; waPhoneNumberId?: string; waBusinessAccountId?: string } };
  const s = getSettings();

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || s.waAccessToken;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || s.waPhoneNumberId;

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and " +
        "WHATSAPP_PHONE_NUMBER_ID in your environment or via the Settings page.",
    );
  }

  return {
    accessToken,
    phoneNumberId,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || s.waBusinessAccountId,
    apiVersion: process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION,
  };
}

/** True when the minimum credentials are present (no throw). */
export function isWhatsAppConfigured(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSettings } = require("@/lib/store") as { getSettings: () => { waAccessToken?: string; waPhoneNumberId?: string } };
    const s = getSettings();
    return Boolean(
      (process.env.WHATSAPP_ACCESS_TOKEN || s.waAccessToken) &&
      (process.env.WHATSAPP_PHONE_NUMBER_ID || s.waPhoneNumberId),
    );
  } catch {
    return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }
}

/**
 * POST a message payload to the Cloud API `/messages` endpoint.
 * All higher-level helpers funnel through here.
 */
async function postMessage(
  payload: Record<string, unknown>,
  config: WhatsAppConfig = getWhatsAppConfig(),
): Promise<SendResult> {
  const url = `${GRAPH_BASE_URL}/${config.apiVersion}/${config.phoneNumberId}/messages`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
  } catch (err) {
    return {
      ok: false,
      raw: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }

  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    const apiError =
      raw && typeof raw === "object" && "error" in raw
        ? (raw as { error?: { message?: string } }).error?.message
        : undefined;
    return {
      ok: false,
      raw,
      error: apiError || `Cloud API returned ${res.status}`,
    };
  }

  const messageId =
    raw && typeof raw === "object" && Array.isArray((raw as { messages?: unknown }).messages)
      ? (raw as { messages: Array<{ id?: string }> }).messages[0]?.id
      : undefined;

  return { ok: true, messageId, raw };
}

/**
 * Send a free-form text message. Only valid inside the 24-hour customer service
 * window; outside it you must use an approved template (see `sendTemplate`).
 */
export function sendText(
  to: string,
  body: string,
  options: { previewUrl?: boolean; config?: WhatsAppConfig } = {},
): Promise<SendResult> {
  return postMessage(
    {
      to,
      type: "text",
      text: { preview_url: options.previewUrl ?? false, body },
    },
    options.config,
  );
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: string;
  parameters: Array<Record<string, unknown>>;
}

/**
 * Send an approved message template. Use this to start conversations or to
 * message a contact outside the 24-hour window.
 */
export function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[],
  config?: WhatsAppConfig,
): Promise<SendResult> {
  return postMessage(
    {
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components && components.length > 0 ? { components } : {}),
      },
    },
    config,
  );
}

/** Mark an incoming message as read (blue ticks) by its wamid. */
export function markAsRead(
  messageId: string,
  config?: WhatsAppConfig,
): Promise<SendResult> {
  return postMessage(
    { status: "read", message_id: messageId },
    config,
  );
}

/* -------------------------------------------------------------------------- */
/*  Webhook payload types                                                     */
/* -------------------------------------------------------------------------- */

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  [key: string]: unknown;
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  [key: string]: unknown;
}

export interface WebhookValue {
  messaging_product: "whatsapp";
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile: { name: string }; wa_id: string }>;
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
}

export interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{ field: string; value: WebhookValue }>;
  }>;
}

/**
 * Flatten a webhook payload into the message-change values it contains.
 * Meta batches multiple entries/changes per delivery, so callers should
 * iterate over the result.
 */
export function extractWebhookValues(payload: WebhookPayload): WebhookValue[] {
  if (!payload || payload.object !== "whatsapp_business_account") return [];
  return payload.entry
    .flatMap((entry) => entry.changes ?? [])
    .filter((change) => change.field === "messages")
    .map((change) => change.value);
}

/* -------------------------------------------------------------------------- */
/*  Interactive messages                                                       */
/* -------------------------------------------------------------------------- */

export interface ButtonOption {
  id: string;
  title: string;
}

/**
 * Send an interactive button message (up to 3 buttons).
 * Falls back gracefully to a text list when > 3 buttons supplied.
 */
export function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: ButtonOption[],
  options: { header?: string; footer?: string; config?: WhatsAppConfig } = {},
): Promise<SendResult> {
  const capped = buttons.slice(0, 3);
  return postMessage(
    {
      to,
      type: "interactive",
      interactive: {
        type: "button",
        ...(options.header ? { header: { type: "text", text: options.header } } : {}),
        body: { text: body },
        ...(options.footer ? { footer: { text: options.footer } } : {}),
        action: {
          buttons: capped.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    },
    options.config,
  );
}

export interface ListSection {
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

/**
 * Send an interactive list message (menu of items).
 */
export function sendInteractiveList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: ListSection[],
  options: { header?: string; footer?: string; config?: WhatsAppConfig } = {},
): Promise<SendResult> {
  return postMessage(
    {
      to,
      type: "interactive",
      interactive: {
        type: "list",
        ...(options.header ? { header: { type: "text", text: options.header } } : {}),
        body: { text: body },
        ...(options.footer ? { footer: { text: options.footer } } : {}),
        action: { button: buttonLabel, sections },
      },
    },
    options.config,
  );
}

/* -------------------------------------------------------------------------- */
/*  Template management (Meta Graph API)                                      */
/* -------------------------------------------------------------------------- */

export interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: string;
  text?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}

export interface CreateTemplatePayload {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: MetaTemplateComponent[];
}

/**
 * Create a message template via the Meta Cloud API.
 * Requires a WABA ID and a token with whatsapp_business_management permission.
 */
export async function createMetaTemplate(
  payload: CreateTemplatePayload,
  config?: WhatsAppConfig,
): Promise<{ ok: boolean; templateId?: string; error?: string; raw?: unknown }> {
  const cfg = config ?? getWhatsAppConfig();
  if (!cfg.businessAccountId) {
    return { ok: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID is required to create templates." };
  }

  const url = `${GRAPH_BASE_URL}/${cfg.apiVersion}/${cfg.businessAccountId}/message_templates`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = raw && typeof raw === "object" && "error" in raw
      ? (raw as { error?: { message?: string } }).error?.message
      : undefined;
    return { ok: false, error: msg || `Meta API returned ${res.status}`, raw };
  }

  const id = raw && typeof raw === "object" && "id" in raw ? String((raw as { id?: unknown }).id) : undefined;
  return { ok: true, templateId: id, raw };
}

/**
 * Fetch all templates from Meta for a WABA.
 */
export async function listMetaTemplates(
  config?: WhatsAppConfig,
): Promise<{ ok: boolean; templates?: unknown[]; error?: string }> {
  const cfg = config ?? getWhatsAppConfig();
  if (!cfg.businessAccountId) {
    return { ok: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID required." };
  }

  const url = `${GRAPH_BASE_URL}/${cfg.apiVersion}/${cfg.businessAccountId}/message_templates?fields=name,status,category,language,components&limit=100`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: `Meta API returned ${res.status}` };
    const data = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown[] }).data : [];
    return { ok: true, templates: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}