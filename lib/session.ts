import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { db } from "@/lib/db";

export type SessionPayload = { userId: string; role: "ADMIN" | "AGENT" };

const COOKIE_NAME = "session";

function getCookieFromHeader(header: string | null): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === COOKIE_NAME) {
      const raw = part.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        // Malformed percent-encoding (e.g. "session=%") — treat as no session.
        return undefined;
      }
    }
  }
  return undefined;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

// `response`, when provided, is a NextResponse whose outgoing `Set-Cookie` header we
// write directly. This is required because `cookies()` from `next/headers` relies on
// Next's request-scoped AsyncLocalStorage, which is only populated when the framework
// itself is dispatching the request. Route handlers invoked directly (as in our tests)
// have no such scope, so `cookies().set(...)` throws "called outside a request scope."
// Writing to a NextResponse's `.cookies` works in both real requests and direct calls.
export async function setSessionCookie(payload: SessionPayload, response?: NextResponse) {
  const value = signSession(payload);
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
  if (response) {
    response.cookies.set(COOKIE_NAME, value, options);
    return;
  }
  const store = await cookies();
  store.set(COOKIE_NAME, value, options);
}

export async function clearSessionCookie(response?: NextResponse) {
  if (response) {
    response.cookies.delete(COOKIE_NAME);
    return;
  }
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// `request`, when provided, is used to read the `session` cookie directly from the
// `Cookie` request header. This avoids the same request-scope problem described above:
// `cookies()` from `next/headers` only works when Next itself is dispatching the
// request. Route handlers should always pass their `request` through so tests (and any
// other direct invocation) work; the next/headers fallback remains for callers that
// have no Request object (e.g. Server Components).
export async function getSessionUser(request?: Request) {
  let token: string | undefined;
  if (request) {
    token = getCookieFromHeader(request.headers.get("cookie"));
  } else {
    const store = await cookies();
    token = store.get(COOKIE_NAME)?.value;
  }
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.active) return null;
  // Agents can be de-approved after already having a valid session; re-check on every
  // authenticated request rather than only at login time.
  if (user.role === "AGENT" && !user.approved) return null;
  return user;
}

export function requireRole<T extends { role: "ADMIN" | "AGENT" }>(
  user: T | null,
  role: "ADMIN" | "AGENT"
): T | null {
  if (!user || user.role !== role) return null;
  return user;
}
