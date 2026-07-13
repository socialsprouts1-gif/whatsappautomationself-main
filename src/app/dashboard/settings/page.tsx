"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Smartphone, Save, Globe, CheckCircle, AlertCircle, Bot, FlaskConical, Wifi } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Settings {
  businessName: string; businessEmail: string; website: string; whatsappNumber: string;
  autoReplyEnabled: boolean; sandboxMode: boolean;
}
interface SettingsResponse { settings: Settings; whatsappConfigured: boolean; webhookPath: string }

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-11 rounded-full transition-colors flex-shrink-0"
      style={{ height: 24, background: on ? "#16a34a" : "#d1d5db" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data, refetch } = useApi<SettingsResponse>("/api/settings");
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [waConnecting, setWaConnecting] = useState(false);
  const [waResult, setWaResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  async function patch(partial: Partial<Settings>) {
    if (!form) return;
    const next = { ...form, ...partial };
    setForm(next);
    await mutate("/api/settings", "PATCH", partial);
    refetch();
  }

  async function save() {
    if (!form) return;
    await mutate("/api/settings", "PATCH", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function connectWhatsApp() {
    if (!phoneId || !accessToken) return;
    setWaConnecting(true);
    setWaResult(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: phoneId,
          accessToken,
          verifyToken,
          businessAccountId,
        }),
      });
      const json = await res.json() as { ok: boolean; message: string };
      setWaResult({ ok: json.ok, message: json.message });
      if (json.ok) refetch();
    } finally {
      setWaConnecting(false);
    }
  }

  if (!form || !data) {
    return (
      <div className="min-h-full" style={{ background: "#f8f9fa" }}>
        <Header title="Settings" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Settings" subtitle="Account, WhatsApp connection and automation behaviour" />
      <div className="p-6 max-w-3xl space-y-5">

        {/* Connect WhatsApp Number — prominent */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-600" />
            Connect WhatsApp Number
          </h3>
          <p className="text-xs text-gray-400 mb-4">Enter your Meta Cloud API credentials to enable live WhatsApp messaging.</p>

          <div
            className="flex items-center gap-3 p-3 rounded-xl border mb-5"
            style={
              data.whatsappConfigured
                ? { background: "#f0fdf4", borderColor: "#bbf7d0" }
                : { background: "#fffbeb", borderColor: "#fde68a" }
            }
          >
            {data.whatsappConfigured
              ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
            <div className="text-sm">
              <div className="font-medium text-gray-800">
                {data.whatsappConfigured ? "Credentials detected — live mode available" : "No credentials set"}
              </div>
              <div className="text-xs text-gray-500">
                {data.whatsappConfigured
                  ? "Turn off sandbox mode below to send real messages."
                  : "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your environment, or enter them below."}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number ID</label>
              <input
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAxxxxxx..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Verify Token</label>
              <input
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Any secret string"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">WABA ID <span className="text-gray-400">(for templates)</span></label>
              <input
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                placeholder="WhatsApp Business Account ID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-400"
              />
            </div>
          </div>

          {waResult && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg mb-3 text-sm"
              style={{
                background: waResult.ok ? "#f0fdf4" : "#fff1f2",
                border: `1px solid ${waResult.ok ? "#bbf7d0" : "#fecdd3"}`,
                color: waResult.ok ? "#16a34a" : "#e11d48",
              }}
            >
              {waResult.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {waResult.message}
            </div>
          )}

          <button
            onClick={connectWhatsApp}
            disabled={waConnecting || !phoneId || !accessToken}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: "#16a34a" }}
          >
            {waConnecting ? "Connecting..." : "Connect"}
          </button>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1">Webhook URL</label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <code className="text-sm text-blue-600 font-mono">{`https://<your-domain>${data.webhookPath}`}</code>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Register this in Meta &rarr; WhatsApp &rarr; Configuration, subscribed to the &ldquo;messages&rdquo; field.
            </p>
          </div>
        </Card>

        {/* WhatsApp Cloud API status */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-500" />
            WhatsApp Cloud API
          </h3>
          <div className="space-y-3">
            {[
              { label: "Phone Number", value: form.whatsappNumber },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Automation */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-500" />
            Automation
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800">Auto-reply rules</div>
                <div className="text-xs text-gray-400">Run keyword chatbot rules on incoming messages.</div>
              </div>
              <Toggle on={form.autoReplyEnabled} onClick={() => patch({ autoReplyEnabled: !form.autoReplyEnabled })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                  Sandbox mode
                </div>
                <div className="text-xs text-gray-400">Simulate sends instead of calling the real Cloud API.</div>
              </div>
              <Toggle on={form.sandboxMode} onClick={() => patch({ sandboxMode: !form.sandboxMode })} />
            </div>
          </div>
        </Card>

        {/* Business profile */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-gray-500" />
            Business profile
          </h3>
          <div className="space-y-4">
            {([
              ["Business Name", "businessName"],
              ["Business Email", "businessEmail"],
              ["Website", "website"],
              ["WhatsApp Number", "whatsappNumber"],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  value={form[key] as string}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-green-400"
                />
              </div>
            ))}
          </div>
          <button
            onClick={save}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors mt-5"
            style={{ background: "#16a34a" }}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </Card>
      </div>
    </div>
  );
}
