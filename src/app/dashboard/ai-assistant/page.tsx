"use client";

import { useEffect, useState } from "react";
import { Bot, Save, Sparkles, MessagesSquare, Thermometer, UserCheck, Terminal } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface AiAssistantConfig {
  enabled: boolean;
  model: string;
  systemPrompt: string;
  temperature: number;
  tone: string;
  fallbackToHuman: boolean;
}
interface AiAssistantResponse { assistant: AiAssistantConfig }

const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "claude-3-5-sonnet"];
const TONE_OPTIONS = ["friendly", "professional", "concise", "playful"];

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

export default function AiAssistantPage() {
  const { data, refetch } = useApi<AiAssistantResponse>("/api/ai-assistant");
  const [form, setForm] = useState<AiAssistantConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data?.assistant) setForm(data.assistant); }, [data]);

  async function patch(partial: Partial<AiAssistantConfig>) {
    if (!form) return;
    const next = { ...form, ...partial };
    setForm(next);
    await mutate("/api/ai-assistant", "PATCH", partial);
    refetch();
  }

  async function save() {
    if (!form) return;
    await mutate("/api/ai-assistant", "PATCH", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!form || !data) {
    return (
      <div className="min-h-full" style={{ background: "#f8f9fa" }}>
        <Header title="AI Assistant" subtitle="Configure the AI that answers customers automatically" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="AI Assistant" subtitle="Configure the AI that answers customers automatically" />
      <div className="p-6 max-w-3xl space-y-5">

        {/* Enable */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">Enable AI Assistant</div>
                <div className="text-xs text-gray-400">
                  Automatically answer incoming WhatsApp messages using AI, based on the settings below.
                </div>
              </div>
            </div>
            <Toggle on={form.enabled} onClick={() => patch({ enabled: !form.enabled })} />
          </div>
        </Card>

        {/* Behaviour */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Behaviour
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-green-400"
                >
                  {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <MessagesSquare className="w-3 h-3" /> Tone
                </label>
                <select
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-green-400 capitalize"
                >
                  {TONE_OPTIONS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Thermometer className="w-3 h-3" /> Temperature
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  className="flex-1 accent-green-600"
                />
                <span className="text-sm font-semibold text-gray-700 w-10 text-right">{form.temperature.toFixed(1)}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Lower is more focused and deterministic; higher is more creative.</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                  Fallback to human when uncertain
                </div>
                <div className="text-xs text-gray-400">Hand off to a human agent if the AI isn&apos;t confident in its answer.</div>
              </div>
              <Toggle on={form.fallbackToHuman} onClick={() => patch({ fallbackToHuman: !form.fallbackToHuman })} />
            </div>
          </div>
        </Card>

        {/* System prompt */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-gray-500" />
            System prompt
          </h3>
          <p className="text-xs text-gray-400 mb-3">Instructions the assistant follows on every conversation.</p>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono text-gray-700 focus:outline-none focus:border-green-400 resize-none"
          />

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
