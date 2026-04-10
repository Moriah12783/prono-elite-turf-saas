import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthSecret } from "@/lib/auth-config";

export type SessionPayload = {
  userId: string;
  role: string;
  email: string;
  name: string;
  exp: number;
};

function sign(value: string): string {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function isSessionPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SessionPayload).userId === "string" &&
    typeof (value as SessionPayload).role === "string" &&
    typeof (value as SessionPayload).email === "string" &&
    typeof (value as SessionPayload).name === "string" &&
    typeof (value as SessionPayload).exp === "number" &&
    Number.isFinite((value as SessionPayload).exp)
  );
}

export function encodeSession(payload: SessionPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;

    if (!isSessionPayload(parsed)) {
      return null;
    }

    if (parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
