import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUser, deleteUser, listUsers, getUserByEmail } from "@/lib/repository";
import { Role, ROLE_LABELS } from "@/types/iot";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FLEET_COMMANDER") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FLEET_COMMANDER") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const allowedRoles = Object.keys(ROLE_LABELS) as Role[];
  const role = allowedRoles.includes(body.role as Role) ? (body.role as Role) : "ARMADA_DRIVER";

  if (!name || !email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Nama, email, dan kata sandi minimal 8 karakter wajib diisi." },
      { status: 400 }
    );
  }
  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
  }

  const created = await createUser({ name, email, password, role });
  return NextResponse.json({ user: created }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FLEET_COMMANDER") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID pengguna wajib diisi." }, { status: 400 });
  if (id === user.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri." }, { status: 400 });
  }

  const deleted = await deleteUser(id);
  if (!deleted) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
