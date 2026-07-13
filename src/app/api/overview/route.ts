import {
  db,
  ensureLoaded,
  getActivity,
  listCampaigns,
  listChatbots,
  listContacts,
  listConversations,
  listRules,
} from "@/lib/store";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Summary payload for the main dashboard. */
export async function GET(): Promise<Response> {
  await ensureLoaded();
  const campaigns = listCampaigns();
  const contacts = listContacts();
  const conversations = listConversations();
  const chatbots = listChatbots();
  const outbound = db().messages.filter((m) => m.direction === "out").length;

  const campaignSent = campaigns.reduce((a, c) => a + c.stats.sent, 0);
  const unread = conversations.reduce((a, c) => a + c.unread, 0);
  const activeRules = listRules().filter((r) => r.enabled).length;
  const activeChatbots = chatbots.filter((c) => c.enabled).length;
  const totalChatbotTriggers = chatbots.reduce((a, c) => a + (c.triggeredCount ?? 0), 0);

  // Real 7-day message volume from store
  const now = Date.now();
  const spark = Array.from({ length: 7 }).map((_, i) => {
    const dayStart = now - (6 - i) * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    return db().messages.filter((m) => {
      const t = new Date(m.timestamp).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
  });

  return Response.json({
    stats: {
      messagesSent: campaignSent + outbound,
      contacts: contacts.length,
      activeCampaigns: campaigns.filter((c) => c.status === "sending").length,
      unreadConversations: unread,
      activeRules,
      automationsRun: listRules().reduce((a, r) => a + r.triggeredCount, 0),
      activeChatbots,
      totalChatbots: chatbots.length,
      chatbotTriggers: totalChatbotTriggers,
      whatsappConnected: isWhatsAppConfigured(),
    },
    spark,
    recentConversations: conversations.slice(0, 5),
    activity: getActivity(),
  });
}