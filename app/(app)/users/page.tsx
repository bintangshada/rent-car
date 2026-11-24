"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { ROLE_LABELS, Role, User } from "@/types/iot";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ARMADA_DRIVER" as Role,
  });

  async function load() {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (response.ok) {
      const body = (await response.json()) as { users: User[] };
      setUsers(body.users);
    }
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Gagal membuat pengguna.");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "ARMADA_DRIVER" });
    setMessage("Pengguna baru berhasil dibuat.");
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus pengguna ini?")) return;
    const response = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) setMessage(body.error ?? "Gagal menghapus pengguna.");
    else setMessage("Pengguna dihapus.");
    await load();
  }

  return (
    <>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun dan hak akses pengguna sistem."
      />

      {message && (
        <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-medium text-brand-700">
          {message}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Daftar Pengguna" description={`${users.length} akun terdaftar.`} className="lg:col-span-2">
          {loading ? (
            <div className="h-64 animate-pulse bg-slate-50" />
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {user.avatar}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="chip bg-slate-100 text-slate-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {ROLE_LABELS[user.role]}
                    </span>
                    <button
                      onClick={() => void remove(user.id)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-rose-300 hover:text-rose-600"
                      title="Hapus pengguna"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Tambah Pengguna" description="Password minimal 8 karakter.">
          <form onSubmit={create} className="space-y-4 p-5">
            <div>
              <label className="field-label">Nama lengkap</label>
              <input
                className="field-input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label">Kata sandi</label>
              <input
                type="password"
                minLength={8}
                className="field-input"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="field-label">Peran</label>
              <select
                className="field-input"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              <Plus className="h-4 w-4" /> Buat Akun
            </button>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <UsersRound className="h-3.5 w-3.5" /> Password disimpan dalam bentuk hash bcrypt.
            </p>
          </form>
        </Panel>
      </div>
    </>
  );
}
