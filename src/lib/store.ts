/**
 * In-memory data store for the WhatsApp automation SaaS.
 *
 * This is a pragmatic MVP datastore: a singleton kept on `globalThis` so it
 * survives Next.js hot-reloads in dev and stays warm across requests in a
 * single server instance. It is seeded with realistic demo data so the product
 * is fully explorable immediately.
 *
 * NOTE: this is process-memory only. On serverless (Vercel) writes persist
 * within a warm instance but reset on cold starts. Swap this module for a real
 * database (Postgres/Supabase) for production — the exported functions form the
 * data-access boundary the rest of the app depends on.
 */

import { randomUUID } from "node:crypto";
import { loadSnapshot, persistenceEnabled, saveSnapshot } from "@/lib/persistence";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ContactStatus = "lead" | "active" | "customer" | "blocked";

export interface Contact {
  id: string;
  name: string;
  phone: string; // wa_id, international digits only
  email?: string;
  tags: string[];
  status: ContactStatus;
  createdAt: string;
  lastActiveAt: string;
  attributes: Record<string, string>;
}

export type MessageDirection = "in" | "out";
export type MessageStatusValue =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  type: string;
  text: string;
  status: MessageStatusValue;
  timestamp: string;
  wamid?: string;
  templateName?: string;
  /** How an outbound message was produced. */
  via?: "manual" | "automation" | "campaign" | "flow";
  error?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  status: "open" | "closed";
  unread: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  assignedTo?: string;
}

export type TemplateCategory = "marketing" | "utility" | "authentication";
export type TemplateStatus = "approved" | "pending" | "rejected";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  body: string;
  variableCount: number;
  createdAt: string;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  clicked: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: "broadcast" | "drip" | "trigger";
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";
  templateName?: string;
  audienceTag?: string;
  recipientCount: number;
  stats: CampaignStats;
  createdAt: string;
  scheduledAt?: string;
}

export type RuleTriggerType = "keyword" | "welcome" | "default";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: RuleTriggerType;
  keywords: string[];
  matchType: "contains" | "exact" | "starts_with";
  responseType: "text" | "template";
  responseText?: string;
  responseTemplate?: string;
  priority: number;
  triggeredCount: number;
  createdAt: string;
}

export interface FlowStep {
  delayMinutes: number;
  message: string;
}

export interface Flow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: "on_inbound" | "on_new_contact" | "keyword";
  keywords: string[];
  steps: FlowStep[];
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}

export interface ScheduledJob {
  id: string;
  flowId: string;
  flowName: string;
  contactId: string;
  stepIndex: number;
  message: string;
  runAt: string;
  status: "pending" | "done" | "cancelled";
}

export interface Integration {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  connectedAt?: string;
  /** Human-readable confirmation of what got connected (account name, workspace, etc). */
  accountLabel?: string;
  /** Real credentials for this connector. Never sent to the client in full — see `toPublicIntegration`. */
  credentials?: Record<string, string>;
}

export interface Settings {
  businessName: string;
  businessEmail: string;
  website: string;
  whatsappNumber: string;
  autoReplyEnabled: boolean;
  sandboxMode: boolean;
  // WhatsApp Cloud API credentials (runtime-saved via settings UI)
  waAccessToken?: string;
  waPhoneNumberId?: string;
  waBusinessAccountId?: string;
  waVerifyToken?: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  text: string;
  timestamp: string;
}

export interface Chatbot {
  id: string;
  name: string;
  enabled: boolean;
  flowJson: { nodes: unknown[]; edges: unknown[] };
  createdAt: string;
  triggeredCount: number;
}

export interface MediaFile {
  id: string;
  filename: string;
  type: "image" | "video" | "document" | "audio";
  size: number; // bytes
  url: string;
  createdAt: string;
}

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

export interface Reminder {
  id: string;
  title: string;
  note?: string;
  dueAt: string;
  done: boolean;
  createdAt: string;
}

export type SupportTicketStatus = "open" | "pending" | "resolved";
export type SupportTicketPriority = "low" | "medium" | "high";

export interface SupportReply {
  id: string;
  from: "user" | "agent";
  text: string;
  at: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  replies: SupportReply[];
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  contactIds: string[];
  createdAt: string;
}

export type TransactionStatus = "paid" | "pending" | "failed" | "refunded";

export interface Transaction {
  id: string;
  contactId?: string;
  contactName: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  method: string;
  reference: string;
  createdAt: string;
}

export type WaFormFieldType = "text" | "number" | "email" | "phone" | "select" | "date";

export interface WaFormField {
  id: string;
  label: string;
  type: WaFormFieldType;
  required: boolean;
  options?: string[];
}

export interface WaForm {
  id: string;
  name: string;
  description?: string;
  fields: WaFormField[];
  published: boolean;
  submissionCount: number;
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, string>;
  submittedAt: string;
}

export interface CannedMessage {
  id: string;
  shortcut: string;
  text: string;
  category: string;
  createdAt: string;
}

export interface TagDef {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export type CustomFieldType = "text" | "number" | "date" | "boolean";

export interface CustomField {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  source: string;
  event: string;
  summary: string;
  payload: unknown;
  status: "processed" | "failed";
  receivedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
  imageUrl?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  contactId?: string;
  contactName: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  enabled: boolean;
  triggeredCount: number;
  createdAt: string;
}

export interface AiAssistantConfig {
  enabled: boolean;
  model: string;
  systemPrompt: string;
  temperature: number;
  tone: string;
  fallbackToHuman: boolean;
}

export type OrgRole = "owner" | "admin" | "member";

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  members: OrgMember[];
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  scopes: string[];
  revoked: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "due" | "failed";
  date: string;
  planLabel: string;
}

export interface BillingInfo {
  plan: string;
  priceMonthly: number;
  currency: string;
  renewalDate: string;
  messagesUsed: number;
  messagesLimit: number;
  paymentMethodLast4: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  phone?: string;
  /** `salt:hash` — scrypt-derived, never sent to the client. */
  passwordHash: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface DB {
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  templates: Template[];
  campaigns: Campaign[];
  rules: AutomationRule[];
  flows: Flow[];
  jobs: ScheduledJob[];
  integrations: Integration[];
  settings: Settings;
  activity: ActivityEvent[];
  chatbots: Chatbot[];
  media: MediaFile[];
  chatbotSessions: ChatbotSession[];
  reminders: Reminder[];
  supportTickets: SupportTicket[];
  groups: Group[];
  transactions: Transaction[];
  forms: WaForm[];
  formSubmissions: FormSubmission[];
  cannedMessages: CannedMessage[];
  tagDefs: TagDef[];
  customFields: CustomField[];
  webhookEvents: WebhookEvent[];
  products: Product[];
  orders: Order[];
  faqs: Faq[];
  aiAssistant: AiAssistantConfig;
  organizations: Organization[];
  apiKeys: ApiKeyRecord[];
  billing: BillingInfo;
  invoices: Invoice[];
  users: User[];
  sessions: Session[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function isoAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/* -------------------------------------------------------------------------- */
/*  Seed                                                                       */
/* -------------------------------------------------------------------------- */

function seed(): DB {
  const contactsSeed: Array<Omit<Contact, "id">> = [
    { name: "Priya Sharma", phone: "919812345670", email: "priya@example.com", tags: ["lead", "website"], status: "lead", createdAt: isoAgo(2880), lastActiveAt: isoAgo(12), attributes: { city: "Mumbai" } },
    { name: "James Carter", phone: "14155550111", email: "james@example.com", tags: ["customer", "vip"], status: "customer", createdAt: isoAgo(20160), lastActiveAt: isoAgo(95), attributes: { plan: "Pro" } },
    { name: "Aisha Khan", phone: "971501234567", email: "aisha@example.com", tags: ["lead"], status: "active", createdAt: isoAgo(7200), lastActiveAt: isoAgo(4), attributes: { city: "Dubai" } },
    { name: "Carlos Mendez", phone: "5215512345678", tags: ["customer"], status: "customer", createdAt: isoAgo(43200), lastActiveAt: isoAgo(1500), attributes: {} },
    { name: "Sofia Rossi", phone: "393331234567", email: "sofia@example.com", tags: ["lead", "abandoned-cart"], status: "lead", createdAt: isoAgo(180), lastActiveAt: isoAgo(45), attributes: { cart_value: "€129" } },
    { name: "David Okafor", phone: "2348031234567", tags: ["active"], status: "active", createdAt: isoAgo(10080), lastActiveAt: isoAgo(600), attributes: {} },
  ];

  const contacts: Contact[] = contactsSeed.map((c) => ({ ...c, id: newId("ct") }));

  const conversations: Conversation[] = [];
  const messages: Message[] = [];

  // Build a couple of realistic threads.
  const seedThread = (
    contact: Contact,
    items: Array<{ dir: MessageDirection; text: string; minsAgo: number; status?: MessageStatusValue }>,
    unread: number,
  ) => {
    const convId = newId("cv");
    let last = items[items.length - 1];
    for (const m of items) {
      messages.push({
        id: newId("msg"),
        conversationId: convId,
        contactId: contact.id,
        direction: m.dir,
        type: "text",
        text: m.text,
        status: m.dir === "out" ? m.status ?? "delivered" : "delivered",
        timestamp: isoAgo(m.minsAgo),
        via: m.dir === "out" ? "manual" : undefined,
      });
    }
    conversations.push({
      id: convId,
      contactId: contact.id,
      status: "open",
      unread,
      lastMessageAt: isoAgo(last.minsAgo),
      lastMessagePreview: last.text,
    });
  };

  seedThread(contacts[0], [
    { dir: "in", text: "Hi, do you have the summer collection in stock?", minsAgo: 60 },
    { dir: "out", text: "Hi Priya! Yes we do 🎉 Which item are you interested in?", minsAgo: 58, status: "read" },
    { dir: "in", text: "The linen dress in beige", minsAgo: 12 },
  ], 1);

  seedThread(contacts[2], [
    { dir: "in", text: "menu", minsAgo: 10 },
    { dir: "out", text: "Welcome to our store! Reply 1 for Catalog, 2 for Support, 3 to talk to an agent.", minsAgo: 10, status: "read" },
    { dir: "in", text: "1", minsAgo: 4 },
  ], 1);

  seedThread(contacts[4], [
    { dir: "in", text: "I left something in my cart", minsAgo: 50 },
    { dir: "out", text: "No worries Sofia — here's a 10% code to finish your order: SAVE10", minsAgo: 45, status: "delivered" },
  ], 0);

  const templates: Template[] = [
    { id: newId("tpl"), name: "order_confirmation", category: "utility", language: "en_US", status: "approved", body: "Hi {{1}}, your order {{2}} is confirmed and will arrive by {{3}}.", variableCount: 3, createdAt: isoAgo(30000) },
    { id: newId("tpl"), name: "appointment_reminder", category: "utility", language: "en_US", status: "approved", body: "Hi {{1}}, this is a reminder for your appointment on {{2}}.", variableCount: 2, createdAt: isoAgo(28000) },
    { id: newId("tpl"), name: "summer_sale_2026", category: "marketing", language: "en_US", status: "approved", body: "Hi {{1}}! ☀️ Our Summer Sale is live — up to 50% off. Reply SHOP to browse.", variableCount: 1, createdAt: isoAgo(5000) },
    { id: newId("tpl"), name: "welcome_offer", category: "marketing", language: "en_US", status: "pending", body: "Welcome {{1}}! Here's 15% off your first order: {{2}}", variableCount: 2, createdAt: isoAgo(120) },
    { id: newId("tpl"), name: "otp_verification", category: "authentication", language: "en_US", status: "approved", body: "{{1}} is your verification code. It expires in 5 minutes.", variableCount: 1, createdAt: isoAgo(60000) },
  ];

  const campaigns: Campaign[] = [
    { id: newId("cmp"), name: "Summer Sale 2026", type: "broadcast", status: "sent", templateName: "summer_sale_2026", audienceTag: "lead", recipientCount: 12450, stats: { sent: 12450, delivered: 12230, read: 9180, failed: 220, clicked: 3420 }, createdAt: isoAgo(4000) },
    { id: newId("cmp"), name: "Welcome Series", type: "drip", status: "sending", templateName: "welcome_offer", audienceTag: "website", recipientCount: 4820, stats: { sent: 4820, delivered: 4750, read: 3600, failed: 70, clicked: 1240 }, createdAt: isoAgo(8000) },
    { id: newId("cmp"), name: "Abandoned Cart Recovery", type: "trigger", status: "sending", audienceTag: "abandoned-cart", recipientCount: 2310, stats: { sent: 2310, delivered: 2290, read: 1890, failed: 20, clicked: 920 }, createdAt: isoAgo(12000) },
    { id: newId("cmp"), name: "Flash Deal — 24h", type: "broadcast", status: "scheduled", templateName: "summer_sale_2026", audienceTag: "customer", recipientCount: 0, stats: { sent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }, createdAt: isoAgo(60), scheduledAt: new Date(Date.now() + 86_400_000).toISOString() },
  ];

  const rules: AutomationRule[] = [
    { id: newId("rule"), name: "Welcome greeting", enabled: true, triggerType: "welcome", keywords: ["hi", "hello", "hey"], matchType: "contains", responseType: "text", responseText: "👋 Welcome to Neuraxine! Reply MENU to see what I can help with.", priority: 1, triggeredCount: 842, createdAt: isoAgo(20000) },
    { id: newId("rule"), name: "Menu", enabled: true, triggerType: "keyword", keywords: ["menu"], matchType: "exact", responseType: "text", responseText: "Here's our menu:\n1️⃣ Catalog\n2️⃣ Support\n3️⃣ Talk to an agent", priority: 2, triggeredCount: 503, createdAt: isoAgo(19000) },
    { id: newId("rule"), name: "Pricing inquiry", enabled: true, triggerType: "keyword", keywords: ["price", "pricing", "cost", "how much"], matchType: "contains", responseType: "text", responseText: "Our plans start at $29/mo. Reply PLANS for a full breakdown 💸", priority: 3, triggeredCount: 287, createdAt: isoAgo(15000) },
    { id: newId("rule"), name: "Business hours", enabled: false, triggerType: "keyword", keywords: ["hours", "open"], matchType: "contains", responseType: "text", responseText: "We're open Mon–Sat, 9am–7pm.", priority: 4, triggeredCount: 96, createdAt: isoAgo(9000) },
    { id: newId("rule"), name: "Fallback", enabled: true, triggerType: "default", keywords: [], matchType: "contains", responseType: "text", responseText: "Thanks for your message! A team member will reply shortly. Reply MENU for quick options.", priority: 99, triggeredCount: 1290, createdAt: isoAgo(20000) },
  ];

  const flows: Flow[] = [
    { id: newId("flow"), name: "New lead nurture", enabled: true, trigger: "on_new_contact", keywords: [], steps: [
      { delayMinutes: 1, message: "Thanks for reaching out! 🙌 Here's a quick intro to what we offer." },
      { delayMinutes: 60, message: "Still thinking it over? Here's a 10% welcome code: WELCOME10" },
      { delayMinutes: 1440, message: "Last nudge — your welcome code WELCOME10 expires tonight!" },
    ], enrolledCount: 318, completedCount: 142, createdAt: isoAgo(12000) },
    { id: newId("flow"), name: "Abandoned cart", enabled: true, trigger: "keyword", keywords: ["cart"], steps: [
      { delayMinutes: 30, message: "You left items in your cart 🛒 Complete your order and get free shipping!" },
      { delayMinutes: 1440, message: "Your cart is about to expire — checkout now to keep your items." },
    ], enrolledCount: 96, completedCount: 51, createdAt: isoAgo(8000) },
  ];

  // Nothing starts "connected" — every integration requires real, live-validated
  // credentials via the Integrations page before it's marked connected (see
  // src/lib/integration-providers.ts). No fake pre-connected demo states.
  const integrations: Integration[] = [
    { id: newId("int"), key: "shopify", name: "Shopify", description: "Sync orders, customers and abandoned carts.", category: "E-commerce", connected: false },
    { id: newId("int"), key: "google_sheets", name: "Google Sheets", description: "Export contacts and message logs to a sheet.", category: "Productivity", connected: false },
    { id: newId("int"), key: "hubspot", name: "HubSpot", description: "Two-way contact sync with your CRM.", category: "CRM", connected: false },
    { id: newId("int"), key: "stripe", name: "Stripe", description: "Trigger messages on payments and subscriptions.", category: "Payments", connected: false },
    { id: newId("int"), key: "zapier", name: "Zapier", description: "Connect to 6000+ apps with no code.", category: "Automation", connected: false },
    { id: newId("int"), key: "openai", name: "OpenAI", description: "Power AI replies with GPT models.", category: "AI", connected: false },
  ];

  const activity: ActivityEvent[] = [
    { id: newId("act"), type: "message", text: "New message from Priya Sharma", timestamp: isoAgo(12) },
    { id: newId("act"), type: "automation", text: 'Rule "Menu" triggered for Aisha Khan', timestamp: isoAgo(4) },
    { id: newId("act"), type: "campaign", text: 'Campaign "Summer Sale 2026" finished sending', timestamp: isoAgo(60) },
    { id: newId("act"), type: "contact", text: "New contact added: Sofia Rossi", timestamp: isoAgo(180) },
  ];

  const chatbots: Chatbot[] = [
    { id: "338965c6-176d-43ce-b38b-dfbdfdd2dab9", name: "Aura Drip | Clothing Inquiry-to-Payment Automation (NeuraChat Import Fix)", enabled: false, flowJson: { nodes: [], edges: [] }, createdAt: isoAgo(10000), triggeredCount: 0 },
    { id: newId("cb"), name: "Aura Drip | Clothing Inquiry-to-Payment Automation", enabled: false, flowJson: { nodes: [], edges: [] }, createdAt: isoAgo(8000), triggeredCount: 142 },
    { id: newId("cb"), name: "Sadori Opticals - WhatsApp Chatbot", enabled: false, flowJson: { nodes: [], edges: [] }, createdAt: isoAgo(6000), triggeredCount: 87 },
    { id: newId("cb"), name: "Neurexin AI – Chatbot", enabled: false, flowJson: { nodes: [], edges: [] }, createdAt: isoAgo(3000), triggeredCount: 310 },
    { id: newId("cb"), name: "Balaji Motors - Zelio EV WhatsApp Chatbot", enabled: true, flowJson: { nodes: [], edges: [] }, createdAt: isoAgo(1000), triggeredCount: 55 },
  ];

  const media: MediaFile[] = [
    { id: newId("med"), filename: "product-banner.jpg", type: "image", size: 90112, url: "https://placehold.co/400x300/1a1a2e/00FF87?text=Product+Banner", createdAt: isoAgo(2000) },
    { id: newId("med"), filename: "promo-video.mp4", type: "video", size: 5242880, url: "", createdAt: isoAgo(5000) },
    { id: newId("med"), filename: "catalog.pdf", type: "document", size: 204800, url: "", createdAt: isoAgo(8000) },
  ];

  const reminders: Reminder[] = [
    { id: newId("rem"), title: "Follow up with James Carter", note: "Check if the Pro plan renewal went through.", dueAt: new Date(Date.now() + 3 * 3_600_000).toISOString(), done: false, createdAt: isoAgo(200) },
    { id: newId("rem"), title: "Review pending template: welcome_offer", dueAt: new Date(Date.now() + 26 * 3_600_000).toISOString(), done: false, createdAt: isoAgo(500) },
    { id: newId("rem"), title: "Call Sofia Rossi about abandoned cart", dueAt: isoAgo(-60), done: false, createdAt: isoAgo(1000) },
    { id: newId("rem"), title: "Renew WhatsApp Business API quota", note: "Done last week.", dueAt: isoAgo(2000), done: true, createdAt: isoAgo(4000) },
  ];

  const supportTickets: SupportTicket[] = [
    {
      id: newId("tik"), subject: "Templates stuck in pending for 3 days", status: "open", priority: "high",
      message: "Our welcome_offer template has been pending approval for 3 days, is that normal?",
      replies: [
        { id: newId("rep"), from: "user", text: "Our welcome_offer template has been pending approval for 3 days, is that normal?", at: isoAgo(4200) },
        { id: newId("rep"), from: "agent", text: "That can happen during high-volume review periods. We'll flag it with Meta support on our side.", at: isoAgo(4000) },
      ],
      createdAt: isoAgo(4200), updatedAt: isoAgo(4000),
    },
    {
      id: newId("tik"), subject: "How do I add a second WhatsApp number?", status: "resolved", priority: "low",
      message: "Can I connect a second WhatsApp Business number to the same workspace?",
      replies: [
        { id: newId("rep"), from: "user", text: "Can I connect a second WhatsApp Business number to the same workspace?", at: isoAgo(9000) },
        { id: newId("rep"), from: "agent", text: "Yes — upgrade to the Agency plan and add it from Settings → Connect WhatsApp Number.", at: isoAgo(8800) },
      ],
      createdAt: isoAgo(9000), updatedAt: isoAgo(8800),
    },
    {
      id: newId("tik"), subject: "Billing charged twice this month", status: "pending", priority: "high",
      message: "I noticed two charges of $79 this month, could you check?",
      replies: [
        { id: newId("rep"), from: "user", text: "I noticed two charges of $79 this month, could you check?", at: isoAgo(600) },
      ],
      createdAt: isoAgo(600), updatedAt: isoAgo(600),
    },
  ];

  const groups: Group[] = [
    { id: newId("grp"), name: "VIP Customers", description: "High-value repeat customers", contactIds: [contacts[1].id], createdAt: isoAgo(15000) },
    { id: newId("grp"), name: "Website Leads", description: "Leads captured from the site chat widget", contactIds: [contacts[0].id, contacts[4].id], createdAt: isoAgo(9000) },
    { id: newId("grp"), name: "Dubai Region", description: "Contacts based in the UAE", contactIds: [contacts[2].id], createdAt: isoAgo(4000) },
  ];

  const transactions: Transaction[] = [
    { id: newId("txn"), contactId: contacts[1].id, contactName: contacts[1].name, amount: 249, currency: "USD", status: "paid", method: "Card", reference: "PAY-88213", createdAt: isoAgo(1500) },
    { id: newId("txn"), contactId: contacts[3].id, contactName: contacts[3].name, amount: 89, currency: "USD", status: "paid", method: "UPI", reference: "PAY-88190", createdAt: isoAgo(3000) },
    { id: newId("txn"), contactId: contacts[4].id, contactName: contacts[4].name, amount: 129, currency: "EUR", status: "pending", method: "Card", reference: "PAY-88250", createdAt: isoAgo(80) },
    { id: newId("txn"), contactId: contacts[0].id, contactName: contacts[0].name, amount: 45, currency: "USD", status: "failed", method: "Card", reference: "PAY-88301", createdAt: isoAgo(20) },
  ];

  const forms: WaForm[] = [
    {
      id: newId("frm"), name: "Lead Capture", description: "Collects name, email and interest from new leads", published: true, submissionCount: 214, createdAt: isoAgo(12000),
      fields: [
        { id: newId("fld"), label: "Full name", type: "text", required: true },
        { id: newId("fld"), label: "Email", type: "email", required: true },
        { id: newId("fld"), label: "What are you interested in?", type: "select", required: false, options: ["Catalog", "Support", "Partnership"] },
      ],
    },
    {
      id: newId("frm"), name: "Appointment Booking", description: "Books a callback slot", published: false, submissionCount: 32, createdAt: isoAgo(3000),
      fields: [
        { id: newId("fld"), label: "Full name", type: "text", required: true },
        { id: newId("fld"), label: "Phone", type: "phone", required: true },
        { id: newId("fld"), label: "Preferred date", type: "date", required: true },
      ],
    },
  ];

  const cannedMessages: CannedMessage[] = [
    { id: newId("cnd"), shortcut: "/hours", text: "We're open Mon–Sat, 9am–7pm IST.", category: "General", createdAt: isoAgo(9000) },
    { id: newId("cnd"), shortcut: "/refund", text: "Refunds are processed within 5-7 business days back to your original payment method.", category: "Support", createdAt: isoAgo(7000) },
    { id: newId("cnd"), shortcut: "/thanks", text: "Thank you for reaching out! Let us know if there's anything else we can help with 🙌", category: "General", createdAt: isoAgo(5000) },
    { id: newId("cnd"), shortcut: "/discount", text: "Here's a 10% discount code for you: SAVE10 🎉", category: "Sales", createdAt: isoAgo(2000) },
  ];

  const tagDefs: TagDef[] = [
    { id: newId("tag"), name: "lead", color: "#d97706", createdAt: isoAgo(20000) },
    { id: newId("tag"), name: "customer", color: "#16a34a", createdAt: isoAgo(20000) },
    { id: newId("tag"), name: "vip", color: "#7c3aed", createdAt: isoAgo(15000) },
    { id: newId("tag"), name: "website", color: "#2563eb", createdAt: isoAgo(9000) },
    { id: newId("tag"), name: "abandoned-cart", color: "#e11d48", createdAt: isoAgo(4000) },
    { id: newId("tag"), name: "active", color: "#0ea5e9", createdAt: isoAgo(9000) },
  ];

  const customFields: CustomField[] = [
    { id: newId("col"), key: "city", label: "City", type: "text", createdAt: isoAgo(20000) },
    { id: newId("col"), key: "plan", label: "Plan", type: "text", createdAt: isoAgo(15000) },
    { id: newId("col"), key: "cart_value", label: "Cart Value", type: "text", createdAt: isoAgo(4000) },
  ];

  const webhookEvents: WebhookEvent[] = [
    { id: newId("whk"), source: "whatsapp", event: "messages", summary: "Inbound message from +919812345670", payload: { note: "seed data" }, status: "processed", receivedAt: isoAgo(12) },
    { id: newId("whk"), source: "whatsapp", event: "message_status", summary: "Status update: delivered → read for wamid.HBg...", payload: { note: "seed data" }, status: "processed", receivedAt: isoAgo(60) },
    { id: newId("whk"), source: "shopify", event: "orders/create", summary: "New order #1042 from Carlos Mendez", payload: { note: "seed data" }, status: "processed", receivedAt: isoAgo(3000) },
  ];

  const products: Product[] = [
    { id: newId("prd"), name: "Linen Summer Dress", sku: "DRS-BEI-001", price: 59, currency: "USD", stock: 42, imageUrl: "https://placehold.co/200x200/f5f5f5/333?text=Dress", createdAt: isoAgo(9000) },
    { id: newId("prd"), name: "Classic Leather Wallet", sku: "WAL-BRN-004", price: 29, currency: "USD", stock: 120, imageUrl: "https://placehold.co/200x200/f5f5f5/333?text=Wallet", createdAt: isoAgo(6000) },
    { id: newId("prd"), name: "Wireless Earbuds Pro", sku: "AUD-BLK-010", price: 89, currency: "USD", stock: 8, imageUrl: "https://placehold.co/200x200/f5f5f5/333?text=Earbuds", createdAt: isoAgo(3000) },
  ];

  const orders: Order[] = [
    { id: newId("ord"), contactId: contacts[1].id, contactName: contacts[1].name, items: [{ productId: products[2].id, name: products[2].name, qty: 1, price: 89 }], total: 89, currency: "USD", status: "delivered", createdAt: isoAgo(9000) },
    { id: newId("ord"), contactId: contacts[3].id, contactName: contacts[3].name, items: [{ productId: products[1].id, name: products[1].name, qty: 2, price: 29 }], total: 58, currency: "USD", status: "shipped", createdAt: isoAgo(3000) },
    { id: newId("ord"), contactId: contacts[4].id, contactName: contacts[4].name, items: [{ productId: products[0].id, name: products[0].name, qty: 1, price: 59 }], total: 59, currency: "USD", status: "pending", createdAt: isoAgo(50) },
  ];

  const faqs: Faq[] = [
    { id: newId("faq"), question: "What are your business hours?", answer: "We're open Mon–Sat, 9am–7pm IST.", category: "General", enabled: true, triggeredCount: 312, createdAt: isoAgo(20000) },
    { id: newId("faq"), question: "How long does shipping take?", answer: "Standard shipping takes 3-5 business days.", category: "Orders", enabled: true, triggeredCount: 198, createdAt: isoAgo(15000) },
    { id: newId("faq"), question: "What is your refund policy?", answer: "Refunds are processed within 5-7 business days of approval.", category: "Support", enabled: true, triggeredCount: 87, createdAt: isoAgo(9000) },
    { id: newId("faq"), question: "Do you ship internationally?", answer: "Yes, we ship to over 40 countries worldwide.", category: "Orders", enabled: false, triggeredCount: 21, createdAt: isoAgo(4000) },
  ];

  const aiAssistant: AiAssistantConfig = {
    enabled: true,
    model: "gpt-4o-mini",
    systemPrompt: "You are a friendly, concise WhatsApp support assistant for Neuraxine. Answer questions about orders, shipping and products. Escalate to a human agent if the customer sounds frustrated or asks for a refund.",
    temperature: 0.6,
    tone: "friendly",
    fallbackToHuman: true,
  };

  const organizations: Organization[] = [
    {
      id: newId("org"), name: "Neuraxine Inc.", plan: "Growth", createdAt: isoAgo(30000),
      members: [
        { id: newId("mem"), name: "Alex Admin", email: "alex@neuraxine.in", role: "owner", joinedAt: isoAgo(30000) },
        { id: newId("mem"), name: "Priya Nair", email: "priya@neuraxine.in", role: "admin", joinedAt: isoAgo(18000) },
        { id: newId("mem"), name: "Rahul Verma", email: "rahul@neuraxine.in", role: "member", joinedAt: isoAgo(6000) },
      ],
    },
  ];

  const apiKeys: ApiKeyRecord[] = [
    { id: newId("key"), name: "Production server", key: `wfa_live_${randomUUID().replace(/-/g, "")}`, scopes: ["read", "write"], revoked: false, createdAt: isoAgo(20000), lastUsedAt: isoAgo(30) },
    { id: newId("key"), name: "Zapier integration", key: `wfa_live_${randomUUID().replace(/-/g, "")}`, scopes: ["read"], revoked: false, createdAt: isoAgo(9000), lastUsedAt: isoAgo(500) },
  ];

  const billing: BillingInfo = {
    plan: "Growth",
    priceMonthly: 79,
    currency: "USD",
    renewalDate: new Date(Date.now() + 18 * 86_400_000).toISOString(),
    messagesUsed: 18420,
    messagesLimit: 25000,
    paymentMethodLast4: "4242",
  };

  const invoices: Invoice[] = [
    { id: newId("inv"), amount: 79, currency: "USD", status: "paid", date: isoAgo(43200), planLabel: "Growth — monthly" },
    { id: newId("inv"), amount: 79, currency: "USD", status: "paid", date: isoAgo(86400), planLabel: "Growth — monthly" },
    { id: newId("inv"), amount: 49, currency: "USD", status: "paid", date: isoAgo(129600), planLabel: "Starter — monthly" },
  ];

  return {
    contacts,
    conversations,
    messages,
    templates,
    campaigns,
    rules,
    flows,
    jobs: [],
    integrations,
    settings: {
      businessName: "Neuraxine",
      businessEmail: "hello@neuraxine.in",
      website: "https://neuraxine.in",
      whatsappNumber: "+1 555 0100",
      autoReplyEnabled: true,
      sandboxMode: !process.env.WHATSAPP_ACCESS_TOKEN,
    },
    activity,
    chatbots,
    media,
    chatbotSessions: [],
    reminders,
    supportTickets,
    groups,
    transactions,
    forms,
    formSubmissions: [],
    cannedMessages,
    tagDefs,
    customFields,
    webhookEvents,
    products,
    orders,
    faqs,
    aiAssistant,
    organizations,
    apiKeys,
    billing,
    invoices,
    // No demo users — real accounts are created through /auth/register.
    users: [],
    sessions: [],
  };
}

/* -------------------------------------------------------------------------- */
/*  Singleton                                                                  */
/* -------------------------------------------------------------------------- */

const globalForDb = globalThis as unknown as { __waDb?: DB };

export function db(): DB {
  if (!globalForDb.__waDb) {
    globalForDb.__waDb = seed();
  }
  // Migrate warm cache that predates chatbots/media fields
  const d = globalForDb.__waDb;
  if (!d.chatbots) d.chatbots = seed().chatbots;
  if (!d.media) d.media = seed().media;
  if (!d.chatbotSessions) d.chatbotSessions = [];
  if (!d.reminders) d.reminders = seed().reminders;
  if (!d.supportTickets) d.supportTickets = seed().supportTickets;
  if (!d.groups) d.groups = seed().groups;
  if (!d.transactions) d.transactions = seed().transactions;
  if (!d.forms) d.forms = seed().forms;
  if (!d.formSubmissions) d.formSubmissions = [];
  if (!d.cannedMessages) d.cannedMessages = seed().cannedMessages;
  if (!d.tagDefs) d.tagDefs = seed().tagDefs;
  if (!d.customFields) d.customFields = seed().customFields;
  if (!d.webhookEvents) d.webhookEvents = seed().webhookEvents;
  if (!d.products) d.products = seed().products;
  if (!d.orders) d.orders = seed().orders;
  if (!d.faqs) d.faqs = seed().faqs;
  if (!d.aiAssistant) d.aiAssistant = seed().aiAssistant;
  if (!d.organizations) d.organizations = seed().organizations;
  if (!d.apiKeys) d.apiKeys = seed().apiKeys;
  if (!d.billing) d.billing = seed().billing;
  if (!d.invoices) d.invoices = seed().invoices;
  if (!d.users) d.users = [];
  if (!d.sessions) d.sessions = [];
  return d;
}

/** Test/util: wipe and reseed. */
export function resetDb(): void {
  globalForDb.__waDb = seed();
}

/* -------------------------------------------------------------------------- */
/*  Durable persistence                                                        */
/*                                                                             */
/*  The in-memory `db()` is the working copy. `ensureLoaded()` hydrates it from */
/*  durable storage once per process; `persist()` flushes it back. Both are    */
/*  no-ops when no persistence adapter is configured (pure in-memory mode).    */
/* -------------------------------------------------------------------------- */

let loadPromise: Promise<void> | null = null;

/** Hydrate the in-memory store from durable storage (once per process). */
export function ensureLoaded(): Promise<void> {
  if (!persistenceEnabled()) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = (async () => {
      const snapshot = await loadSnapshot();
      if (snapshot) {
        globalForDb.__waDb = snapshot as unknown as DB;
      } else {
        // First run: seed and write the initial snapshot.
        await saveSnapshot(db() as unknown as Record<string, unknown>);
      }
    })().catch((err) => {
      // Don't wedge the process on a storage hiccup — fall back to memory.
      console.error("[persistence] load failed, using in-memory state", err);
      loadPromise = null;
    });
  }
  return loadPromise;
}

/** Flush the current in-memory state to durable storage. */
export async function persist(): Promise<void> {
  if (!persistenceEnabled()) return;
  try {
    await saveSnapshot(db() as unknown as Record<string, unknown>);
  } catch (err) {
    console.error("[persistence] save failed", err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Activity log                                                               */
/* -------------------------------------------------------------------------- */

export function logActivity(type: string, text: string): void {
  db().activity.unshift({ id: newId("act"), type, text, timestamp: new Date().toISOString() });
  db().activity = db().activity.slice(0, 50);
}

/* -------------------------------------------------------------------------- */
/*  Contacts                                                                   */
/* -------------------------------------------------------------------------- */

export function listContacts(): Contact[] {
  return [...db().contacts].sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
}

export function getContact(id: string): Contact | undefined {
  return db().contacts.find((c) => c.id === id);
}

export function getContactByPhone(phone: string): Contact | undefined {
  return db().contacts.find((c) => c.phone === phone);
}

export function createContact(input: Partial<Contact> & { phone: string; name: string }): Contact {
  const now = new Date().toISOString();
  const contact: Contact = {
    id: newId("ct"),
    name: input.name,
    phone: input.phone,
    email: input.email,
    tags: input.tags ?? [],
    status: input.status ?? "lead",
    createdAt: now,
    lastActiveAt: now,
    attributes: input.attributes ?? {},
  };
  db().contacts.push(contact);
  logActivity("contact", `New contact added: ${contact.name}`);
  return contact;
}

export function updateContact(id: string, patch: Partial<Contact>): Contact | undefined {
  const c = db().contacts.find((x) => x.id === id);
  if (!c) return undefined;
  if (patch.name !== undefined) c.name = patch.name;
  if (patch.email !== undefined) c.email = patch.email;
  if (patch.tags !== undefined) c.tags = patch.tags;
  if (patch.status !== undefined) c.status = patch.status;
  if (patch.attributes !== undefined) c.attributes = { ...c.attributes, ...patch.attributes };
  return c;
}

export function deleteContact(id: string): void {
  db().contacts = db().contacts.filter((c) => c.id !== id);
}

export function upsertContactByPhone(phone: string, name?: string): Contact {
  const existing = getContactByPhone(phone);
  if (existing) {
    existing.lastActiveAt = new Date().toISOString();
    if (name && existing.name.startsWith("+")) existing.name = name;
    return existing;
  }
  return createContact({ phone, name: name || `+${phone}`, status: "lead" });
}

/* -------------------------------------------------------------------------- */
/*  Conversations & messages                                                   */
/* -------------------------------------------------------------------------- */

export function listConversations(): Array<Conversation & { contact?: Contact }> {
  return [...db().conversations]
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    .map((c) => ({ ...c, contact: getContact(c.contactId) }));
}

export function getConversationForContact(contactId: string): Conversation {
  let conv = db().conversations.find((c) => c.contactId === contactId);
  if (!conv) {
    conv = {
      id: newId("cv"),
      contactId,
      status: "open",
      unread: 0,
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: "",
    };
    db().conversations.push(conv);
  }
  return conv;
}

export function getMessages(conversationId: string): Message[] {
  return db()
    .messages.filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function addMessage(input: Omit<Message, "id" | "timestamp"> & { timestamp?: string }): Message {
  const msg: Message = {
    ...input,
    id: newId("msg"),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  db().messages.push(msg);

  const conv = db().conversations.find((c) => c.id === msg.conversationId);
  if (conv) {
    conv.lastMessageAt = msg.timestamp;
    conv.lastMessagePreview = msg.text;
    if (msg.direction === "in") conv.unread += 1;
  }
  return msg;
}

export function markConversationRead(conversationId: string): void {
  const conv = db().conversations.find((c) => c.id === conversationId);
  if (conv) conv.unread = 0;
}

/* -------------------------------------------------------------------------- */
/*  Templates / campaigns / rules / flows / integrations CRUD                  */
/* -------------------------------------------------------------------------- */

export function listTemplates(): Template[] {
  return [...db().templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createTemplate(input: Omit<Template, "id" | "createdAt" | "status">): Template {
  const tpl: Template = { ...input, id: newId("tpl"), status: "pending", createdAt: new Date().toISOString() };
  db().templates.push(tpl);
  return tpl;
}

export function updateTemplate(id: string, patch: Partial<Template>): Template | undefined {
  const tpl = db().templates.find((t) => t.id === id);
  if (tpl) Object.assign(tpl, patch);
  return tpl;
}

export function listCampaigns(): Campaign[] {
  return [...db().campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createCampaign(input: Omit<Campaign, "id" | "createdAt" | "stats">): Campaign {
  const cmp: Campaign = {
    ...input,
    id: newId("cmp"),
    stats: { sent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 },
    createdAt: new Date().toISOString(),
  };
  db().campaigns.push(cmp);
  return cmp;
}

export function updateCampaign(id: string, patch: Partial<Campaign>): Campaign | undefined {
  const cmp = db().campaigns.find((c) => c.id === id);
  if (cmp) Object.assign(cmp, patch);
  return cmp;
}

export function listRules(): AutomationRule[] {
  return [...db().rules].sort((a, b) => a.priority - b.priority);
}

export function createRule(input: Omit<AutomationRule, "id" | "createdAt" | "triggeredCount">): AutomationRule {
  const rule: AutomationRule = { ...input, id: newId("rule"), triggeredCount: 0, createdAt: new Date().toISOString() };
  db().rules.push(rule);
  return rule;
}

export function updateRule(id: string, patch: Partial<AutomationRule>): AutomationRule | undefined {
  const rule = db().rules.find((r) => r.id === id);
  if (rule) Object.assign(rule, patch);
  return rule;
}

export function deleteRule(id: string): void {
  db().rules = db().rules.filter((r) => r.id !== id);
}

export function listFlows(): Flow[] {
  return [...db().flows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createFlow(input: Omit<Flow, "id" | "createdAt" | "enrolledCount" | "completedCount">): Flow {
  const flow: Flow = { ...input, id: newId("flow"), enrolledCount: 0, completedCount: 0, createdAt: new Date().toISOString() };
  db().flows.push(flow);
  return flow;
}

export function updateFlow(id: string, patch: Partial<Flow>): Flow | undefined {
  const flow = db().flows.find((f) => f.id === id);
  if (flow) Object.assign(flow, patch);
  return flow;
}

export function listJobs(): ScheduledJob[] {
  return [...db().jobs].sort((a, b) => a.runAt.localeCompare(b.runAt));
}

export function listIntegrations(): Integration[] {
  return db().integrations;
}

export function getIntegrationByKey(key: string): Integration | undefined {
  return db().integrations.find((i) => i.key === key);
}

/**
 * Mark an integration connected with real, already-validated credentials.
 * Callers must have verified the credentials against the provider's live API
 * (see `src/lib/integration-providers.ts`) before calling this — this
 * function itself does no validation, it only persists the result.
 */
export function connectIntegration(input: {
  key: string; name: string; description: string; category: string;
  credentials: Record<string, string>; accountLabel?: string;
}): Integration {
  const existing = getIntegrationByKey(input.key);
  const now = new Date().toISOString();
  if (existing) {
    existing.name = input.name;
    existing.description = input.description;
    existing.category = input.category;
    existing.connected = true;
    existing.connectedAt = now;
    existing.credentials = input.credentials;
    existing.accountLabel = input.accountLabel;
    return existing;
  }
  const integration: Integration = {
    id: newId("int"),
    key: input.key,
    name: input.name,
    description: input.description,
    category: input.category,
    connected: true,
    connectedAt: now,
    credentials: input.credentials,
    accountLabel: input.accountLabel,
  };
  db().integrations.push(integration);
  return integration;
}

/** Disconnect an integration and wipe its stored credentials — a real revoke, not just a flag flip. */
export function disconnectIntegration(key: string): Integration | undefined {
  const integration = getIntegrationByKey(key);
  if (integration) {
    integration.connected = false;
    integration.connectedAt = undefined;
    integration.credentials = undefined;
    integration.accountLabel = undefined;
  }
  return integration;
}

/** Strip real credentials before sending an integration to the client. */
export function toPublicIntegration(i: Integration): Omit<Integration, "credentials"> & { hasCredentials: boolean } {
  const { credentials, ...rest } = i;
  return { ...rest, hasCredentials: !!credentials && Object.keys(credentials).length > 0 };
}

export function getSettings(): Settings {
  return db().settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  Object.assign(db().settings, patch);
  return db().settings;
}

export function getActivity(): ActivityEvent[] {
  return db().activity.slice(0, 20);
}

/* -------------------------------------------------------------------------- */
/*  Chatbots                                                                    */
/* -------------------------------------------------------------------------- */

export function listChatbots(): Chatbot[] {
  return [...db().chatbots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getChatbot(id: string): Chatbot | undefined {
  return db().chatbots.find((c) => c.id === id);
}

export function createChatbot(input: Partial<Chatbot> & { name: string }): Chatbot {
  const chatbot: Chatbot = {
    id: newId("cb"),
    name: input.name,
    enabled: input.enabled ?? false,
    flowJson: input.flowJson ?? { nodes: [], edges: [] },
    createdAt: new Date().toISOString(),
    triggeredCount: 0,
  };
  db().chatbots.push(chatbot);
  return chatbot;
}

export function updateChatbot(id: string, patch: Partial<Chatbot>): Chatbot | undefined {
  const cb = db().chatbots.find((c) => c.id === id);
  if (cb) Object.assign(cb, patch);
  return cb;
}

export function deleteChatbot(id: string): void {
  db().chatbots = db().chatbots.filter((c) => c.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  Media                                                                       */
/* -------------------------------------------------------------------------- */

export function listMedia(): MediaFile[] {
  return [...db().media].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addMedia(input: Omit<MediaFile, "id" | "createdAt">): MediaFile {
  const file: MediaFile = {
    ...input,
    id: newId("med"),
    createdAt: new Date().toISOString(),
  };
  db().media.push(file);
  return file;
}

/* -------------------------------------------------------------------------- */
/*  Reminders                                                                  */
/* -------------------------------------------------------------------------- */

export function listReminders(): Reminder[] {
  return [...db().reminders].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function createReminder(input: Omit<Reminder, "id" | "createdAt" | "done">): Reminder {
  const reminder: Reminder = { ...input, id: newId("rem"), done: false, createdAt: new Date().toISOString() };
  db().reminders.push(reminder);
  return reminder;
}

export function updateReminder(id: string, patch: Partial<Reminder>): Reminder | undefined {
  const r = db().reminders.find((x) => x.id === id);
  if (r) Object.assign(r, patch);
  return r;
}

export function deleteReminder(id: string): void {
  db().reminders = db().reminders.filter((r) => r.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  Support tickets                                                            */
/* -------------------------------------------------------------------------- */

export function listSupportTickets(): SupportTicket[] {
  return [...db().supportTickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSupportTicket(id: string): SupportTicket | undefined {
  return db().supportTickets.find((t) => t.id === id);
}

export function createSupportTicket(input: { subject: string; message: string; priority: SupportTicketPriority }): SupportTicket {
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: newId("tik"),
    subject: input.subject,
    message: input.message,
    status: "open",
    priority: input.priority,
    replies: [{ id: newId("rep"), from: "user", text: input.message, at: now }],
    createdAt: now,
    updatedAt: now,
  };
  db().supportTickets.push(ticket);
  return ticket;
}

export function updateSupportTicket(id: string, patch: Partial<Pick<SupportTicket, "status" | "priority">>): SupportTicket | undefined {
  const t = db().supportTickets.find((x) => x.id === id);
  if (t) {
    Object.assign(t, patch);
    t.updatedAt = new Date().toISOString();
  }
  return t;
}

export function addSupportReply(id: string, from: "user" | "agent", text: string): SupportTicket | undefined {
  const t = db().supportTickets.find((x) => x.id === id);
  if (!t) return undefined;
  const now = new Date().toISOString();
  t.replies.push({ id: newId("rep"), from, text, at: now });
  t.updatedAt = now;
  if (from === "user" && t.status === "resolved") t.status = "open";
  return t;
}

/* -------------------------------------------------------------------------- */
/*  Groups                                                                     */
/* -------------------------------------------------------------------------- */

export function listGroups(): Array<Group & { contacts: Contact[] }> {
  return [...db().groups]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((g) => ({ ...g, contacts: g.contactIds.map((id) => getContact(id)).filter((c): c is Contact => !!c) }));
}

export function createGroup(input: { name: string; description?: string; contactIds?: string[] }): Group {
  const group: Group = { id: newId("grp"), name: input.name, description: input.description, contactIds: input.contactIds ?? [], createdAt: new Date().toISOString() };
  db().groups.push(group);
  return group;
}

export function updateGroup(id: string, patch: Partial<Group>): Group | undefined {
  const g = db().groups.find((x) => x.id === id);
  if (g) Object.assign(g, patch);
  return g;
}

export function deleteGroup(id: string): void {
  db().groups = db().groups.filter((g) => g.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  Transactions                                                               */
/* -------------------------------------------------------------------------- */

export function listTransactions(): Transaction[] {
  return [...db().transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createTransaction(input: Omit<Transaction, "id" | "createdAt">): Transaction {
  const txn: Transaction = { ...input, id: newId("txn"), createdAt: new Date().toISOString() };
  db().transactions.push(txn);
  return txn;
}

export function updateTransaction(id: string, patch: Partial<Transaction>): Transaction | undefined {
  const t = db().transactions.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  return t;
}

/* -------------------------------------------------------------------------- */
/*  WhatsApp Forms                                                             */
/* -------------------------------------------------------------------------- */

export function listForms(): WaForm[] {
  return [...db().forms].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getForm(id: string): WaForm | undefined {
  return db().forms.find((f) => f.id === id);
}

export function createForm(input: { name: string; description?: string; fields: Omit<WaFormField, "id">[] }): WaForm {
  const form: WaForm = {
    id: newId("frm"),
    name: input.name,
    description: input.description,
    fields: input.fields.map((f) => ({ ...f, id: newId("fld") })),
    published: false,
    submissionCount: 0,
    createdAt: new Date().toISOString(),
  };
  db().forms.push(form);
  return form;
}

export function updateForm(id: string, patch: Partial<Pick<WaForm, "name" | "description" | "published" | "fields">>): WaForm | undefined {
  const f = db().forms.find((x) => x.id === id);
  if (f) Object.assign(f, patch);
  return f;
}

export function deleteForm(id: string): void {
  db().forms = db().forms.filter((f) => f.id !== id);
}

export function submitForm(formId: string, data: Record<string, string>): FormSubmission | undefined {
  const form = getForm(formId);
  if (!form) return undefined;
  const submission: FormSubmission = { id: newId("sub"), formId, data, submittedAt: new Date().toISOString() };
  db().formSubmissions.push(submission);
  form.submissionCount += 1;
  return submission;
}

export function listFormSubmissions(formId: string): FormSubmission[] {
  return db().formSubmissions.filter((s) => s.formId === formId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/* -------------------------------------------------------------------------- */
/*  Canned messages                                                            */
/* -------------------------------------------------------------------------- */

export function listCannedMessages(): CannedMessage[] {
  return [...db().cannedMessages].sort((a, b) => a.shortcut.localeCompare(b.shortcut));
}

export function createCannedMessage(input: Omit<CannedMessage, "id" | "createdAt">): CannedMessage {
  const msg: CannedMessage = { ...input, id: newId("cnd"), createdAt: new Date().toISOString() };
  db().cannedMessages.push(msg);
  return msg;
}

export function updateCannedMessage(id: string, patch: Partial<CannedMessage>): CannedMessage | undefined {
  const m = db().cannedMessages.find((x) => x.id === id);
  if (m) Object.assign(m, patch);
  return m;
}

export function deleteCannedMessage(id: string): void {
  db().cannedMessages = db().cannedMessages.filter((m) => m.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  Tags                                                                       */
/* -------------------------------------------------------------------------- */

export function listTagDefs(): Array<TagDef & { count: number }> {
  const contacts = db().contacts;
  return [...db().tagDefs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ ...t, count: contacts.filter((c) => c.tags.includes(t.name)).length }));
}

export function createTagDef(input: { name: string; color: string }): TagDef {
  const tag: TagDef = { id: newId("tag"), name: input.name, color: input.color, createdAt: new Date().toISOString() };
  db().tagDefs.push(tag);
  return tag;
}

export function deleteTagDef(id: string): void {
  const tag = db().tagDefs.find((t) => t.id === id);
  db().tagDefs = db().tagDefs.filter((t) => t.id !== id);
  if (tag) {
    for (const c of db().contacts) c.tags = c.tags.filter((t) => t !== tag.name);
  }
}

/* -------------------------------------------------------------------------- */
/*  Custom fields (Columns)                                                    */
/* -------------------------------------------------------------------------- */

export function listCustomFields(): CustomField[] {
  return [...db().customFields].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function createCustomField(input: Omit<CustomField, "id" | "createdAt">): CustomField {
  const field: CustomField = { ...input, id: newId("col"), createdAt: new Date().toISOString() };
  db().customFields.push(field);
  return field;
}

export function deleteCustomField(id: string): void {
  db().customFields = db().customFields.filter((f) => f.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  Webhook events                                                             */
/* -------------------------------------------------------------------------- */

export function listWebhookEvents(): WebhookEvent[] {
  return [...db().webhookEvents].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 200);
}

export function logWebhookEvent(input: Omit<WebhookEvent, "id" | "receivedAt">): WebhookEvent {
  const event: WebhookEvent = { ...input, id: newId("whk"), receivedAt: new Date().toISOString() };
  db().webhookEvents.unshift(event);
  db().webhookEvents = db().webhookEvents.slice(0, 200);
  return event;
}

/* -------------------------------------------------------------------------- */
/*  Commerce: products & orders                                                */
/* -------------------------------------------------------------------------- */

export function listProducts(): Product[] {
  return [...db().products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createProduct(input: Omit<Product, "id" | "createdAt">): Product {
  const product: Product = { ...input, id: newId("prd"), createdAt: new Date().toISOString() };
  db().products.push(product);
  return product;
}

export function updateProduct(id: string, patch: Partial<Product>): Product | undefined {
  const p = db().products.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  return p;
}

export function deleteProduct(id: string): void {
  db().products = db().products.filter((p) => p.id !== id);
}

export function listOrders(): Order[] {
  return [...db().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createOrder(input: Omit<Order, "id" | "createdAt">): Order {
  const order: Order = { ...input, id: newId("ord"), createdAt: new Date().toISOString() };
  db().orders.push(order);
  return order;
}

export function updateOrder(id: string, patch: Partial<Order>): Order | undefined {
  const o = db().orders.find((x) => x.id === id);
  if (o) Object.assign(o, patch);
  return o;
}

/* -------------------------------------------------------------------------- */
/*  FAQ bot                                                                    */
/* -------------------------------------------------------------------------- */

export function listFaqs(): Faq[] {
  return [...db().faqs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createFaq(input: Omit<Faq, "id" | "createdAt" | "triggeredCount">): Faq {
  const faq: Faq = { ...input, id: newId("faq"), triggeredCount: 0, createdAt: new Date().toISOString() };
  db().faqs.push(faq);
  return faq;
}

export function updateFaq(id: string, patch: Partial<Faq>): Faq | undefined {
  const f = db().faqs.find((x) => x.id === id);
  if (f) Object.assign(f, patch);
  return f;
}

export function deleteFaq(id: string): void {
  db().faqs = db().faqs.filter((f) => f.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  AI Assistant                                                               */
/* -------------------------------------------------------------------------- */

export function getAiAssistant(): AiAssistantConfig {
  return db().aiAssistant;
}

export function updateAiAssistant(patch: Partial<AiAssistantConfig>): AiAssistantConfig {
  Object.assign(db().aiAssistant, patch);
  return db().aiAssistant;
}

/* -------------------------------------------------------------------------- */
/*  Organizations                                                              */
/* -------------------------------------------------------------------------- */

export function listOrganizations(): Organization[] {
  return db().organizations;
}

export function addOrgMember(orgId: string, input: { name: string; email: string; role: OrgRole }): OrgMember | undefined {
  const org = db().organizations.find((o) => o.id === orgId);
  if (!org) return undefined;
  const member: OrgMember = { id: newId("mem"), name: input.name, email: input.email, role: input.role, joinedAt: new Date().toISOString() };
  org.members.push(member);
  return member;
}

export function updateOrgMember(orgId: string, memberId: string, patch: Partial<Pick<OrgMember, "role">>): OrgMember | undefined {
  const org = db().organizations.find((o) => o.id === orgId);
  const member = org?.members.find((m) => m.id === memberId);
  if (member) Object.assign(member, patch);
  return member;
}

export function removeOrgMember(orgId: string, memberId: string): void {
  const org = db().organizations.find((o) => o.id === orgId);
  if (org) org.members = org.members.filter((m) => m.id !== memberId);
}

export function updateOrganization(orgId: string, patch: Partial<Pick<Organization, "name" | "plan">>): Organization | undefined {
  const org = db().organizations.find((o) => o.id === orgId);
  if (org) Object.assign(org, patch);
  return org;
}

/* -------------------------------------------------------------------------- */
/*  API keys                                                                   */
/* -------------------------------------------------------------------------- */

export function listApiKeys(): ApiKeyRecord[] {
  return [...db().apiKeys].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createApiKey(input: { name: string; scopes: string[] }): ApiKeyRecord {
  const key: ApiKeyRecord = {
    id: newId("key"),
    name: input.name,
    key: `wfa_live_${randomUUID().replace(/-/g, "")}`,
    scopes: input.scopes,
    revoked: false,
    createdAt: new Date().toISOString(),
  };
  db().apiKeys.push(key);
  return key;
}

export function revokeApiKey(id: string): ApiKeyRecord | undefined {
  const key = db().apiKeys.find((k) => k.id === id);
  if (key) key.revoked = true;
  return key;
}

export function deleteApiKey(id: string): void {
  db().apiKeys = db().apiKeys.filter((k) => k.id !== id);
}

/* -------------------------------------------------------------------------- */
/*  Billing                                                                    */
/* -------------------------------------------------------------------------- */

export function getBilling(): BillingInfo {
  return db().billing;
}

export function updateBilling(patch: Partial<BillingInfo>): BillingInfo {
  Object.assign(db().billing, patch);
  return db().billing;
}

export function listInvoices(): Invoice[] {
  return [...db().invoices].sort((a, b) => b.date.localeCompare(a.date));
}

/* -------------------------------------------------------------------------- */
/*  Users & sessions (auth)                                                    */
/* -------------------------------------------------------------------------- */

export function getUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return db().users.find((u) => u.email === normalized);
}

export function getUserById(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}

export function createUser(input: {
  firstName: string; lastName: string; email: string;
  companyName?: string; phone?: string; passwordHash: string;
}): User {
  const user: User = {
    id: newId("usr"),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.trim().toLowerCase(),
    companyName: input.companyName,
    phone: input.phone,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };
  db().users.push(user);
  return user;
}

/** Strip the password hash before sending a user to the client. */
export function toPublicUser(u: User): Omit<User, "passwordHash"> {
  const { passwordHash: _passwordHash, ...rest } = u;
  return rest;
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createSession(userId: string): Session {
  const now = Date.now();
  const session: Session = {
    token: `${randomUUID()}${randomUUID()}`.replace(/-/g, ""),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_LIFETIME_MS).toISOString(),
  };
  db().sessions.push(session);
  return session;
}

export function getSession(token: string): Session | undefined {
  const session = db().sessions.find((s) => s.token === token);
  if (!session) return undefined;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return undefined;
  }
  return session;
}

export function deleteSession(token: string): void {
  db().sessions = db().sessions.filter((s) => s.token !== token);
}