import { NextResponse } from "next/server";
import { db, newId, ensureLoaded, persist } from "@/lib/store";

export async function GET() {
  await ensureLoaded();
  return NextResponse.json({ chatbots: db().chatbots });
}

export async function POST(req: Request) {
  await ensureLoaded();
  const body = await req.json();
  const chatbot = {
    id: newId("cb"),
    name: body.name || "New Chatbot",
    enabled: false,
    flowJson: body.flowJson || { nodes: [], edges: [] },
    createdAt: new Date().toISOString(),
    triggeredCount: 0,
  };
  db().chatbots.push(chatbot);
  await persist();
  return NextResponse.json({ chatbot });
}
