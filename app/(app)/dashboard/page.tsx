"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CircleParking,
  Gauge,
  MapPinned,
  Scale,
  Truck,
} from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { EmptyState, MapEmbed, PageHeader, Panel, StatCard, StatusBadge, timeAgo } from "@/components/ui";
import { STATUS_LABELS } from "@/types/iot";

export default function DashboardPage() {
  const { data, loading } = useTelemetry();
  const [focusId, setFocusId] = useState<string>("");

  const vehicles = data?.vehicles ?? [];
  const focus = vehicles.find((vehicle) => vehicle.id === focusId) ?? vehicles[0];
  const alerts = useMemo(
    () => (data?.logs ?? []).filter((log) => log.status !== "AMAN").slice(0, 5),
    [data]
  );
  const warningCount = vehicles.filter((vehicle) => vehicle.telemetry.status === "WARNING").length;
  const overloadCount = vehicles.filter((vehicle) => vehicle.telemetry.status === "OVERLOAD").length;
  const onlineCount = vehicles.filter((vehicle) => vehicle.isActive).length;
  const maxWeight = focus ? Math.max(focus.overloadLimit, focus.telemetry.weight) : 5;
  const percentage = focus ? Math.min(100, (focus.telemetry.weight / maxWeight) * 100) : 0;

  if (loading && !data) {
    return <div className="panel h-96 animate-pulse bg-slate-100" />;
  }

  return (
    <>
      <PageHeader
        title="Ringkasan Armada"
        description="Pantau kondisi seluruh kendaraan rental secara real-time."
        actions={
          <>
            <Link href="/vehicles" className="btn-secondary">
              <Truck className="h-4 w-4" /> Kelola Armada
            </Link>
            <Link href="/control" className="btn-primary">
              <Gauge className="h-4 w-4" /> Kontrol Motor
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Kendaraan" value={vehicles.length} icon={Truck} tone="sky" hint="Terdaftar dalam sistem" />
        <StatCard label="Aktif / Online" value={onlineCount} icon={CircleParking} tone="emerald" hint="Terakhir melaporkan data" />
        <StatCard label="Peringatan" value={warningCount} icon={AlertTriangle} tone="amber" hint="Mendekati batas beban" />
        <StatCard label="Overload" value={overloadCount} icon={Activity} tone="rose" hint="Motor otomatis terputus" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <Panel
          title="Peta Lokasi Live"
          description="Posisi terkini kendaraan dari modul GPS ESP32."
          className="xl:col-span-8"
          action={
            vehicles.length > 0 ? (
              <select
                value={focus?.id ?? ""}
                onChange={(event) => setFocusId(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.code} · {vehicle.plateNumber}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        >
          {!focus ? (
            <EmptyState title="Belum ada kendaraan" description="Tambahkan kendaraan untuk mulai memantau." />
          ) : (
            <>
              <div className="h-[320px] sm:h-[380px]">
                <MapEmbed lat={focus.telemetry.lat} lng={focus.telemetry.lng} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs">
                <span className="flex items-center gap-2 font-mono text-slate-600">
                  <MapPinned className="h-4 w-4 text-brand-600" />
                  {focus.telemetry.lat.toFixed(6)}, {focus.telemetry.lng.toFixed(6)}
                </span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={focus.telemetry.status} />
                  <Link
                    href={`/vehicles/${focus.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                  >
                    Detail <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <Panel title="Beban Terkini" description={focus?.name ?? "—"}>
            {focus && (
              <div className="p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold tracking-tight text-slate-900">
                      {focus.telemetry.weight.toFixed(2)}
                      <span className="ml-1 text-base font-medium text-slate-400">kg</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Warning {focus.warningLimit.toFixed(1)} kg · Cut-off {focus.overloadLimit.toFixed(1)} kg
                    </p>
                  </div>
                  <Scale className="h-8 w-8 text-brand-500" />
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      focus.telemetry.status === "OVERLOAD"
                        ? "bg-rose-500"
                        : focus.telemetry.status === "WARNING"
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {(["AMAN", "WARNING", "OVERLOAD"] as const).map((status) => (
                    <div
                      key={status}
                      className={`rounded-xl border px-2 py-3 text-[10px] font-bold uppercase ${
                        focus.telemetry.status === status
                          ? status === "AMAN"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : status === "WARNING"
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
                  <span className="text-slate-500">Kecepatan</span>
                  <span className="font-mono font-bold text-slate-800">
                    {focus.telemetry.speed.toFixed(1)} km/h
                  </span>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Status Relay" description="Kendali pengapian kendaraan">
            {focus && (
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Motor</span>
                  <span
                    className={`chip ${
                      focus.telemetry.relay
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {focus.telemetry.relay ? "AKTIF" : "TERKUNCI"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Update terakhir {timeAgo(focus.lastSeen)} · Topik MQTT{" "}
                  <span className="font-mono text-[10px]">{focus.topic}</span>
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Peringatan Terbaru" description="Aktivitas beban di luar batas aman.">
          {alerts.length === 0 ? (
            <EmptyState title="Tidak ada peringatan" description="Seluruh kendaraan dalam kondisi aman." />
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {log.vehicleCode ?? "Kendaraan"} · {log.weight.toFixed(2)} kg
                    </p>
                    <p className="text-xs text-slate-500">{timeAgo(log.time)}</p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Kondisi Armada" description="Ringkasan tiap kendaraan terdaftar.">
          <div className="divide-y divide-slate-100">
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/vehicles/${vehicle.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{vehicle.plateNumber}</p>
                  <p className="truncate text-xs text-slate-500">{vehicle.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500">
                    {vehicle.telemetry.weight.toFixed(2)} kg
                  </span>
                  <StatusBadge status={vehicle.telemetry.status} />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
