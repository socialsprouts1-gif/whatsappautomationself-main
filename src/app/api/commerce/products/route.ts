import { createProduct, deleteProduct, ensureLoaded, listProducts, persist, updateProduct } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ products: listProducts() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { name?: string; sku?: string; price?: number; currency?: string; stock?: number; imageUrl?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name || body.price === undefined) {
    return Response.json({ ok: false, error: "`name` and `price` are required" }, { status: 400 });
  }
  const product = createProduct({
    name: body.name,
    sku: body.sku ?? `SKU-${Math.floor(Math.random() * 90000 + 10000)}`,
    price: body.price,
    currency: body.currency ?? "USD",
    stock: body.stock ?? 0,
    imageUrl: body.imageUrl,
  });
  await persist();
  return Response.json({ ok: true, product }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { id?: string; [key: string]: unknown };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const { id, ...patch } = body;
  if (!id) return Response.json({ ok: false, error: "`id` is required" }, { status: 400 });
  const product = updateProduct(id, patch);
  if (!product) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, product });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "`id` query param required" }, { status: 400 });
  deleteProduct(id);
  await persist();
  return Response.json({ ok: true });
}
