import { createTransaction, ensureLoaded, listTransactions, persist, type TransactionStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ transactions: listTransactions() });
}

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: {
    contactName?: string; contactId?: string; amount?: number; currency?: string;
    status?: TransactionStatus; method?: string; reference?: string;
  };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.contactName || !body.amount) {
    return Response.json({ ok: false, error: "`contactName` and `amount` are required" }, { status: 400 });
  }
  const transaction = createTransaction({
    contactId: body.contactId,
    contactName: body.contactName,
    amount: body.amount,
    currency: body.currency ?? "USD",
    status: body.status ?? "pending",
    method: body.method ?? "Card",
    reference: body.reference ?? `PAY-${Math.floor(Math.random() * 90000 + 10000)}`,
  });
  await persist();
  return Response.json({ ok: true, transaction }, { status: 201 });
}
