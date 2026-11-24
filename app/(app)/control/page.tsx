"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, LockKeyhole, Power, Radio, ShieldCheck, UnlockKeyhole } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { EmptyState, PageHeader, Panel, StatusBadge, formatDateTime, timeAgo } from "@/components/ui";

export default function ControlPage() {
  const { data, loading, sendCommand } = useTelemetry();
  const vehicles = data?.vehicles ?? [];
  const [selectedId, setSelectedId] = useState("");
  const vehicle = vehicles.find((item) => item.id === selectedId) ?? vehicles[0];
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const commands = (data?.commands ?? []).slice(0, 8);

  async function control(action: "FORCE_ON" | "FORCE_OFF") {
    if (!vehicle) return;
    const label = action === "FORCE_OFF" ? "MATIKAN" : "NYALAKAN";
    if (!window.confirm(`Konfirmasi perintah ${label} motor untuk ${vehicle.plateNumber}?`)) return;
    setBusy(true);
    const result = await sendCommand(vehicle.id, action);
    setMessage(result.message);
    setBusy(false);
  }

  return (
    <>
      <PageHeader
        title="Kontrol Motor"
        description="Aktifkan atau nonaktifkan kendaraan melalui perintah MQTT dua arah."
      />

      {loading && !data ? (
        <div className="panel h-96 animate-pulse bg-slate-100" />
      ) : !vehicle ? (
        <Panel title="Kontrol Motor">
          <EmptyState title="Belum ada kendaraan" description="Tambahkan kendaraan untuk dapat mengirim perintah." />
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <Panel
              title="Panel Kontrol Utama"
              description={`Topik perintah: ${vehicle.topic}/control`}
              action={
                <select
                  value={vehicle.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
                >
                  {vehicles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.plateNumber}
                    </option>
                  ))}
                </select>
              }
            >
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-900 p-6 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Status Motor Saat Ini
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        vehicle.telemetry.relay
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      <Power className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="text-2xl font-bold">
                        {vehicle.telemetry.relay ? "AKTIF" : "TERKUNCI"}
                      </p>
                      <p className="text-xs text-slate-400">{timeAgo(vehicle.lastSeen)}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-400">
                    <StatusBadge status={vehicle.telemetry.status} />
                    <span>{vehicle.telemetry.weight.toFixed(2)} kg</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Kirim Perintah Remote</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Perintah dipublish ke broker MQTT dan diterima oleh firmware ESP32 pada unit
                      kendaraan.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => void control("FORCE_ON")}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <UnlockKeyhole className="h-4 w-4" /> Aktifkan Motor
                    </button>
                    <button
                      onClick={() => void control("FORCE_OFF")}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      <LockKeyhole className="h-4 w-4" /> Nonaktifkan Motor
                    </button>
                  </div>
                  {message && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700">
                      {message}
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="Riwayat Perintah" description="Jejak audit seluruh perintah kontrol.">
              {commands.length === 0 ? (
                <EmptyState title="Belum ada perintah" description="Perintah yang dikirim akan tampil di sini." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Perintah</th>
                        <th className="px-5 py-3">Kendaraan</th>
                        <th className="px-5 py-3">Oleh</th>
                        <th className="px-5 py-3">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commands.map((command) => (
                        <tr key={command.id}>
                          <td className="px-5 py-3">
                            <span
                              className={`chip ${
                                command.action === "FORCE_ON"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {command.action}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-600">
                            {command.vehicleCode ?? command.vehicleId}
                          </td>
                          <td className="px-5 py-3 text-slate-600">{command.issuedBy}</td>
                          <td className="px-5 py-3 text-slate-500">{formatDateTime(command.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-5 xl:col-span-4">
            <Panel title="Indikator Hardware" description="Mirror lampu pada perangkat ESP32.">
              <div className="grid grid-cols-3 gap-3 p-5">
                {(["AMAN", "WARNING", "OVERLOAD"] as const).map((status) => {
                  const active = vehicle.telemetry.status === status;
                  const style =
                    status === "AMAN"
                      ? { ring: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500" }
                      : status === "WARNING"
                      ? { ring: "border-amber-200 bg-amber-50", dot: "bg-amber-400" }
                      : { ring: "border-rose-200 bg-rose-50", dot: "bg-rose-500" };
                  return (
                    <div
                      key={status}
                      className={`rounded-xl border p-4 text-center ${active ? style.ring : "border-slate-100 bg-slate-50 opacity-50"}`}
                    >
                      <span
                        className={`mx-auto block h-8 w-8 rounded-full ${active ? `${style.dot} shadow-lg` : "bg-slate-300"}`}
                      />
                      <p className="mt-2 text-[10px] font-bold uppercase text-slate-600">{status}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Catatan Keamanan">
              <div className="space-y-3 p-5 text-xs leading-relaxed text-slate-600">
                <p className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  Motor akan otomatis terputus saat beban melebihi batas cut-off.
                </p>
                <p className="flex gap-2">
                  <Radio className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  Status perintah tercatat di audit log beserta pengirim dan waktu.
                </p>
                <p className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  Nyalakan kembali motor hanya setelah beban dinyatakan aman.
                </p>
                <p className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  Firmware mengabaikan perintah ON saat kondisi overload.
                </p>
              </div>
            </Panel>

            <Link href={`/vehicles/${vehicle.id}`} className="btn-secondary w-full">
              Lihat Detail Kendaraan
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
