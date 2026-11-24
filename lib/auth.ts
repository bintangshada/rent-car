import { cookies } from "next/headers";
import { getUserById } from "@/lib/repository";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { Role, User } from "@/types/iot";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const session = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await getUserById(session.userId);
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function canManageFleet(role: Role): boolean {
  return role === "FLEET_COMMANDER" || role === "SAFETY_OFFICER";
}
