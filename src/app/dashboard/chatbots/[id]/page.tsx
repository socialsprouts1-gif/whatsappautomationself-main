"use client";

import React, {
  useCallback, useContext, useEffect, useMemo, useState, use, useRef,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, Handle, Position, MarkerType,
  type Connection, type Node, type Edge, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Search, MessageSquare, Clock, GitBranch, List,
  Image, Link, Package, MapPin, HelpCircle, Table, Tag, UserSearch,
  StopCircle, Bot, Globe, Sheet, Save, CheckCircle, Layout,
  Zap, Trash2, Plus, ChevronDown, ChevronRight, Play, X,
} from "lucide-react";

/* ── Theme ─────────────────────────────────────────────────────────────── */

const C = {
  bg:     "#0d0d14",
  side:   "#0a0a12",
  node:   "#1a1a27",
  hdr:    "#0f0f1c",
  bdr:    "#25253a",
  inp:    "#0d0d1a",
  inBdr:  "#2a2a3e",
  text:   "#e8eaf0",
  sub:    "#7c85a2",
  dim:    "#3d4258",
  orange: "#f97316",
  green:  "#22c55e",
  blue:   "#3b82f6",
  purple: "#9333ea",
  red:    "#ef4444",
  teal:   "#14b8a6",
  amber:  "#f59e0b",
  pink:   "#ec4899",
  indigo: "#6366f1",
  violet: "#7c3aed",
};

/* ── Context ────────────────────────────────────────────────────────────── */

interface ICtx {
  patch: (nodeId: string, field: string, value: unknown) => void;
  del:   (nodeId: string) => void;
}
const Ctx = React.createContext<ICtx>({ patch: () => {}, del: () => {} });

/* ── Action catalogue ───────────────────────────────────────────────────── */

const ACTIONS = [
  { icon: Clock,        label: "Delay",                  type: "delay",    color: C.orange },
  { icon: GitBranch,    label: "Condition",              type: "condition",color: C.indigo },
  { icon: MessageSquare,label: "Send Text Message",      type: "text",     color: C.blue   },
  { icon: Layout,       label: "Send Button Message",    type: "button",   color: C.purple },
  { icon: List,         label: "Send List Message",      type: "list",     color: C.teal   },
  { icon: HelpCircle,   label: "Ask Question",           type: "question", color: C.amber  },
  { icon: Image,        label: "Send Media Message",     type: "media",    color: C.pink   },
  { icon: Link,         label: "Send CTA Message",       type: "cta",      color: "#06b6d4"},
  { icon: Package,      label: "Send Product Message",   type: "product",  color: "#84cc16"},
  { icon: MapPin,       label: "Ask Location",           type: "location", color: C.orange },
  { icon: Table,        label: "Update Columns",         type: "columns",  color: C.blue   },
  { icon: Tag,          label: "Update Tag",             type: "tag",      color: "#a78bfa"},
  { icon: UserSearch,   label: "Fetch Contact",          type: "fetch",    color: C.teal   },
  { icon: StopCircle,   label: "Stop Chatbot",           type: "stop",     color: C.red    },
  { icon: Bot,          label: "AI Agent",               type: "ai",       color: C.violet },
  { icon: Globe,        label: "HTTP Request",           type: "http",     color: C.sub    },
  { icon: Sheet,        label: "Append to Google Sheet", type: "sheet",    color: C.green  },
] as const;

/* ── Primitive form widgets ─────────────────────────────────────────────── */

type IconComp = React.FC<{ className?: string; style?: React.CSSProperties }>;

const IS = { background: C.inp, border: `1px solid ${C.inBdr}`, color: C.text } as const;

function DI({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="nodrag nopan w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
      style={IS} />
  );
}

function DTA({ value, onChange, placeholder, rows = 3, maxLen }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; maxLen?: number;
}) {
  return (
    <div>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} maxLength={maxLen}
        className="nodrag nopan nowheel w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none resize-none"
        style={IS} />
      {maxLen !== undefined && (
        <p className="text-[10px] text-right mt-0.5" style={{ color: C.dim }}>
          {value.length}/{maxLen}
        </p>
      )}
    </div>
  );
}

function DSel({ value, onChange, opts }: {
  value: string; onChange: (v: string) => void;
  opts: { v: string; l: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="nodrag nopan w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
      style={IS}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function DTog({ on, onChange, label }: {
  on: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <div className="nodrag nopan flex items-center justify-between">
      {label && <span className="text-xs" style={{ color: C.sub }}>{label}</span>}
      <button onClick={() => onChange(!on)}
        className="relative rounded-full transition-colors flex-shrink-0"
        style={{ width: 34, height: 18, background: on ? C.orange : C.bdr }}>
        <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all"
          style={{ left: on ? "calc(100% - 16px)" : "2px" }} />
      </button>
    </div>
  );
}

function FL({ children }: { children: React.ReactNode }) {
  return <p className="text-xs mb-1" style={{ color: C.sub }}>{children}</p>;
}

/* ── Keyword tags ────────────────────────────────────────────────────────── */

function KWTags({ nodeId, value }: { nodeId: string; value: string[] }) {
  const { patch } = useContext(Ctx);
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const items = raw.split(",").map(s => s.trim()).filter(s => s && !value.includes(s));
    if (items.length) patch(nodeId, "keywords", [...value, ...items]);
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(draft); setDraft(""); }
  }
  function remove(k: string) { patch(nodeId, "keywords", value.filter(kw => kw !== k)); }

  return (
    <div className="nodrag nopan nowheel">
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-[20px]">
        {value.map(k => (
          <span key={k} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px]"
            style={{ background: "#1e1e30", border: `1px solid ${C.bdr}`, color: "#b0bcd4" }}>
            {k}
            <button onClick={() => remove(k)} className="ml-0.5 hover:text-red-400"
              style={{ color: C.sub }}>×</button>
          </span>
        ))}
      </div>
      <input
        className="nodrag nopan w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
        style={IS} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey}
        onBlur={() => { if (draft.trim()) { commit(draft); setDraft(""); } }}
        placeholder="Add keyword…" />
      <p className="text-[10px] mt-0.5" style={{ color: C.dim }}>Enter or comma to add</p>
    </div>
  );
}

/* ── Node shell ───────────────────────────────────────────────────────────── */

function NS({
  id, Icon, label, color, selected, src = 1, noTgt = false, children,
}: {
  id: string; Icon: IconComp; label: string; color: string;
  selected: boolean; src?: 0 | 1 | 2; noTgt?: boolean;
  children: React.ReactNode;
}) {
  const { del } = useContext(Ctx);
  return (
    <div style={{
      background: C.node, borderRadius: 12, minWidth: 260, maxWidth: 300,
      border: `1px solid ${selected ? color : C.bdr}`,
      boxShadow: selected ? `0 0 0 2px ${color}33` : "0 4px 14px rgba(0,0,0,0.5)",
    }}>
      {!noTgt && (
        <Handle type="target" position={Position.Left}
          style={{ background: C.dim, border: `2px solid ${C.bdr}`, width: 10, height: 10 }} />
      )}
      {/* header — stays draggable */}
      <div style={{ background: C.hdr, borderBottom: `1px solid ${C.bdr}`, borderRadius: "12px 12px 0 0" }}
        className="px-3 py-2.5 flex items-center gap-2">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
        <span className="text-sm font-semibold flex-1 truncate" style={{ color: C.text }}>{label}</span>
        <button onClick={() => del(id)} className="nodrag nopan p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: C.dim }}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {/* body — nodrag so inputs work */}
      <div className="nodrag nopan nowheel p-3 space-y-2.5">
        {children}
      </div>
      {src === 1 && (
        <Handle type="source" position={Position.Right}
          style={{ background: color, border: "none", width: 10, height: 10 }} />
      )}
      {src === 2 && (
        <>
          <Handle type="source" id="yes" position={Position.Right}
            style={{ background: C.green, border: "none", width: 10, height: 10, top: "55%" }} />
          <Handle type="source" id="no" position={Position.Right}
            style={{ background: C.red, border: "none", width: 10, height: 10, top: "75%" }} />
        </>
      )}
    </div>
  );
}

/* ── Node components (all module-level — React never remounts them) ──────── */

function TriggerNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  const kws: string[] = Array.isArray(data.keywords)
    ? (data.keywords as string[])
    : (typeof data.keywords === "string" && data.keywords
        ? String(data.keywords).split(",").map(s => s.trim()).filter(Boolean)
        : []);
  return (
    <NS id={id} Icon={Zap as IconComp} label="On Message" color={C.orange} selected={!!selected} noTgt>
      <div><FL>Message Type</FL>
        <DSel value={String(data.messageType ?? "text")} onChange={v => patch(id, "messageType", v)}
          opts={[{ v: "text", l: "Text" }, { v: "any", l: "Any message" }, { v: "media", l: "Media only" }]} />
      </div>
      <div><FL>Keywords</FL><KWTags nodeId={id} value={kws} /></div>
      <DTog on={!!data.fuzzyMatch} onChange={v => patch(id, "fuzzyMatch", v)} label="Enable Fuzzy Matching" />
      <div><FL>Phone Numbers</FL>
        <DI value={String(data.phoneFilter ?? "")} onChange={v => patch(id, "phoneFilter", v)} placeholder="All numbers (leave blank)" />
      </div>
    </NS>
  );
}

function TextNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={MessageSquare as IconComp} label="Send Text Message" color={C.blue} selected={!!selected}>
      <div><FL>Message</FL>
        <DTA value={String(data.text ?? "")} onChange={v => patch(id, "text", v)}
          placeholder="Type your message…" rows={5} maxLen={1024} />
      </div>
    </NS>
  );
}

function ButtonNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  const btns = Array.isArray(data.buttons) ? (data.buttons as string[]) : ["Option 1", "Option 2", ""];
  return (
    <NS id={id} Icon={Layout as IconComp} label="Send Button Message" color={C.purple} selected={!!selected}>
      <div><FL>Header Type</FL>
        <DSel value={String(data.headerType ?? "none")} onChange={v => patch(id, "headerType", v)}
          opts={[{ v: "none", l: "None" }, { v: "text", l: "Text" }, { v: "image", l: "Image" }]} />
      </div>
      <div><FL>Body Text</FL>
        <DTA value={String(data.body ?? "")} onChange={v => patch(id, "body", v)}
          placeholder="Choose an option:" maxLen={1024} />
      </div>
      <div><FL>Buttons (up to 3)</FL>
        <div className="space-y-1.5">
          {[0, 1, 2].map(i => (
            <DI key={i} value={btns[i] ?? ""} placeholder={`Button ${i + 1}`}
              onChange={v => { const u = [...btns]; u[i] = v; patch(id, "buttons", u); }} />
          ))}
        </div>
      </div>
      <div><FL>Footer (optional)</FL>
        <DI value={String(data.footer ?? "")} onChange={v => patch(id, "footer", v)} placeholder="Optional footer" />
      </div>
    </NS>
  );
}

interface LRow { id: string; title: string; description: string }
interface LSec { title: string; rows: LRow[] }
const DEF_SEC: LSec = { title: "", rows: [{ id: "r0", title: "", description: "" }] };

function ListNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  const secs: LSec[] = Array.isArray(data.sections) ? (data.sections as LSec[]) : [DEF_SEC];

  function pSec(si: number, u: Partial<LSec>) {
    patch(id, "sections", secs.map((s, i) => i === si ? { ...s, ...u } : s));
  }
  function pRow(si: number, ri: number, u: Partial<LRow>) {
    patch(id, "sections", secs.map((s, i) => i === si
      ? { ...s, rows: s.rows.map((r, j) => j === ri ? { ...r, ...u } : r) } : s));
  }
  function addRow(si: number) {
    patch(id, "sections", secs.map((s, i) => i === si
      ? { ...s, rows: [...s.rows, { id: `r${Date.now()}`, title: "", description: "" }] } : s));
  }

  return (
    <NS id={id} Icon={List as IconComp} label="Send List Message" color={C.teal} selected={!!selected}>
      <div><FL>Header Type</FL>
        <DSel value={String(data.headerType ?? "none")} onChange={v => patch(id, "headerType", v)}
          opts={[{ v: "none", l: "None" }, { v: "text", l: "Text" }]} />
      </div>
      <div><FL>Body Text</FL>
        <DTA value={String(data.body ?? "")} onChange={v => patch(id, "body", v)}
          placeholder="How can we help you today?" rows={3} maxLen={1024} />
      </div>
      <div><FL>Button Text</FL>
        <DI value={String(data.buttonText ?? "View Options")} onChange={v => patch(id, "buttonText", v)} placeholder="View Options" />
      </div>
      {secs.map((sec, si) => (
        <div key={si} className="rounded-lg p-2 space-y-1.5" style={{ border: `1px solid ${C.bdr}` }}>
          <div><FL>Section Title</FL>
            <DI value={sec.title} onChange={v => pSec(si, { title: v })} placeholder="Section Title" />
          </div>
          {sec.rows.map((row, ri) => (
            <div key={row.id} className="space-y-1">
              <DI value={row.title} onChange={v => pRow(si, ri, { title: v })} placeholder="Row Title" />
              <DI value={row.description} onChange={v => pRow(si, ri, { description: v })} placeholder="Row Description (Optional)" />
            </div>
          ))}
          <button onClick={() => addRow(si)} className="nodrag nopan flex items-center gap-1 text-[11px] mt-1"
            style={{ color: C.teal }}>
            <Plus className="w-3 h-3" /> Add Row
          </button>
        </div>
      ))}
    </NS>
  );
}

function QuestionNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={HelpCircle as IconComp} label="Ask Question" color={C.amber} selected={!!selected}>
      <div><FL>Question Text</FL>
        <DTA value={String(data.text ?? "")} onChange={v => patch(id, "text", v)}
          placeholder="What is your name?" maxLen={1024} />
      </div>
      <div><FL>Save answer to variable</FL>
        <DI value={String(data.variable ?? "")} onChange={v => patch(id, "variable", v)} placeholder="e.g. customer_name" />
      </div>
    </NS>
  );
}

function DelayNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={Clock as IconComp} label="Delay" color={C.orange} selected={!!selected}>
      <div><FL>Wait (minutes)</FL>
        <DI type="number" value={String(data.delay ?? "1")} onChange={v => patch(id, "delay", v)} placeholder="1" />
      </div>
    </NS>
  );
}

function ConditionNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={GitBranch as IconComp} label="Condition" color={C.indigo} selected={!!selected} src={2}>
      <div><FL>Condition Type</FL>
        <DSel value={String(data.conditionType ?? "contains")} onChange={v => patch(id, "conditionType", v)}
          opts={[
            { v: "contains", l: "Message contains" },
            { v: "equals",   l: "Message equals"   },
            { v: "attribute",l: "Contact attribute" },
          ]} />
      </div>
      <div><FL>Value</FL>
        <DI value={String(data.conditionValue ?? "")} onChange={v => patch(id, "conditionValue", v)} placeholder="e.g. yes, 1, paid" />
      </div>
      <div className="flex gap-4 text-[10px]" style={{ color: C.dim }}>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: C.green }} />Yes</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: C.red }} />No</span>
      </div>
    </NS>
  );
}

function StopNode({ id, selected }: NodeProps) {
  return (
    <NS id={id} Icon={StopCircle as IconComp} label="Stop Chatbot" color={C.red} selected={!!selected} src={0}>
      <p className="text-xs" style={{ color: C.sub }}>Ends the conversation flow.</p>
    </NS>
  );
}

function MediaNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={Image as IconComp} label="Send Media Message" color={C.pink} selected={!!selected}>
      <div><FL>Media Type</FL>
        <DSel value={String(data.mediaType ?? "image")} onChange={v => patch(id, "mediaType", v)}
          opts={[{ v: "image", l: "Image" }, { v: "video", l: "Video" }, { v: "document", l: "Document" }]} />
      </div>
      <div><FL>Media URL</FL>
        <DI value={String(data.url ?? "")} onChange={v => patch(id, "url", v)} placeholder="https://…" />
      </div>
      <div><FL>Caption (optional)</FL>
        <DI value={String(data.caption ?? "")} onChange={v => patch(id, "caption", v)} placeholder="Caption text…" />
      </div>
    </NS>
  );
}

function AINode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={Bot as IconComp} label="AI Agent" color={C.violet} selected={!!selected}>
      <div><FL>System Prompt</FL>
        <DTA value={String(data.prompt ?? "")} onChange={v => patch(id, "prompt", v)}
          placeholder="You are a helpful assistant…" rows={4} maxLen={2000} />
      </div>
    </NS>
  );
}

function HTTPNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  return (
    <NS id={id} Icon={Globe as IconComp} label="HTTP Request" color={C.sub} selected={!!selected}>
      <div><FL>Method</FL>
        <DSel value={String(data.method ?? "GET")} onChange={v => patch(id, "method", v)}
          opts={[{ v: "GET", l: "GET" }, { v: "POST", l: "POST" }, { v: "PUT", l: "PUT" }, { v: "DELETE", l: "DELETE" }]} />
      </div>
      <div><FL>URL</FL>
        <DI value={String(data.url ?? "")} onChange={v => patch(id, "url", v)} placeholder="https://api.example.com/…" />
      </div>
    </NS>
  );
}

function GenericNode({ id, data, selected }: NodeProps) {
  const { patch } = useContext(Ctx);
  const nodeType = String(data.nodeType ?? "");
  const action = ACTIONS.find(a => a.type === nodeType);
  const Icon = ((action?.icon ?? Bot) as unknown) as IconComp;
  const color = action?.color ?? C.sub;
  return (
    <NS id={id} Icon={Icon} label={String(data.label ?? "Action")} color={color} selected={!!selected}>
      <div><FL>Label</FL>
        <DI value={String(data.label ?? "")} onChange={v => patch(id, "label", v)} placeholder="Label" />
      </div>
      <p className="text-[11px]" style={{ color: C.dim }}>Full config coming soon.</p>
    </NS>
  );
}

/* ── nodeTypes (module-level — stable references) ────────────────────────── */

const nodeTypes = {
  trigger: TriggerNode, text: TextNode, button: ButtonNode, list: ListNode,
  question: QuestionNode, delay: DelayNode, condition: ConditionNode,
  stop: StopNode, media: MediaNode, ai: AINode, http: HTTPNode,
  cta: GenericNode, product: GenericNode, location: GenericNode,
  columns: GenericNode, tag: GenericNode, fetch: GenericNode,
  sheet: GenericNode, template: GenericNode,
};

const defaultNodes: Node[] = [
  {
    id: "trigger-1", type: "trigger", position: { x: 80, y: 120 },
    data: { label: "On Message", keywords: [], messageType: "text", fuzzyMatch: false, phoneFilter: "" },
  },
];

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ChatbotFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [chatbotName, setChatbotName] = useState("Loading…");
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [openTrig, setOpenTrig] = useState(true);
  const [openActs, setOpenActs] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  useEffect(() => {
    fetch(`/api/chatbots/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.chatbot) {
          setChatbotName(d.chatbot.name);
          setPublished(d.chatbot.enabled);
          const flow = d.chatbot.flowJson;
          if (flow?.nodes?.length) setNodes(flow.nodes as Node[]);
          if (flow?.edges?.length) setEdges(flow.edges as Edge[]);
        }
      });
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback(
    (c: Connection) => setEdges(eds => addEdge({
      ...c,
      style: { stroke: C.orange, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: C.orange },
    }, eds)),
    [setEdges],
  );

  const patch = useCallback((nodeId: string, field: string, value: unknown) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [setNodes]);

  const del = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const ctxVal = useMemo(() => ({ patch, del }), [patch, del]);

  function addNode(type: string) {
    const a = ACTIONS.find(x => x.type === type);
    const label = a?.label ?? type;
    const cur = nodesRef.current;
    const maxX = cur.length ? Math.max(...cur.map(n => n.position.x)) : 80;
    const data =
      type === "button"   ? { label, body: "Choose an option:", buttons: ["Option 1", "Option 2", ""], nodeType: type }
      : type === "delay"  ? { label, delay: "1", nodeType: type }
      : type === "trigger"? { label: "On Message", keywords: [], messageType: "text", fuzzyMatch: false, phoneFilter: "" }
      : type === "question"? { label, text: "", variable: "answer", nodeType: type }
      : type === "list"   ? { label, body: "", buttonText: "View Options", sections: [{ title: "Section 1", rows: [{ id: "r0", title: "", description: "" }] }], nodeType: type }
      : type === "ai"     ? { label, prompt: "", nodeType: type }
      : type === "http"   ? { label, method: "GET", url: "", nodeType: type }
      : type === "media"  ? { label, mediaType: "image", url: "", caption: "", nodeType: type }
      : { label, text: "", nodeType: type };
    setNodes(nds => [...nds, {
      id: `${type}-${Date.now()}`, type,
      position: { x: maxX + 340, y: 80 + Math.floor(Math.random() * 80) },
      data,
    }]);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/chatbots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowJson: { nodes: nodesRef.current, edges: edgesRef.current }, enabled: published }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function togglePublish() {
    const next = !published;
    setPublished(next);
    await fetch(`/api/chatbots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowJson: { nodes: nodesRef.current, edges: edgesRef.current }, enabled: next }),
    });
  }

  async function runTest() {
    if (!testMsg.trim()) return;
    setTestRunning(true); setTestResult(null);
    try {
      const r = await fetch("/api/whatsapp/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim() || "919999000000", name: "Test User", text: testMsg }),
      });
      const j = await r.json() as { ok: boolean };
      setTestResult(j.ok ? "✓ Check Inbox for bot reply" : `Error: ${JSON.stringify(j)}`);
    } catch (e) { setTestResult(`Error: ${String(e)}`); }
    finally { setTestRunning(false); }
  }

  const filtered = ACTIONS.filter(a => a.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Ctx.Provider value={ctxVal}>
      <div className="flex flex-col h-screen" style={{ background: C.bg }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ background: C.hdr, borderBottom: `1px solid ${C.bdr}` }}>
          <button onClick={() => router.push("/dashboard/chatbots")}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: C.sub }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-sm flex-1 truncate" style={{ color: C.text }}>{chatbotName}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block" style={{ color: C.sub }}>Published</span>
            <button onClick={togglePublish}
              className="relative rounded-full transition-colors"
              style={{ width: 40, height: 22, background: published ? C.orange : C.bdr }}>
              <span className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all"
                style={{ left: published ? "calc(100% - 20px)" : "2px" }} />
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: saved ? C.green : C.orange }}>
              {saved
                ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</>
                : <><Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}</>}
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left sidebar ── */}
          <div className="w-60 flex-shrink-0 flex flex-col overflow-hidden"
            style={{ background: C.side, borderRight: `1px solid ${C.bdr}` }}>

            {/* Search */}
            <div className="p-3 pb-2">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: C.node, border: `1px solid ${C.bdr}` }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.dim }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search components…"
                  className="flex-1 text-xs bg-transparent focus:outline-none"
                  style={{ color: C.text }} />
                {search && (
                  <button onClick={() => setSearch("")} style={{ color: C.dim }}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Triggers accordion */}
            {!search && (
              <div className="px-3 mb-1">
                <button onClick={() => setOpenTrig(o => !o)}
                  className="w-full flex items-center gap-2 py-1.5">
                  {openTrig
                    ? <ChevronDown className="w-3 h-3" style={{ color: C.dim }} />
                    : <ChevronRight className="w-3 h-3" style={{ color: C.dim }} />}
                  <span className="text-xs font-semibold" style={{ color: C.sub }}>Triggers</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
                    style={{ background: C.bdr, color: C.sub }}>1</span>
                </button>
                {openTrig && (
                  <button onClick={() => addNode("trigger")}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                    style={{ background: "#1a120a", border: `1px solid ${C.orange}44`, color: C.orange }}>
                    <Zap className="w-3.5 h-3.5" /> On Message
                  </button>
                )}
              </div>
            )}

            {/* Actions accordion header */}
            {!search && (
              <div className="px-3 mb-1">
                <button onClick={() => setOpenActs(o => !o)}
                  className="w-full flex items-center gap-2 py-1.5">
                  {openActs
                    ? <ChevronDown className="w-3 h-3" style={{ color: C.dim }} />
                    : <ChevronRight className="w-3 h-3" style={{ color: C.dim }} />}
                  <span className="text-xs font-semibold" style={{ color: C.sub }}>Actions</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
                    style={{ background: C.bdr, color: C.sub }}>{ACTIONS.length}</span>
                </button>
              </div>
            )}

            {/* Action list */}
            <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
              {(openActs || !!search) && filtered.map(a => (
                <button key={a.type} onClick={() => addNode(a.type)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors hover:bg-white/5"
                  style={{ color: C.sub }}>
                  <a.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: a.color }} />
                  {a.label}
                </button>
              ))}
            </div>

            {/* Test panel */}
            <div className="p-3 border-t" style={{ borderColor: C.bdr }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3" style={{ color: C.violet }} />
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.dim }}>Test</span>
              </div>
              <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none mb-1.5"
                style={{ background: C.node, border: `1px solid ${C.bdr}`, color: C.text }} />
              <input value={testMsg} onChange={e => setTestMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runTest()}
                placeholder="Send test message…"
                className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none mb-1.5"
                style={{ background: C.node, border: `1px solid ${C.bdr}`, color: C.text }} />
              <button onClick={runTest} disabled={testRunning || !testMsg.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 text-white transition-colors"
                style={{ background: C.violet }}>
                <Play className="w-3 h-3" />
                {testRunning ? "Running…" : "Run Test"}
              </button>
              {testResult && (
                <p className="text-[10px] mt-1.5 leading-snug"
                  style={{ color: testResult.startsWith("✓") ? C.green : C.red }}>
                  {testResult}
                </p>
              )}
            </div>
          </div>

          {/* ── Canvas ── */}
          <div className="flex-1 min-w-0">
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect} nodeTypes={nodeTypes}
              fitView fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{
                style: { stroke: C.orange, strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: C.orange },
              }}
              style={{ background: C.bg }}>
              <Background color={C.bdr} gap={24} size={1.5} />
              <Controls style={{
                background: C.node, border: `1px solid ${C.bdr}`,
                borderRadius: 8, boxShadow: "none",
              }} />
              <MiniMap
                nodeColor={n =>
                  n.type === "trigger" ? C.orange : n.type === "button" ? C.purple
                  : n.type === "stop" ? C.red : n.type === "list" ? C.teal
                  : n.type === "condition" ? C.indigo : n.type === "ai" ? C.violet
                  : C.blue}
                style={{ background: C.hdr, border: `1px solid ${C.bdr}`, borderRadius: 8 }} />
            </ReactFlow>
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}
