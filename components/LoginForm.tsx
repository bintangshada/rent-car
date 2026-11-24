"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Gauge,
  Loader2,
  LockKeyhole,
  Mail,
  MapPinned,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { User } from "@/types/iot";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as { error?: string; user?: User };
      if (!response.ok) {
        setError(data.error ?? "Permintaan gagal.");
        return;
      }

      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setMode("login");
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/30">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">FleetSync</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400">
              IoT Telemetry Platform
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="chip border border-brand-400/30 bg-brand-400/10 text-brand-200">
            REAL-TIME FLEET INTELLIGENCE
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight">
            Satu dashboard untuk beban, posisi, dan kendali armada rental Anda.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Pantau beban penumpang, lacak lokasi GPS langsung, dan amankan kendaraan dengan
            perintah mati/nyalakan motor jarak jauh melalui MQTT.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              { icon: Scale, label: "Monitoring Beban" },
              { icon: MapPinned, label: "Live Tracking" },
              { icon: Gauge, label: "Kendali Motor" },
              { icon: ShieldCheck, label: "Audit Log" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <Icon className="h-4 w-4 text-brand-300" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} FleetSync · Sistem Keamanan Armada
        </p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">FleetSync</span>
          </div>

          <div className="panel p-7 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === "login" ? "Selamat datang kembali" : "Buat akun baru"}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {mode === "login"
                ? "Masuk untuk mengakses dashboard telemetri armada."
                : "Registrasi otomatis menggunakan peran Armada Driver."}
            </p>

            <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setError("");
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    mode === item
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {item === "login" ? "Masuk" : "Daftar"}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && (
                <div>
                  <label className="field-label" htmlFor="name">
                    Nama lengkap
                  </label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name"
                      className="field-input pl-9"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Nama petugas"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="email">
                  Alamat email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="field-input pl-9"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@perusahaan.id"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="password">
                  Kata sandi
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="field-input pl-9"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {mode === "login" ? "Masuk ke dashboard" : "Daftar dan masuk"}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Akun demo (klik untuk mengisi)
              </p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => fillDemo("admin@safetycar.id", "Admin123!")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-xs transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="font-semibold text-slate-700">Fleet Commander</span>
                  <span className="font-mono text-[11px] text-slate-400">Admin123!</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("driver@safetycar.id", "Driver123!")}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-xs transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="font-semibold text-slate-700">Armada Driver</span>
                  <span className="font-mono text-[11px] text-slate-400">Driver123!</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
