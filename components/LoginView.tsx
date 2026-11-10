"use client";

import { useState } from "react";
import { User } from "@/types/iot";
import { DEFAULT_USERS, saveUser } from "@/lib/storage";
import {
  Activity,
  Lock,
  Mail,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Truck,
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<User["role"]>("Fleet Commander");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Harap masukkan email dan kata sandi.");
      return;
    }

    if (isRegister) {
      if (!name) {
        setErrorMsg("Harap masukkan nama lengkap Anda.");
        return;
      }
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name,
        email,
        role,
        avatar: name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };
      saveUser(newUser);
      onLoginSuccess(newUser);
    } else {
      // Find matching user or allow demo password
      const found = DEFAULT_USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (found) {
        saveUser(found);
        onLoginSuccess(found);
      } else {
        // Allow dynamic login for custom email
        const fallbackUser: User = {
          id: `usr-${Date.now()}`,
          name: email.split("@")[0].toUpperCase(),
          email,
          role: "Fleet Commander",
          avatar: email.slice(0, 2).toUpperCase(),
        };
        saveUser(fallbackUser);
        onLoginSuccess(fallbackUser);
      }
    }
  };

  const handleQuickDemoLogin = (user: User) => {
    saveUser(user);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient neon glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Card Frame */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 p-[2px] shadow-xl shadow-indigo-950/60 mb-3">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Activity className="w-7 h-7 text-sky-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Vehicle Passenger Weight Safety System
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Fleet IoT Overload Prevention &amp; Telemetry Gateway
            </p>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mb-6 p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Akses Cepat Demo (1-Click Login):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin(DEFAULT_USERS[0])}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-left transition-colors group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-sky-300">
                    Admin Armada
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Bintang Shada
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin(DEFAULT_USERS[1])}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-left transition-colors group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                    Driver Armada
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Budi Santoso
                  </div>
                </div>
                <Truck className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Tab Switcher: Login / Register */}
          <div className="flex border-b border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMsg("");
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold transition-all border-b-2 ${
                !isRegister
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMsg("");
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold transition-all border-b-2 ${
                isRegister
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Daftar Petugas Baru
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <>
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Raden Mas Bintang"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Peran / Otoritas
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as User["role"])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                  >
                    <option value="Fleet Commander">Fleet Commander (Super Admin)</option>
                    <option value="Safety Officer">Safety Officer (Inspektur Beban)</option>
                    <option value="Armada Driver">Armada Driver (Operator Kendaraan)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@safetycar.id"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-950/60 transition-all flex items-center justify-center gap-2 group"
            >
              <span>{isRegister ? "Daftarkan & Masuk" : "Masuk ke Dashboard"}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          {/* Footer security note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Koneksi Terenkripsi TLS/WSS &bull; IoT Safety Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}

