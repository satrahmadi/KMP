import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const COOKIE_NAME = "kmp_session";
const SESSION_TTL_DAYS = 7;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await db.session.create({ data: { userId, expiresAt } });

  const token = await new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return session;
}

export type CurrentSession = {
  sessionId: string;
  companyId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    status: "unverified" | "active" | "suspended";
    isSuperadmin: boolean;
  };
};

export async function getSession(): Promise<CurrentSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let sid: string;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    sid = payload.sid as string;
    if (!sid) return null;
  } catch {
    return null;
  }

  const session = await db.session.findUnique({ where: { id: sid }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // Live status check on every request — this is what makes Superadmin
  // suspend actions take effect immediately instead of waiting for token expiry.
  if (session.user.status === "suspended") {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    sessionId: session.id,
    companyId: session.companyId,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status,
      isSuperadmin: session.user.isSuperadmin,
    },
  };
}

export async function setActiveCompany(companyId: string) {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return;
  const { payload } = await jwtVerify(token, secretKey());
  const sid = payload.sid as string;
  await db.session.update({ where: { id: sid }, data: { companyId } });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey());
      const sid = payload.sid as string;
      if (sid) await db.session.delete({ where: { id: sid } }).catch(() => {});
    } catch {
      // ignore invalid token
    }
  }
  store.delete(COOKIE_NAME);
}

/** Ends every active session for a user — used on password reset and Superadmin suspend. */
export async function destroyAllSessionsForUser(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

/**
 * Knocks every session out of a suspended company's active context (§11: access must be
 * cut immediately). Login itself is left intact — a member with another active company
 * falls back to it, and a member with none lands on the "Company dinonaktifkan" screen —
 * unlike a suspended *user* (destroyAllSessionsForUser), where the whole session dies.
 */
export async function clearCompanyFromSessions(companyId: string) {
  await db.session.updateMany({ where: { companyId }, data: { companyId: null } });
}
