import {
  addOrgMember, ensureLoaded, listOrganizations, persist, removeOrgMember, updateOrgMember, updateOrganization,
  type OrgRole,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await ensureLoaded();
  return Response.json({ organizations: listOrganizations() });
}

/** Add a member to an org, or update org name/plan (pass `orgId` + `name`/`plan` and no `email`). */
export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { orgId?: string; name?: string; email?: string; role?: OrgRole; plan?: string };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.orgId) return Response.json({ ok: false, error: "`orgId` is required" }, { status: 400 });

  if (body.email) {
    const member = addOrgMember(body.orgId, { name: body.name ?? body.email, email: body.email, role: body.role ?? "member" });
    if (!member) return Response.json({ ok: false, error: "Org not found" }, { status: 404 });
    await persist();
    return Response.json({ ok: true, member }, { status: 201 });
  }

  const org = updateOrganization(body.orgId, { name: body.name, plan: body.plan });
  if (!org) return Response.json({ ok: false, error: "Org not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, org });
}

export async function PATCH(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: { orgId?: string; memberId?: string; role?: OrgRole };
  try { body = await request.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.orgId || !body.memberId || !body.role) {
    return Response.json({ ok: false, error: "`orgId`, `memberId` and `role` are required" }, { status: 400 });
  }
  const member = updateOrgMember(body.orgId, body.memberId, { role: body.role });
  if (!member) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  await persist();
  return Response.json({ ok: true, member });
}

export async function DELETE(request: Request): Promise<Response> {
  await ensureLoaded();
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  const memberId = searchParams.get("memberId");
  if (!orgId || !memberId) return Response.json({ ok: false, error: "`orgId` and `memberId` query params required" }, { status: 400 });
  removeOrgMember(orgId, memberId);
  await persist();
  return Response.json({ ok: true });
}
