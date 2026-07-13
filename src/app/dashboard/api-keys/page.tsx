"use client";

import { useState } from "react";
import {
  Key, Plus, Eye, EyeOff, Copy, Check, Trash2, Ban, ShieldCheck, Terminal,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface ApiKeyRecord {
  id: string; name: string; key: string; createdAt: string; lastUsedAt?: string;
  scopes: string[]; revoked: boolean;
}

const METHOD_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  POST: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  PATCH: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  DELETE: { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
};

interface Endpoint { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; desc: string }
const ENDPOINT_GROUPS: { name: string; items: Endpoint[] }[] = [
  { name: "AI Assistant", items: [
    { method: "GET", path: "/api/ai-assistant", desc: "Fetch the AI assistant's current configuration" },
    { method: "PATCH", path: "/api/ai-assistant", desc: "Update the assistant's model, prompt, tone or temperature" },
  ]},
  { name: "Analytics", items: [
    { method: "GET", path: "/api/analytics", desc: "Aggregated message volume, delivery funnel, contact growth and top rules" },
  ]},
  { name: "API Keys", items: [
    { method: "GET", path: "/api/api-keys", desc: "List all API keys" },
    { method: "POST", path: "/api/api-keys", desc: "Generate a new API key" },
    { method: "PATCH", path: "/api/api-keys", desc: "Revoke an API key" },
    { method: "DELETE", path: "/api/api-keys", desc: "Permanently delete an API key" },
  ]},
  { name: "Automations", items: [
    { method: "GET", path: "/api/automations", desc: "List keyword-triggered automation rules" },
    { method: "POST", path: "/api/automations", desc: "Create a new automation rule" },
    { method: "PATCH", path: "/api/automations", desc: "Update an automation rule" },
    { method: "DELETE", path: "/api/automations", desc: "Delete an automation rule" },
    { method: "PATCH", path: "/api/automations/{id}", desc: "Update a single automation rule by ID" },
    { method: "DELETE", path: "/api/automations/{id}", desc: "Delete a single automation rule by ID" },
  ]},
  { name: "Billing", items: [
    { method: "GET", path: "/api/billing", desc: "Current plan, usage and invoice history" },
    { method: "POST", path: "/api/billing", desc: "Change subscription plan (simulated, no real payment)" },
  ]},
  { name: "Campaigns", items: [
    { method: "GET", path: "/api/campaigns", desc: "List broadcast campaigns" },
    { method: "POST", path: "/api/campaigns", desc: "Create a campaign as draft, scheduled, or send now" },
    { method: "POST", path: "/api/campaigns/{id}/send", desc: "Broadcast an existing campaign now" },
  ]},
  { name: "Canned Messages", items: [
    { method: "GET", path: "/api/canned-messages", desc: "List saved quick-reply snippets" },
    { method: "POST", path: "/api/canned-messages", desc: "Create a canned message" },
    { method: "PATCH", path: "/api/canned-messages", desc: "Update a canned message" },
    { method: "DELETE", path: "/api/canned-messages", desc: "Delete a canned message" },
  ]},
  { name: "Chatbots", items: [
    { method: "GET", path: "/api/chatbots", desc: "List chatbot flows" },
    { method: "POST", path: "/api/chatbots", desc: "Create a chatbot flow" },
    { method: "GET", path: "/api/chatbots/{id}", desc: "Get a single chatbot" },
    { method: "PATCH", path: "/api/chatbots/{id}", desc: "Update a chatbot" },
    { method: "DELETE", path: "/api/chatbots/{id}", desc: "Delete a chatbot" },
  ]},
  { name: "Columns", items: [
    { method: "GET", path: "/api/columns", desc: "List custom CRM board columns" },
    { method: "POST", path: "/api/columns", desc: "Create a column" },
    { method: "DELETE", path: "/api/columns", desc: "Delete a column" },
  ]},
  { name: "Commerce — Orders", items: [
    { method: "GET", path: "/api/commerce/orders", desc: "List store orders" },
    { method: "POST", path: "/api/commerce/orders", desc: "Create an order" },
    { method: "PATCH", path: "/api/commerce/orders", desc: "Update an order's status" },
  ]},
  { name: "Commerce — Products", items: [
    { method: "GET", path: "/api/commerce/products", desc: "List catalog products" },
    { method: "POST", path: "/api/commerce/products", desc: "Create a product" },
    { method: "PATCH", path: "/api/commerce/products", desc: "Update a product" },
    { method: "DELETE", path: "/api/commerce/products", desc: "Delete a product" },
  ]},
  { name: "Contacts", items: [
    { method: "GET", path: "/api/contacts", desc: "List CRM contacts" },
    { method: "POST", path: "/api/contacts", desc: "Create a contact" },
    { method: "PATCH", path: "/api/contacts", desc: "Update a contact's status, tags or attributes" },
    { method: "DELETE", path: "/api/contacts", desc: "Delete a contact" },
  ]},
  { name: "Conversations", items: [
    { method: "GET", path: "/api/conversations", desc: "List inbox conversations" },
    { method: "GET", path: "/api/conversations/{id}", desc: "Get a single conversation thread" },
    { method: "POST", path: "/api/conversations/{id}", desc: "Send a manual reply from the team inbox" },
  ]},
  { name: "Cron", items: [
    { method: "GET", path: "/api/cron/process", desc: "Process due scheduled drip-flow jobs" },
    { method: "POST", path: "/api/cron/process", desc: "Process due scheduled drip-flow jobs" },
  ]},
  { name: "FAQ Bot", items: [
    { method: "GET", path: "/api/faq-bot", desc: "List auto-answer FAQ entries" },
    { method: "POST", path: "/api/faq-bot", desc: "Create an FAQ entry" },
    { method: "PATCH", path: "/api/faq-bot", desc: "Update an FAQ entry" },
    { method: "DELETE", path: "/api/faq-bot", desc: "Delete an FAQ entry" },
  ]},
  { name: "Flows", items: [
    { method: "GET", path: "/api/flows", desc: "List multi-step drip message flows" },
    { method: "POST", path: "/api/flows", desc: "Create a flow" },
    { method: "PATCH", path: "/api/flows", desc: "Update a flow" },
  ]},
  { name: "Forms", items: [
    { method: "GET", path: "/api/forms", desc: "List WhatsApp forms" },
    { method: "POST", path: "/api/forms", desc: "Create a form" },
    { method: "GET", path: "/api/forms/{id}", desc: "Get a form and its submissions" },
    { method: "PATCH", path: "/api/forms/{id}", desc: "Update a form" },
    { method: "DELETE", path: "/api/forms/{id}", desc: "Delete a form" },
  ]},
  { name: "Gallery", items: [
    { method: "GET", path: "/api/gallery", desc: "List uploaded media files" },
    { method: "POST", path: "/api/gallery", desc: "Upload a media file" },
  ]},
  { name: "Groups", items: [
    { method: "GET", path: "/api/groups", desc: "List WhatsApp contact groups" },
    { method: "POST", path: "/api/groups", desc: "Create a group" },
    { method: "PATCH", path: "/api/groups", desc: "Update a group" },
    { method: "DELETE", path: "/api/groups", desc: "Delete a group" },
  ]},
  { name: "Integrations", items: [
    { method: "GET", path: "/api/integrations", desc: "List connected third-party integrations" },
    { method: "PATCH", path: "/api/integrations", desc: "Enable, disable or reconfigure an integration" },
  ]},
  { name: "Meta (Facebook OAuth)", items: [
    { method: "GET", path: "/api/meta/connect", desc: "Start the Meta OAuth flow for WhatsApp Embedded Signup" },
    { method: "GET", path: "/api/meta/callback", desc: "Handle Meta's OAuth redirect and auto-save WhatsApp credentials" },
    { method: "POST", path: "/api/meta/select", desc: "Choose a WhatsApp number when multiple are available after OAuth" },
    { method: "GET", path: "/api/meta/status", desc: "Check whether a Meta App ID is configured" },
  ]},
  { name: "Organizations", items: [
    { method: "GET", path: "/api/organizations", desc: "List organizations and their members" },
    { method: "POST", path: "/api/organizations", desc: "Add a member, or update org name/plan" },
    { method: "PATCH", path: "/api/organizations", desc: "Change a member's role" },
    { method: "DELETE", path: "/api/organizations", desc: "Remove a member from an organization" },
  ]},
  { name: "Overview", items: [
    { method: "GET", path: "/api/overview", desc: "Summary payload for the main dashboard" },
  ]},
  { name: "Reminders", items: [
    { method: "GET", path: "/api/reminders", desc: "List scheduled reminders" },
    { method: "POST", path: "/api/reminders", desc: "Create a reminder" },
    { method: "PATCH", path: "/api/reminders", desc: "Update a reminder" },
    { method: "DELETE", path: "/api/reminders", desc: "Delete a reminder" },
  ]},
  { name: "Settings", items: [
    { method: "GET", path: "/api/settings", desc: "Get business profile and automation settings" },
    { method: "PATCH", path: "/api/settings", desc: "Update business profile or automation toggles" },
    { method: "POST", path: "/api/settings", desc: "Save WhatsApp Cloud API credentials" },
  ]},
  { name: "Support", items: [
    { method: "GET", path: "/api/support", desc: "List support tickets" },
    { method: "POST", path: "/api/support", desc: "Create a support ticket" },
    { method: "GET", path: "/api/support/{id}", desc: "Get a single support ticket" },
    { method: "PATCH", path: "/api/support/{id}", desc: "Reply to or update a support ticket" },
  ]},
  { name: "Tags", items: [
    { method: "GET", path: "/api/tags", desc: "List contact tags" },
    { method: "POST", path: "/api/tags", desc: "Create a tag" },
    { method: "DELETE", path: "/api/tags", desc: "Delete a tag" },
  ]},
  { name: "Templates", items: [
    { method: "GET", path: "/api/templates", desc: "List WhatsApp message templates" },
    { method: "POST", path: "/api/templates", desc: "Submit a new template for approval" },
  ]},
  { name: "Transactions", items: [
    { method: "GET", path: "/api/transactions", desc: "List payment/order transactions" },
    { method: "POST", path: "/api/transactions", desc: "Record a transaction" },
  ]},
  { name: "Webhook Events", items: [
    { method: "GET", path: "/api/webhook-events", desc: "View the inbound webhook event log" },
    { method: "POST", path: "/api/webhook-events", desc: "Fire a simulated test event" },
  ]},
  { name: "WhatsApp", items: [
    { method: "POST", path: "/api/whatsapp/send", desc: "Send a WhatsApp message via the Cloud API" },
    { method: "POST", path: "/api/whatsapp/simulate", desc: "Simulate an inbound WhatsApp message for testing" },
    { method: "GET", path: "/api/whatsapp/webhook", desc: "Meta's webhook verification handshake" },
    { method: "POST", path: "/api/whatsapp/webhook", desc: "Receive incoming messages and status updates from Meta" },
  ]},
];

function timeAgo(iso?: string): string {
  if (!iso) return "Never used";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function KeyRow({ k, onRevoke, onDelete }: {
  k: ApiKeyRecord; onRevoke: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const masked = `${k.key.slice(0, 12)}••••••••`;

  function copy() {
    navigator.clipboard.writeText(k.key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
      <div className="col-span-2 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{k.name}</div>
        {k.revoked && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5"
            style={{ background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }}>
            Revoked
          </span>
        )}
      </div>
      <div className="col-span-4 flex items-center gap-1.5 min-w-0">
        <code className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 truncate">
          {revealed ? k.key : masked}
        </code>
        <button onClick={() => setRevealed((r) => !r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0" title={revealed ? "Hide key" : "Reveal key"}>
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button onClick={copy} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0" title="Copy key">
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="col-span-2 flex flex-wrap gap-1">
        {k.scopes.map((s) => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 capitalize">{s}</span>
        ))}
      </div>
      <div className="col-span-1 text-xs text-gray-400">{fmtDate(k.createdAt)}</div>
      <div className="col-span-1 text-xs text-gray-400">{timeAgo(k.lastUsedAt)}</div>
      <div className="col-span-2 flex items-center justify-end gap-1.5">
        {!k.revoked && (
          <button onClick={() => onRevoke(k.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ color: "#d97706", borderColor: "#fde68a", background: "#fffbeb" }}>
            <Ban className="w-3 h-3" /> Revoke
          </button>
        )}
        <button onClick={() => { if (confirm(`Permanently delete key "${k.name}"? This cannot be undone.`)) onDelete(k.id); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Delete permanently">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const { data, refetch } = useApi<{ keys: ApiKeyRecord[] }>("/api/api-keys");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: { read: true, write: false } });
  const [newKey, setNewKey] = useState<ApiKeyRecord | null>(null);
  const [bannerCopied, setBannerCopied] = useState(false);

  const keys = data?.keys ?? [];

  async function create() {
    if (!form.name) return;
    const scopes = Object.entries(form.scopes).filter(([, on]) => on).map(([s]) => s);
    const res = await mutate<{ ok: boolean; key: ApiKeyRecord }>("/api/api-keys", "POST", {
      name: form.name, scopes: scopes.length ? scopes : ["read"],
    });
    if (res.ok) setNewKey(res.key);
    setForm({ name: "", scopes: { read: true, write: false } });
    setCreating(false);
    refetch();
  }

  async function revoke(id: string) {
    await mutate("/api/api-keys", "PATCH", { id });
    refetch();
  }

  async function del(id: string) {
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    refetch();
  }

  function copyNewKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.key).catch(() => {});
    setBannerCopied(true);
    setTimeout(() => setBannerCopied(false), 1500);
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="API Endpoints" subtitle="Manage API keys and explore available endpoints" />
      <div className="p-6 space-y-8">

        {/* Section 1: API Keys */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" /> API Keys
            </h2>
            <button onClick={() => setCreating((c) => !c)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Generate new key
            </button>
          </div>

          {newKey && (
            <div className="bg-white rounded-xl border-2 p-4" style={{ borderColor: "#16a34a" }}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-800">Key generated: {newKey.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <code className="text-sm font-mono text-gray-700 flex-1 break-all">{newKey.key}</code>
                <button onClick={copyNewKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 flex-shrink-0">
                  {bannerCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {bannerCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Copy this key now — for your security we won&apos;t show it in full again after you navigate away.
              </p>
              <button onClick={() => setNewKey(null)} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
                Dismiss
              </button>
            </div>
          )}

          {creating && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">New API key</h3>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Key name, e.g. Production server"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={form.scopes.read}
                    onChange={(e) => setForm({ ...form, scopes: { ...form.scopes, read: e.target.checked } })}
                    className="rounded border-gray-300" />
                  Read
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={form.scopes.write}
                    onChange={(e) => setForm({ ...form, scopes: { ...form.scopes, write: e.target.checked } })}
                    className="rounded border-gray-300" />
                  Write
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={create} disabled={!form.name}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                  Generate
                </button>
                <button onClick={() => setCreating(false)}
                  className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              {["Name", "Key", "Scopes", "Created", "Last used", ""].map((h, i) => (
                <div key={i} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                  i === 0 ? "col-span-2" : i === 1 ? "col-span-4" : i === 2 ? "col-span-2" : i === 3 ? "col-span-1" : i === 4 ? "col-span-1" : "col-span-2"
                }`}>{h}</div>
              ))}
            </div>
            {keys.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No API keys yet.</div>
            ) : (
              keys.map((k) => <KeyRow key={k.id} k={k} onRevoke={revoke} onDelete={del} />)
            )}
          </div>
        </div>

        {/* Section 2: Available Endpoints */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500" /> Available Endpoints
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Method</div>
              <div className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Path</div>
              <div className="col-span-6 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Description</div>
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              {ENDPOINT_GROUPS.map((group) => (
                <div key={group.name}>
                  <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    {group.name}
                  </div>
                  {group.items.map((ep, idx) => {
                    const st = METHOD_STYLE[ep.method];
                    return (
                      <div key={`${group.name}-${idx}`} className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                            {ep.method}
                          </span>
                        </div>
                        <div className="col-span-4">
                          <code className="text-xs font-mono text-gray-700">{ep.path}</code>
                        </div>
                        <div className="col-span-6 text-xs text-gray-500">{ep.desc}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
