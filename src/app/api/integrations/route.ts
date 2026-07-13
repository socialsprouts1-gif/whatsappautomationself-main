import { connectIntegration, disconnectIntegration, ensureLoaded, listIntegrations, persist, toPublicIntegration } from "@/lib/store";
import { validateIntegration } from "@/lib/integration-providers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ integrations: listIntegrations().map(toPublicIntegration) });
}

/**
 * Connect an integration by its catalog `key`. The submitted `credentials`
 * are validated against the provider's real API (see integration-providers.ts)
 * — nothing is marked "connected" unless the provider actually accepts them.
 */
export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { key?: string; name?: string; description?: string; category?: string; credentials?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.key || !body.name) {
    return Response.json({ ok: false, error: "`key` and `name` are required" }, { status: 400 });
  }

  const credentials = body.credentials ?? {};
  const result = await validateIntegration(body.key, credentials);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error ?? "Could not verify these credentials." }, { status: 422 });
  }

  const integration = connectIntegration({
    key: body.key,
    name: body.name,
    description: body.description ?? "",
    category: body.category ?? "Other",
    credentials,
    accountLabel: result.accountLabel,
  });
  await persist();
  return Response.json({ ok: true, integration: toPublicIntegration(integration) });
}

/** Disconnect an integration by key — clears stored credentials, not just a flag. */
export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { key?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.key) return Response.json({ ok: false, error: "`key` is required" }, { status: 400 });

  const integration = disconnectIntegration(body.key);
  if (!integration) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, integration: toPublicIntegration(integration) });
}
