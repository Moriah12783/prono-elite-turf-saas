import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth-config";
import { getPrisma } from "@/lib/prisma";
import { decodeSession, encodeSession, type SessionPayload } from "@/lib/session";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function createUserSession(payload: Omit<SessionPayload, "exp">): Promise<void> {
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

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/" });
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
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

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
    redirect("/login");
  }

  return user;
}
