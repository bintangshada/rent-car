import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/repository";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSessionToken } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!name || !email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Nama, email, dan kata sandi minimal 8 karakter wajib diisi." },
      { status: 400 }
    );
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
  }

  const user = await createUser({ name, email, password, role: "ARMADA_DRIVER" });
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ user }, { status: 201 });
}
