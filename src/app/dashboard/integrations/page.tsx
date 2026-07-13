"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Check, Plug, Search, X, AlertCircle, CheckCircle, Copy, ExternalLink,
  Eye, EyeOff, Loader2, Wifi, WifiOff, Phone, KeyRound, ShieldCheck,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { INTEGRATION_FIELDS, type CredentialField } from "@/lib/integration-fields";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface WaStatus {
  configured: boolean;
  phoneNumber: string;
  webhookPath: string;
}

interface PhoneOption {
  phoneId: string;
  displayPhone: string;
  verifiedName: string;
  wabaId: string;
  businessName: string;
  token: string;
}

interface BackendIntegration {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  connectedAt?: string;
  accountLabel?: string;
  hasCredentials: boolean;
}

interface ApiKeyOption {
  id: string;
  name: string;
  revoked: boolean;
}

/* ─── Integration catalogue ──────────────────────────────────────────────── */

const INTEGRATIONS = [
  { key: "stripe",       name: "Stripe",           category: "Payments",    description: "Trigger messages on payments and subscriptions." },
  { key: "zapier",       name: "Zapier",            category: "Automation",  description: "Connect to 6000+ apps with no code." },
  { key: "openai",       name: "OpenAI",            category: "AI",          description: "Power AI replies with GPT models." },
  { key: "meta",         name: "Meta / Facebook",   category: "Social",      description: "Run WhatsApp and Facebook ads, sync leads and audiences." },
  { key: "woocommerce",  name: "WooCommerce",       category: "E-commerce",  description: "Sync orders, products and abandoned carts from your WordPress store." },
  { key: "telegram",     name: "Telegram",          category: "Messaging",   description: "Bridge your Telegram bot to the same automation workflows." },
  { key: "twilio",       name: "Twilio",            category: "Messaging",   description: "Send SMS and voice fallback through Twilio channels." },
  { key: "mailchimp",    name: "Mailchimp",         category: "Marketing",   description: "Sync contacts to Mailchimp lists and audiences." },
  { key: "slack",        name: "Slack",             category: "Productivity",description: "Get real-time notifications and escalations in Slack." },
  { key: "airtable",     name: "Airtable",          category: "Productivity",description: "Log and read records from Airtable bases inside flows." },
  { key: "make",         name: "Make (Integromat)", category: "Automation",  description: "Build complex multi-step scenarios with Make.com." },
  { key: "razorpay",     name: "Razorpay",          category: "Payments",    description: "Trigger messages on payment events." },
  { key: "google_sheets",name: "Google Sheets",     category: "Productivity",description: "Read and write rows from Google Sheets inside flows." },
  { key: "hubspot",      name: "HubSpot",           category: "CRM",         description: "Sync contacts and conversations into HubSpot." },
];

const CAT_COLOR: Record<string, string> = {
  "E-commerce": "#16a34a", Productivity: "#2563eb", CRM: "#7c3aed",
  Payments: "#d97706", Automation: "#db2777", AI: "#10b981",
  Messaging: "#0ea5e9", Social: "#4f46e5", Marketing: "#f59e0b",
  Analytics: "#06b6d4",
};

/* ─── Manual credentials modal (fallback if no Meta App) ─────────────────── */

function ManualModal({ status, onClose, onConnected }: {
  status: WaStatus; onClose: () => void; onConnected: (phone: string) => void;
}) {
  const [phoneId, setPhoneId]     = useState("");
  const [token, setToken]         = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [wabaId, setWabaId]       = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [result, setResult]       = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied]       = useState(false);

  const webhookUrl = `https://<your-domain>${status.webhookPath}`;
  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  async function connect() {
    if (!phoneId.trim() || !token.trim()) return;
    setConnecting(true); setResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: phoneId.trim(), accessToken: token.trim(),
          verifyToken: verifyToken.trim() || "whatsflow_verify", businessAccountId: wabaId.trim() }),
      });
      const json = await res.json() as { ok: boolean; message: string };
      setResult({ ok: json.ok, message: json.message });
      if (json.ok) onConnected(phoneId.trim());
    } catch (e) { setResult({ ok: false, message: String(e) }); }
    finally { setConnecting(false); }
  }

  async function disconnect() {
    await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waAccessToken: "", waPhoneNumberId: "" }),
    });
    onConnected(""); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
            style={{ background: "#16a34a" }}>W</div>
          <div className="flex-1"><h2 className="font-semibold text-gray-900">Manual Setup</h2>
            <p className="text-xs text-gray-400">Enter Meta Cloud API credentials directly</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {status.configured && (
            <div className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <strong>Number connected</strong>{status.phoneNumber && <> — {status.phoneNumber}</>}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number ID</label>
              <input value={phoneId} onChange={e => setPhoneId(e.target.value)} placeholder="e.g. 123456789012345"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Access Token</label>
              <div className="relative">
                <input type={showToken ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)}
                  placeholder="EAAxxxxxx…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-green-400 pr-10" />
                <button onClick={() => setShowToken(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Verify Token</label>
                <input value={verifyToken} onChange={e => setVerifyToken(e.target.value)}
                  placeholder="e.g. my_secret_123"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">WABA ID (optional)</label>
                <input value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="Business Account ID"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-green-400" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Register this URL in Meta → WhatsApp → Configuration → Webhook:</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <code className="text-xs text-blue-600 font-mono flex-1 truncate">{webhookUrl}</code>
              <button onClick={copyWebhook}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1 flex-shrink-0"
                style={{ borderColor: "#d1d5db", color: copied ? "#16a34a" : "#6b7280" }}>
                <Copy className="w-3 h-3" />{copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          {result && (
            <div className="flex items-start gap-3 p-3 rounded-xl text-sm"
              style={{ background: result.ok ? "#f0fdf4" : "#fff1f2",
                border: `1px solid ${result.ok ? "#bbf7d0" : "#fecdd3"}`,
                color: result.ok ? "#15803d" : "#be123c" }}>
              {result.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                         : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {result.message}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {status.configured && (
            <button onClick={disconnect}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border"
              style={{ borderColor: "#fecaca", color: "#ef4444", background: "#fef2f2" }}>
              <WifiOff className="w-3.5 h-3.5" /> Disconnect
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={connect} disabled={connecting || !phoneId.trim() || !token.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#16a34a" }}>
            {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
            {connecting ? "Connecting…" : "Save & Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Phone selection modal ──────────────────────────────────────────────── */

function PhoneSelectModal({ phones, onClose }: { phones: PhoneOption[]; onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  async function select(p: PhoneOption) {
    setSaving(p.phoneId);
    const res = await fetch("/api/meta/select", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneId: p.phoneId, token: p.token, wabaId: p.wabaId, displayPhone: p.displayPhone }),
    });
    if ((await res.json() as { ok: boolean }).ok) {
      router.replace(`/dashboard/integrations?meta_connected=1&phone=${encodeURIComponent(p.displayPhone)}`);
    }
    setSaving(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
            style={{ background: "#16a34a" }}>W</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Select a WhatsApp Number</h2>
            <p className="text-xs text-gray-400">Multiple numbers found — choose one to connect</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {phones.map(p => (
            <button key={p.phoneId} onClick={() => select(p)} disabled={!!saving}
              className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left"
              style={{ borderColor: saving === p.phoneId ? "#16a34a" : "#e5e7eb",
                background: saving === p.phoneId ? "#f0fdf4" : "transparent" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#dcfce7" }}>
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">{p.displayPhone}</p>
                <p className="text-xs text-gray-500">{p.verifiedName} · {p.businessName}</p>
              </div>
              {saving === p.phoneId
                ? <Loader2 className="w-4 h-4 text-green-600 animate-spin flex-shrink-0" />
                : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Connect modal: real credentials, validated live against the provider ── */

function ConnectModal({ item, onClose, onConnected }: {
  item: { key: string; name: string; category: string; description: string };
  onClose: () => void;
  onConnected: (integration: BackendIntegration) => void;
}) {
  const fields: CredentialField[] = INTEGRATION_FIELDS[item.key] ?? [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<ApiKeyOption[] | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsApiKeyPicker = fields.some(f => f.type === "apikey-select");

  useEffect(() => {
    if (!needsApiKeyPicker) return;
    fetch("/api/api-keys").then(r => r.json()).then((d: { keys?: ApiKeyOption[] }) => {
      setApiKeys((d.keys ?? []).filter(k => !k.revoked));
    }).catch(() => setApiKeys([]));
  }, [needsApiKeyPicker]);

  function setField(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }));
  }

  const canSubmit = fields.every(f => (values[f.key] ?? "").trim().length > 0) && !connecting;

  async function submit() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: item.key, name: item.name, description: item.description,
          category: item.category, credentials: values,
        }),
      });
      const json = await res.json() as { ok: boolean; integration?: BackendIntegration; error?: string };
      if (json.ok && json.integration) {
        onConnected(json.integration);
      } else {
        setError(json.error ?? "Could not verify these credentials.");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
            style={{ background: "#2563eb" }}>{item.name.charAt(0)}</div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Connect {item.name}</h2>
            <p className="text-xs text-gray-400">
              {needsApiKeyPicker ? "Pick one of your API keys" : "Enter real credentials — we verify them live before connecting"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {fields.length === 0 && (
            <p className="text-sm text-gray-500">No connector is configured for this integration yet.</p>
          )}

          {fields.map(f => {
            if (f.type === "apikey-select") {
              return (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  {apiKeys === null ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your API keys…
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                      style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        You don&rsquo;t have any active API keys yet. Create one on the{" "}
                        <a href="/dashboard/api-keys" className="underline font-medium">API Endpoints</a> page, then come back here.
                      </span>
                    </div>
                  ) : (
                    <select value={values[f.key] ?? ""} onChange={e => setField(f.key, e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400">
                      <option value="">Select an API key…</option>
                      {apiKeys.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  )}
                  {f.helpText && <p className="text-[11px] text-gray-400 mt-1">{f.helpText}</p>}
                </div>
              );
            }

            if (f.type === "textarea") {
              return (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <textarea value={values[f.key] ?? ""} onChange={e => setField(f.key, e.target.value)}
                    rows={6} placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:border-blue-400 resize-none" />
                  {f.helpText && <p className="text-[11px] text-gray-400 mt-1">{f.helpText}</p>}
                  {f.helpUrl && (
                    <a href={f.helpUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-0.5 mt-1">
                      Where do I find this? <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              );
            }

            const isPassword = f.type === "password";
            const shown = reveal[f.key];
            return (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                <div className="relative">
                  <input
                    type={isPassword && !shown ? "password" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400 ${isPassword ? "pr-10" : ""}`}
                  />
                  {isPassword && (
                    <button type="button" onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {f.helpText && <p className="text-[11px] text-gray-400 mt-1">{f.helpText}</p>}
                {f.helpUrl && (
                  <a href={f.helpUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-0.5 mt-1">
                    Where do I find this? <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            );
          })}

          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl text-sm"
              style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-xl text-[11px] text-gray-500" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
            We call {item.name}&rsquo;s real API with what you enter to confirm it works before marking this connected — nothing is faked, and wrong credentials are rejected.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <div className="flex-1" />
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={!canSubmit || fields.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#2563eb" }}>
            {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
            {connecting ? "Verifying…" : "Verify & Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page (needs Suspense because it reads searchParams) ───────────── */

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [search, setSearch]       = useState("");
  const [manualModal, setManualModal] = useState(false);
  const [phoneOptions, setPhoneOptions] = useState<PhoneOption[] | null>(null);
  const [toast, setToast]         = useState<{ ok: boolean; msg: string } | null>(null);
  const [waStatus, setWaStatus]   = useState<WaStatus>({
    configured: false, phoneNumber: "", webhookPath: "/api/whatsapp/webhook",
  });
  const [metaAppId, setMetaAppId] = useState<string | null>(null);
  const [live, setLive]           = useState<Record<string, BackendIntegration>>({});
  const [connectModalItem, setConnectModalItem] = useState<typeof INTEGRATIONS[number] | null>(null);
  const [disconnectingKey, setDisconnectingKey] = useState<string | null>(null);

  const loadIntegrations = () => {
    fetch("/api/integrations").then(r => r.json()).then((d: { integrations?: BackendIntegration[] }) => {
      const map: Record<string, BackendIntegration> = {};
      for (const i of d.integrations ?? []) map[i.key] = i;
      setLive(map);
    }).catch(() => {});
  };

  /* load current WA status + check if META_APP_ID is configured */
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((d: {
      whatsappConfigured?: boolean; settings?: { whatsappNumber?: string };
      webhookPath?: string; metaAppId?: string;
    }) => {
      setWaStatus({ configured: !!d.whatsappConfigured,
        phoneNumber: d.settings?.whatsappNumber ?? "",
        webhookPath: d.webhookPath ?? "/api/whatsapp/webhook" });
    }).catch(() => {});

    // Check if Meta OAuth is configured
    fetch("/api/meta/status").then(r => r.json()).then((d: { appId?: string }) => {
      if (d.appId) setMetaAppId(d.appId);
    }).catch(() => {});

    loadIntegrations();
  }, []);

  /** Called by the ConnectModal once the provider has actually accepted the credentials. */
  function handleConnectedIntegration(integration: BackendIntegration) {
    setLive(l => ({ ...l, [integration.key]: integration }));
    setConnectModalItem(null);
    setToast({
      ok: true,
      msg: integration.accountLabel ? `${integration.name} connected — ${integration.accountLabel}.` : `${integration.name} connected.`,
    });
  }

  /** Disconnect an integration — clears the stored credentials server-side, not just a flag. */
  async function disconnectIntegration(item: typeof INTEGRATIONS[number]) {
    if (!window.confirm(`Disconnect ${item.name}? Your stored credentials for it will be removed.`)) return;
    setDisconnectingKey(item.key);
    try {
      const res = await fetch("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key }),
      });
      const json = await res.json() as { ok: boolean; integration?: BackendIntegration; error?: string };
      if (json.ok && json.integration) {
        setLive(l => ({ ...l, [item.key]: json.integration! }));
        setToast({ ok: true, msg: `${item.name} disconnected.` });
      } else {
        setToast({ ok: false, msg: json.error ?? `Failed to disconnect ${item.name}.` });
      }
    } catch {
      setToast({ ok: false, msg: `Failed to reach the server. Try again.` });
    } finally {
      setDisconnectingKey(null);
    }
  }

  /* handle redirect from /api/meta/callback */
  useEffect(() => {
    const connected  = searchParams.get("meta_connected");
    const error      = searchParams.get("meta_error");
    const selectFlag = searchParams.get("meta_select");
    const phonesB64  = searchParams.get("phones");
    const phone      = searchParams.get("phone");

    if (connected === "1") {
      setWaStatus(s => ({ ...s, configured: true, phoneNumber: phone ?? s.phoneNumber }));
      setToast({ ok: true, msg: `WhatsApp connected${phone ? `: ${phone}` : ""}! Sandbox mode disabled.` });
      router.replace("/dashboard/integrations");
    } else if (error) {
      const msgs: Record<string, string> = {
        meta_not_configured: "Meta App ID is not set. Use manual setup or add META_APP_ID to your environment.",
        app_not_configured: "META_APP_SECRET is missing. Add it to your environment variables.",
        no_whatsapp_numbers_found: "No WhatsApp numbers found on your Meta account. Create one in Business Manager first.",
        token_exchange_failed: "Token exchange failed. Make sure your Meta App is set up correctly.",
        meta_denied: "Meta authorization was denied or cancelled.",
      };
      setToast({ ok: false, msg: msgs[error] ?? `Meta error: ${error}` });
      router.replace("/dashboard/integrations");
    } else if (selectFlag === "1" && phonesB64) {
      try {
        const decoded = JSON.parse(atob(phonesB64.replace(/-/g, "+").replace(/_/g, "/"))) as PhoneOption[];
        setPhoneOptions(decoded);
      } catch { /* ignore */ }
      router.replace("/dashboard/integrations");
    }
  }, [searchParams, router]);

  /* auto-hide toast after 6 seconds */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  function handleConnected(phone: string) {
    setWaStatus(s => ({ ...s, configured: !!phone, phoneNumber: phone }));
    if (phone) setToast({ ok: true, msg: `WhatsApp connected: ${phone}` });
  }

  const filtered = INTEGRATIONS.filter(
    i => !search || i.name.toLowerCase().includes(search.toLowerCase())
      || i.category.toLowerCase().includes(search.toLowerCase()),
  );
  const connectedCount = INTEGRATIONS.filter(i => live[i.key]?.connected).length + (waStatus.configured ? 1 : 0);

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      {/* Modals */}
      {manualModal && (
        <ManualModal status={waStatus} onClose={() => setManualModal(false)}
          onConnected={phone => { handleConnected(phone); if (phone) setManualModal(false); }} />
      )}
      {phoneOptions && (
        <PhoneSelectModal phones={phoneOptions} onClose={() => setPhoneOptions(null)} />
      )}
      {connectModalItem && (
        <ConnectModal item={connectModalItem} onClose={() => setConnectModalItem(null)} onConnected={handleConnectedIntegration} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-start gap-3 max-w-sm w-full px-4 py-3 rounded-xl shadow-xl"
          style={{ background: toast.ok ? "#f0fdf4" : "#fff1f2",
            border: `1px solid ${toast.ok ? "#bbf7d0" : "#fecdd3"}`,
            color: toast.ok ? "#15803d" : "#be123c" }}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <p className="text-sm flex-1">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Header title="Integrations" subtitle="Connect your stack to WhatsApp automation" />

      <div className="p-6 space-y-5">

        {/* ── WhatsApp Business hero ── */}
        <div className="bg-white rounded-2xl border overflow-hidden"
          style={{ borderColor: waStatus.configured ? "#bbf7d0" : "#e5e7eb" }}>
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl text-white flex-shrink-0"
              style={{ background: waStatus.configured ? "#16a34a" : "#9ca3af" }}>W</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-gray-900 text-base">WhatsApp Business</h2>
                {waStatus.configured
                  ? <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ background: "#dcfce7", color: "#16a34a" }}>
                      <Wifi className="w-3 h-3" /> Live
                    </span>
                  : <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: "#fef3c7", color: "#92400e" }}>Not connected</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {waStatus.configured
                  ? `Connected${waStatus.phoneNumber ? ` · ${waStatus.phoneNumber}` : ""}. Chatbots and automation are live.`
                  : "Connect your WhatsApp Business number to enable live messaging."}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {metaAppId ? (
                /* OAuth flow — redirect to Meta and come back */
                <a href="/api/meta/connect"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: "#1877f2" }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {waStatus.configured ? "Reconnect" : "Continue with Meta"}
                </a>
              ) : (
                /* No Meta App — show manual setup */
                <button onClick={() => setManualModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={waStatus.configured
                    ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }
                    : { background: "#16a34a", color: "#fff" }}>
                  <Wifi className="w-4 h-4" />
                  {waStatus.configured ? "Manage" : "Connect"}
                </button>
              )}
              {/* Also show manual option as secondary when OAuth is configured */}
              {metaAppId && (
                <button onClick={() => setManualModal(true)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Manual setup">
                  Manual
                </button>
              )}
            </div>
          </div>

          {/* Setup hint when not connected */}
          {!waStatus.configured && (
            <div className="px-6 pb-5 flex items-start gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-semibold text-white text-[10px] flex-shrink-0"
                  style={{ background: "#9ca3af" }}>1</span>
                Log in with Meta account
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-semibold text-white text-[10px] flex-shrink-0"
                  style={{ background: "#9ca3af" }}>2</span>
                Create or select Business Portfolio
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-semibold text-white text-[10px] flex-shrink-0"
                  style={{ background: "#9ca3af" }}>3</span>
                Choose existing WhatsApp number
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-semibold text-white text-[10px] flex-shrink-0"
                  style={{ background: "#9ca3af" }}>4</span>
                Auto-connected ✓
              </div>
            </div>
          )}

          {/* Not configured — show setup note */}
          {!metaAppId && !waStatus.configured && (
            <div className="px-6 pb-5 pt-0">
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  To enable one-click Meta OAuth, add <code className="font-mono bg-blue-100 px-1 rounded">META_APP_ID</code> and{" "}
                  <code className="font-mono bg-blue-100 px-1 rounded">META_APP_SECRET</code> to your{" "}
                  <code className="font-mono bg-blue-100 px-1 rounded">.env.local</code>.&nbsp;
                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer"
                    className="underline inline-flex items-center gap-0.5">
                    Create a Meta App <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Search + count ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search integrations…"
              className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-500 flex-shrink-0">
            <Plug className="w-4 h-4" />
            <span><strong className="text-gray-800">{connectedCount}</strong> connected</span>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(int => {
            const color = CAT_COLOR[int.category] ?? "#888";
            const backend = live[int.key];
            const connected = !!backend?.connected;
            const isDisconnecting = disconnectingKey === int.key;
            return (
              <div key={int.key}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg"
                    style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
                    {int.name.charAt(0)}
                  </div>
                  {connected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "#dcfce7", color: "#16a34a" }}>
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-800">{int.name}</h3>
                <span className="text-[11px] mt-0.5 font-medium" style={{ color }}>{int.category}</span>
                <p className="text-sm text-gray-500 mt-2 flex-1 leading-snug">{int.description}</p>
                {connected && backend?.accountLabel && (
                  <p className="text-[11px] text-green-700 mt-2 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 flex-shrink-0" /> {backend.accountLabel}
                  </p>
                )}
                <button
                  onClick={() => connected ? disconnectIntegration(int) : setConnectModalItem(int)}
                  disabled={isDisconnecting}
                  className="mt-4 w-full py-2 rounded-xl text-sm font-medium transition-colors border flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={connected
                    ? { background: "#fef2f2", borderColor: "#fecaca", color: "#ef4444" }
                    : { background: `${color}10`, borderColor: `${color}30`, color }}>
                  {isDisconnecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isDisconnecting ? "Disconnecting…" : (connected ? "Disconnect" : "Connect")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="min-h-full flex items-center justify-center" style={{ background: "#f8f9fa" }}><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
