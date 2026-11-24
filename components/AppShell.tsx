"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BellRing,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MapPinned,
  Menu,
  Power,
  Scale,
  Settings2,
  Truck,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { ROLE_LABELS, User } from "@/types/iot";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Armada", icon: Truck },
  { href: "/tracking", label: "Live Tracking", icon: MapPinned },
  { href: "/weight", label: "Monitoring Beban", icon: Scale },
  { href: "/control", label: "Kontrol Motor", icon: Power },
  { href: "/logs", label: "Audit Log", icon: ListFilter },
];

export default function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, toggleDemo, liveStatus } = useTelemetry();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setSidebarOpen(false));
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  const section = pathname.startsWith("/vehicles/new")
    ? "Tambah Kendaraan"
    : pathname.startsWith("/vehicles/")
    ? "Detail Kendaraan"
    : pathname.startsWith("/settings")
    ? "Pengaturan & Firmware"
    : pathname.startsWith("/users")
    ? "Manajemen Pengguna"
    : current?.label ?? "Dashboard";
  const overloadCount = data?.vehicles.filter((v) => v.telemetry.status === "OVERLOAD").length ?? 0;
  const brokerStatus = data?.brokerStatus ?? "connecting";

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-navy-900 text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/25">
              <Activity className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight text-white">FleetSync</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                IoT Command Center
              </span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
            aria-label="Tutup sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Operasional
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-brand-500/15 font-semibold text-white ring-1 ring-inset ring-brand-400/20"
                        : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={`h-4.5 w-4.5 ${active ? "text-brand-300" : ""}`} />
                      {label}
                    </span>
                    {href === "/control" && overloadCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {overloadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Sistem
            </p>
            <div className="space-y-1">
              <Link
                href="/settings"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  pathname.startsWith("/settings")
                    ? "bg-brand-500/15 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Settings2 className="h-4.5 w-4.5" />
                Pengaturan & Firmware
              </Link>
              {user.role === "FLEET_COMMANDER" && (
                <Link
                  href="/users"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    pathname.startsWith("/users")
                      ? "bg-brand-500/15 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <UsersRound className="h-4.5 w-4.5" />
                  Manajemen Pengguna
                </Link>
              )}
            </div>
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 text-xs font-bold text-white">
              {user.avatar}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">{user.name}</span>
              <span className="block truncate text-[10px] text-slate-400">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
            <button
              onClick={logout}
              disabled={loggingOut}
              title="Keluar"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-7">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
                aria-label="Buka menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden text-slate-400 sm:inline">FleetSync</span>
                <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:inline" />
                <span className="font-semibold text-slate-800">{section}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {overloadCount > 0 && (
                <Link
                  href="/control"
                  className="chip bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
                >
                  <BellRing className="h-3.5 w-3.5" />
                  {overloadCount} overload
                </Link>
              )}
              <span
                className={`chip ring-1 ring-inset ${
                  brokerStatus === "connected"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : brokerStatus === "connecting"
                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-slate-100 text-slate-500 ring-slate-200"
                }`}
              >
                <Wifi className="h-3.5 w-3.5" />
                MQTT {brokerStatus}
              </span>
              <span
                className={`chip ring-1 ring-inset ${
                  liveStatus === "connected"
                    ? "bg-sky-50 text-sky-700 ring-sky-200"
                    : "bg-slate-100 text-slate-500 ring-slate-200"
                }`}
                title="Koneksi WebSocket browser untuk membaca telemetri"
              >
                Live {liveStatus}
              </span>
              <button
                onClick={() => void toggleDemo()}
                className={`chip ring-1 ring-inset transition ${
                  data?.demoActive
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
                title="Aktifkan simulator telemetri tanpa hardware"
              >
                <Cpu className="h-3.5 w-3.5" />
                Demo {data?.demoActive ? "ON" : "OFF"}
              </button>
              <span className="hidden font-mono text-[11px] text-slate-400 xl:inline">{now}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
