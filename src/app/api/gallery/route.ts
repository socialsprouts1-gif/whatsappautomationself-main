import { NextResponse } from "next/server";
import { ensureLoaded, persist, listMedia, addMedia } from "@/lib/store";

export async function GET() {
  await ensureLoaded();
  return NextResponse.json({ media: listMedia() });
}

export async function POST(req: Request) {
  await ensureLoaded();
  const body = await req.json();
  const file = addMedia({
    filename: body.filename || "untitled",
    type: body.type || "image",
    size: body.size || 0,
    url: body.url || "",
  });
  await persist();
  return NextResponse.json({ file });
}
