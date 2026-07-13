"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send, Bot, Sparkles, Phone, RefreshCw, Search, CheckCheck,
  MoreVertical, Paperclip, Smile, User,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { mutate } from "@/lib/use-api";

interface Contact { id: string; name: string; phone: string; status: string }
interface Conversation {
  id: string;
  contactId: string;
  unread: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  contact?: Contact;
}
interface Message {
  id: string;
  direction: "in" | "out";
  text: string;
  status: string;
  timestamp: string;
  via?: string;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const statusIcon = (status: string) => {
  if (status === "read") return <CheckCheck className="w-3 h-3 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="w-3 h-3 text-gray-400" />;
  return <CheckCheck className="w-3 h-3 text-gray-300" />;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [reply, setReply] = useState("");
  const [simText, setSimText] = useState("hello");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const json = await fetch("/api/conversations").then((r) => r.json());
    setConversations(json.conversations ?? []);
    setActiveId((cur) => cur ?? json.conversations?.[0]?.id ?? null);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const json = await fetch(`/api/conversations/${id}`).then((r) => r.json());
    setMessages(json.messages ?? []);
    setContact(json.contact ?? null);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (activeId) loadThread(activeId); }, [activeId, loadThread]);

  // Poll every 3s for live updates
  useEffect(() => {
    const t = setInterval(() => {
      loadConversations();
      if (activeId) loadThread(activeId);
    }, 3000);
    return () => clearInterval(t);
  }, [activeId, loadConversations, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!reply.trim() || !activeId) return;
    setSending(true);
    await mutate(`/api/conversations/${activeId}`, "POST", { text: reply });
    setReply("");
    await loadThread(activeId);
    setSending(false);
  }

  async function simulateInbound() {
    if (!contact || !simText.trim()) return;
    setSending(true);
    await mutate("/api/whatsapp/simulate", "POST", {
      phone: contact.phone,
      name: contact.name,
      text: simText,
    });
    await new Promise((r) => setTimeout(r, 400));
    if (activeId) await loadThread(activeId);
    await loadConversations();
    setSending(false);
  }

  const filtered = conversations.filter((c) =>
    !search || c.contact?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div style={{ background: "#f8f9fa" }} className="h-full flex flex-col">
      <Header title="Inbox" subtitle="Live WhatsApp conversations" />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Conversation list ── */}
        <div
          className="w-80 flex-shrink-0 flex flex-col min-h-0"
          style={{ background: "#fff", borderRight: "1px solid #e5e7eb" }}
        >
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="flex-1 text-xs text-gray-600 bg-transparent focus:outline-none"
              />
              <button
                onClick={loadConversations}
                className="text-gray-400 hover:text-gray-600"
                title="Refresh"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-xs text-gray-400">
                No conversations yet.<br />
                Simulate a message using the panel on the right.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="w-full text-left px-4 py-3 border-b border-gray-50 transition-colors"
                style={{
                  background: activeId === c.id ? "#eff6ff" : "transparent",
                  borderLeft: activeId === c.id ? "3px solid #3b82f6" : "3px solid transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "#3b82f6" }}
                  >
                    {c.contact?.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {c.contact?.name ?? "Unknown"}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {timeAgo(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-xs text-gray-400 truncate">{c.lastMessagePreview}</span>
                      {c.unread > 0 && (
                        <span
                          className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                          style={{ background: "#3b82f6" }}
                        >
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat thread ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {contact ? (
            <>
              {/* Thread header */}
              <div
                className="px-5 py-3 flex items-center gap-3"
                style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "#3b82f6" }}
                >
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{contact.name}</div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> +{contact.phone}
                  </div>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full font-medium"
                  style={{
                    background: contact.status === "customer" ? "#f0fdf4" : "#eff6ff",
                    color: contact.status === "customer" ? "#16a34a" : "#3b82f6",
                    border: `1px solid ${contact.status === "customer" ? "#bbf7d0" : "#bfdbfe"}`,
                  }}
                >
                  {contact.status}
                </span>
                <button className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-3"
                style={{ background: "#f8f9fa" }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
                  >
                    {m.direction === "in" && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mr-2 flex-shrink-0 self-end"
                        style={{ background: "#64748b" }}
                      >
                        {contact.name.charAt(0)}
                      </div>
                    )}
                    <div
                      className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                      style={{
                        background: m.direction === "out" ? "#3b82f6" : "#fff",
                        color: m.direction === "out" ? "#fff" : "#1f2937",
                        borderRadius:
                          m.direction === "out"
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                        border: m.direction === "in" ? "1px solid #e5e7eb" : "none",
                      }}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      <div
                        className={`flex items-center gap-1.5 mt-1 text-[10px] ${
                          m.direction === "out" ? "text-blue-100 justify-end" : "text-gray-400"
                        }`}
                      >
                        {m.via === "automation" && (
                          <span className="flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> bot
                          </span>
                        )}
                        {m.via === "flow" && (
                          <span className="flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> chatbot
                          </span>
                        )}
                        <span>{formatTime(m.timestamp)}</span>
                        {m.direction === "out" && statusIcon(m.status)}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-8">
                    No messages yet. Simulate an inbound message below.
                  </div>
                )}
              </div>

              {/* Composer */}
              <div
                className="border-t p-3 space-y-2"
                style={{ background: "#fff", borderColor: "#e5e7eb" }}
              >
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                    <Smile className="w-4 h-4" />
                  </button>
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                    placeholder="Type a message..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors disabled:opacity-40"
                    style={{ background: "#3b82f6" }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                {/* Simulate inbound */}
                <div
                  className="flex items-center gap-2 pt-1 border-t"
                  style={{ borderColor: "#f3f4f6" }}
                >
                  <span className="text-[11px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <User className="w-3 h-3" /> Simulate customer:
                  </span>
                  <input
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && simulateInbound()}
                    placeholder="e.g. hello, menu, price..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-300 bg-gray-50"
                  />
                  <button
                    onClick={simulateInbound}
                    disabled={sending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 disabled:opacity-40 flex-shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircleIcon />
              <p className="text-sm mt-3">Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageCircleIcon() {
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{ background: "#eff6ff" }}
    >
      <Send className="w-7 h-7 text-blue-400" />
    </div>
  );
}
