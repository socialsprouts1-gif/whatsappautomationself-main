/**
 * Chatbot execution engine.
 *
 * Traverses a chatbot's React Flow graph and executes nodes in sequence.
 * Supports a "session" model so multi-step flows survive across messages —
 * when a node needs user input (button, ask-question) the session pauses
 * and resumes on the contact's next inbound message.
 */

import { getChatbot, listChatbots, db, newId, logActivity } from "@/lib/store";
import type { Contact } from "@/lib/store";

/* -------------------------------------------------------------------------- */
/*  Session types                                                              */
/* -------------------------------------------------------------------------- */

export interface ChatbotSession {
  id: string;
  chatbotId: string;
  contactId: string;
  currentNodeId: string | null;
  waitingForReply: boolean;
  collectedData: Record<string, string>;
  startedAt: string;
  updatedAt: string;
  completed: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Session store (lives on globalThis DB object)                              */
/* -------------------------------------------------------------------------- */

type DBWithSessions = { chatbotSessions?: ChatbotSession[] };

function getSessions(): ChatbotSession[] {
  const d = db() as unknown as DBWithSessions;
  if (!d.chatbotSessions) d.chatbotSessions = [];
  return d.chatbotSessions;
}

export function getActiveSession(contactId: string): ChatbotSession | undefined {
  return getSessions().find((s) => s.contactId === contactId && !s.completed);
}

function createSession(chatbotId: string, contactId: string, firstNodeId: string): ChatbotSession {
  // End any previous incomplete sessions for this contact
  getSessions()
    .filter((s) => s.contactId === contactId && !s.completed)
    .forEach((s) => { s.completed = true; });

  const session: ChatbotSession = {
    id: newId("sess"),
    chatbotId,
    contactId,
    currentNodeId: firstNodeId,
    waitingForReply: false,
    collectedData: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completed: false,
  };
  getSessions().push(session);
  return session;
}

/* -------------------------------------------------------------------------- */
/*  Flow graph types                                                           */
/* -------------------------------------------------------------------------- */

type FlowNode = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};
type FlowEdge = { source: string; target: string; sourceHandle?: string | null };

function getNextNodes(nodeId: string, edges: FlowEdge[], nodes: FlowNode[], handle?: string): FlowNode[] {
  return edges
    .filter((e) => e.source === nodeId && (!handle || !e.sourceHandle || e.sourceHandle === handle))
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean) as FlowNode[];
}

/* -------------------------------------------------------------------------- */
/*  Node executor                                                              */
/* -------------------------------------------------------------------------- */

// Lazy import to avoid circular deps (automation imports store, engine imports automation)
async function sendText(contact: Contact, text: string) {
  const { sendOutbound } = await import("@/lib/automation");
  await sendOutbound(contact, text, { via: "flow" });
}

async function executeFromNode(
  session: ChatbotSession,
  node: FlowNode,
  nodes: FlowNode[],
  edges: FlowEdge[],
  contact: Contact,
  userInput?: string,
  depth = 0,
): Promise<void> {
  // Guard against infinite loops
  if (depth > 50 || session.completed) return;

  const nodeType = node.type ?? "text";
  session.currentNodeId = node.id;
  session.updatedAt = new Date().toISOString();

  switch (nodeType) {
    case "trigger": {
      const nexts = getNextNodes(node.id, edges, nodes);
      for (const next of nexts) {
        await executeFromNode(session, next, nodes, edges, contact, userInput, depth + 1);
      }
      break;
    }

    case "text": {
      const text = String(node.data?.text ?? "");
      if (text.trim()) await sendText(contact, text);
      const nexts = getNextNodes(node.id, edges, nodes);
      for (const next of nexts) {
        await executeFromNode(session, next, nodes, edges, contact, undefined, depth + 1);
      }
      break;
    }

    case "button": {
      const body = String(node.data?.body ?? "");
      const buttons = (node.data?.buttons as string[]) ?? [];
      const lines = [body, ...buttons.map((b, i) => `${i + 1}. ${b}`)].filter(Boolean);
      if (lines.length) await sendText(contact, lines.join("\n"));
      // Pause and wait for user to pick an option
      session.waitingForReply = true;
      break;
    }

    case "list": {
      const body = String(node.data?.body ?? "");
      const btnText = String(node.data?.buttonText ?? "View Options");
      // Support both sections format (new) and flat rows format (legacy)
      const sections = Array.isArray(node.data?.sections)
        ? (node.data!.sections as Array<{ title: string; rows: Array<{ title: string; description?: string }> }>)
        : null;
      const rows = sections
        ? sections.flatMap(s => s.rows)
        : ((node.data?.rows as Array<{ title: string; description?: string }>) ?? []);
      const lines = [
        body,
        `[${btnText}]`,
        ...rows.map((r, i) => `${i + 1}. ${r.title}${r.description ? ` — ${r.description}` : ""}`),
      ].filter(Boolean);
      if (lines.length) await sendText(contact, lines.join("\n"));
      session.waitingForReply = true;
      break;
    }

    case "question": {
      const question = String(node.data?.question ?? node.data?.text ?? "");
      if (question.trim()) await sendText(contact, question);
      const varName = String(node.data?.variable ?? "answer");
      session.collectedData.__waitingVar = varName;
      session.waitingForReply = true;
      break;
    }

    case "delay": {
      // Skip delay in immediate execution (a proper cron would handle this)
      const nexts = getNextNodes(node.id, edges, nodes);
      for (const next of nexts) {
        await executeFromNode(session, next, nodes, edges, contact, undefined, depth + 1);
      }
      break;
    }

    case "condition": {
      // Simple condition: try first edge, fall back to second
      const nexts = getNextNodes(node.id, edges, nodes);
      const target = nexts[0];
      if (target) await executeFromNode(session, target, nodes, edges, contact, userInput, depth + 1);
      break;
    }

    case "stop": {
      session.completed = true;
      break;
    }

    default: {
      // Unknown node types: log and skip
      console.info(`[chatbot-engine] skipping unknown node type: ${nodeType}`);
      const nexts = getNextNodes(node.id, edges, nodes);
      for (const next of nexts) {
        await executeFromNode(session, next, nodes, edges, contact, userInput, depth + 1);
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Resume a paused session with the user's reply                              */
/* -------------------------------------------------------------------------- */

async function resumeSession(session: ChatbotSession, contact: Contact, userInput: string): Promise<void> {
  const chatbot = getChatbot(session.chatbotId);
  if (!chatbot) { session.completed = true; return; }

  const { nodes, edges } = chatbot.flowJson as { nodes: FlowNode[]; edges: FlowEdge[] };
  const currentNode = nodes.find((n) => n.id === session.currentNodeId);
  if (!currentNode) { session.completed = true; return; }

  session.waitingForReply = false;

  // If we were collecting a variable, store the answer
  if (session.collectedData.__waitingVar) {
    const varName = session.collectedData.__waitingVar;
    session.collectedData[varName] = userInput;
    delete session.collectedData.__waitingVar;
  }

  // Advance to next nodes
  const nexts = getNextNodes(currentNode.id, edges, nodes);
  for (const next of nexts) {
    await executeFromNode(session, next, nodes, edges, contact, userInput, 0);
  }
}

/* -------------------------------------------------------------------------- */
/*  Public entry point: called from automation.processInbound                 */
/* -------------------------------------------------------------------------- */

export async function runActiveChatbots(contact: Contact, text: string): Promise<void> {
  // If the contact has an active paused session, resume it
  const activeSession = getActiveSession(contact.id);
  if (activeSession) {
    await resumeSession(activeSession, contact, text);
    return;
  }

  // Otherwise find the first enabled chatbot whose trigger matches
  const chatbots = listChatbots().filter((c) => c.enabled);
  for (const chatbot of chatbots) {
    const flowJson = chatbot.flowJson as { nodes?: FlowNode[]; edges?: FlowEdge[] };
    const nodes = flowJson.nodes ?? [];
    const edges = flowJson.edges ?? [];
    if (!nodes.length) continue;

    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode) continue;

    // Keyword matching — supports both array format (new) and comma-string (legacy)
    const kwData = triggerNode.data?.keywords;
    const kws: string[] = Array.isArray(kwData)
      ? (kwData as string[]).map(k => k.toLowerCase()).filter(Boolean)
      : (typeof kwData === "string" && kwData.trim()
          ? kwData.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)
          : []);
    if (kws.length) {
      const t = text.toLowerCase();
      const fuzzy = !!triggerNode.data?.fuzzyMatch;
      const matches = kws.some(k => fuzzy ? t.includes(k) : t === k || t.includes(k));
      if (!matches) continue;
    }

    chatbot.triggeredCount = (chatbot.triggeredCount ?? 0) + 1;
    logActivity("chatbot", `Chatbot "${chatbot.name}" triggered for ${contact.name}`);

    const session = createSession(chatbot.id, contact.id, triggerNode.id);
    await executeFromNode(session, triggerNode, nodes, edges, contact, text, 0);
    break; // Only run the first matching chatbot
  }
}
