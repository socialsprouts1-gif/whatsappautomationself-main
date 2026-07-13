export const dynamic = "force-dynamic";

export function GET(): Response {
  const appId = process.env.META_APP_ID;
  return Response.json({ appId: appId ?? null, configured: !!appId });
}
