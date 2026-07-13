import { ensureLoaded, getBilling, listInvoices, persist, updateBilling } from "@/lib/store";

export const dynamic = "force-dynamic";

const PLAN_PRICES: Record<string, number> = { Starter: 29, Growth: 79, Agency: 199 };

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ billing: getBilling(), invoices: listInvoices() });
}

/** Simulate a plan change (no real payment processor wired up). */
export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { plan?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.plan || !(body.plan in PLAN_PRICES)) {
    return Response.json({ ok: false, error: "`plan` must be one of Starter, Growth, Agency" }, { status: 400 });
  }
  const billing = updateBilling({ plan: body.plan, priceMonthly: PLAN_PRICES[body.plan] });
  await persist();
  return Response.json({ ok: true, billing });
}
