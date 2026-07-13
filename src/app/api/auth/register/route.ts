import { createUser, ensureLoaded, getUserByEmail, persist, toPublicUser } from "@/lib/store";
import { hashPassword, startSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  await ensureLoaded();
  let body: {
    firstName?: string; lastName?: string; email?: string;
    companyName?: string; phone?: string; password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!firstName || !lastName || !email || !password) {
    return Response.json({ ok: false, error: "First name, last name, email and password are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (getUserByEmail(email)) {
    return Response.json({ ok: false, error: "An account with this email already exists — try signing in instead." }, { status: 409 });
  }

  const user = createUser({
    firstName, lastName, email,
    companyName: body.companyName?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    passwordHash: hashPassword(password),
  });
  await startSession(user.id);
  await persist();

  return Response.json({ ok: true, user: toPublicUser(user) }, { status: 201 });
}
