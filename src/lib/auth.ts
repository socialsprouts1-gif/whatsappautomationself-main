/**
 * Password hashing and cookie-based session management.
 *
 * Passwords are hashed with scrypt (Node's built-in `crypto`, no extra
 * dependency) using a random salt per user, stored as `salt:hash` hex. Sessions
 * are opaque random tokens stored server-side in the store and referenced by
 * an httpOnly cookie — the cookie itself carries no user data.
 *
 * Server-only: uses `node:crypto` and `next/headers`. Do not import from a
 * "use client" component.
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createSession, deleteSession, getSession, getUserById, type User } from "@/lib/store";

const SESSION_COOKIE = "wfa_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** Emails allowed into `/admin`. Checked live against the logged-in user's
 * email — not a stored flag — so adding an admin is just editing this list. */
const ADMIN_EMAILS = ["developerneuraxine@gmail.com"];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/** Create a session for this user and set the session cookie on the response. */
export async function startSession(userId: string): Promise<void> {
  const session = createSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Destroy the current session, both server-side and the cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  store.delete(SESSION_COOKIE);
}

/** Resolve the logged-in user from the session cookie, or `undefined` if not authenticated. */
export async function getCurrentUser(): Promise<User | undefined> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  const session = getSession(token);
  if (!session) return undefined;
  return getUserById(session.userId);
}
