import { jwtVerify, SignJWT } from "jose";
import { Role } from "@/types/iot";

export const SESSION_COOKIE = "rentcar_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "development-only-secret-ganti-di-produksi";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      userId: payload.sub,
      email: payload.email as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}
