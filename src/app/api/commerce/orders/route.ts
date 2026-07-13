import { createOrder, ensureLoaded, listOrders, persist, updateOrder, type OrderItem, type OrderStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ orders: listOrders() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { contactName?: string; contactId?: string; items?: OrderItem[]; currency?: string; status?: OrderStatus };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.contactName || !body.items?.length) {
    return Response.json({ ok: false, error: "`contactName` and at least one item are required" }, { status: 400 });
  }
  const total = body.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const order = createOrder({
    contactId: body.contactId,
    contactName: body.contactName,
    items: body.items,
    total,
    currency: body.currency ?? "USD",
    status: body.status ?? "pending",
  });
  await persist();
  return Response.json({ ok: true, order }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...patch } = body;
  if (!id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const order = updateOrder(id, patch);
  if (!order) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, order });
}
