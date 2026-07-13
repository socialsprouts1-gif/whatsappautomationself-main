import { NextResponse } from "next/server";
import { ensureLoaded, persist, getChatbot, updateChatbot, deleteChatbot } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureLoaded();
  const { id } = await params;
  const chatbot = getChatbot(id);
  if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ chatbot });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureLoaded();
  const { id } = await params;
  const body = await req.json();
  const chatbot = updateChatbot(id, body);
  if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await persist();
  return NextResponse.json({ chatbot });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureLoaded();
  const { id } = await params;
  deleteChatbot(id);
  await persist();
  return NextResponse.json({ ok: true });
}
