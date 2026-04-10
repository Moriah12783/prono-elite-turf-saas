import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth-config";
import { getPrisma } from "@/lib/prisma";
import { decodeSession, encodeSession, type SessionPayload } from "@/lib/session";

export async function createUserSession(payload: Omit<SessionPayload, "exp">) {
  const cookieStore = await cookies();
  const token = encodeSession({
    ...payload,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  return user;
}
