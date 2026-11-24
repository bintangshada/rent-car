"use client";

import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, timeAgo } from "@/components/ui";

export default function WeightPage() {
  const { data, loading } = useTelemetry();
  const vehicles = data?.vehicles ?? [];
  const warningCount = vehicles.filter((vehicle) => vehicle.telemetry.status === "WARNING").length;
  const overloadCount = vehicles.filter((vehicle) => vehicle.telemetry.status === "OVERLOAD").length;
  const average = vehicles.length
    ? vehicles.reduce((sum, vehicle) => sum + vehicle.telemetry.weight, 0) / vehicles.length
    : 0;

  return (
    <>
      <PageHeader
        title="Monitoring Beban"
        description="Pantau beban penumpang dan ambang keamanan setiap kendaraan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Rata-rata Beban" value={`${average.toFixed(2)} kg`} icon={Scale} tone="sky" />
        <StatCard label="Warning" value={warningCount} icon={AlertTriangle} tone="amber" />
        <StatCard label="Overload" value={overloadCount} icon={Scale} tone="rose" />
      </div>

      {overloadCount > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-bold text-rose-800">Terdeteksi kelebihan beban</p>
            <p className="mt-1 text-xs text-rose-700">
              Sistem telah mengirim perintah cut-off otomatis ke motor. Segera periksa kendaraan
              melalui halaman Kontrol Motor.
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {loading && !data ? (
          <div className="panel h-72 animate-pulse bg-slate-100 lg:col-span-2" />
        ) : vehicles.length === 0 ? (
          <Panel title="Monitoring Beban">
            <EmptyState title="Belum ada data" description="Tambahkan kendaraan terlebih dahulu." />
          </Panel>
        ) : (
          vehicles.map((vehicle) => {
            const max = Math.max(vehicle.overloadLimit, vehicle.telemetry.weight, 5);
            const percentage = Math.min(100, (vehicle.telemetry.weight / max) * 100);
            const warningPosition = (vehicle.warningLimit / max) * 100;
            const overloadPosition = (vehicle.overloadLimit / max) * 100;
            return (
              <Panel
                key={vehicle.id}
                title={`${vehicle.plateNumber} · ${vehicle.code}`}
                description={vehicle.name}
                action={<StatusBadge status={vehicle.telemetry.status} />}
              >
                <div className="space-y-4 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold tracking-tight text-slate-900">
                        {vehicle.telemetry.weight.toFixed(2)}
                        <span className="ml-1 text-sm font-medium text-slate-400">kg</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Diperbarui {timeAgo(vehicle.lastSeen)}</p>
                    </div>
                    <span className="font-mono text-xs text-slate-500">
                      {vehicle.telemetry.speed.toFixed(0)} km/h
                    </span>
                  </div>

                  <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        vehicle.telemetry.status === "OVERLOAD"
                          ? "bg-rose-500"
                          : vehicle.telemetry.status === "WARNING"
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                    <span
                      className="absolute inset-y-0 w-px bg-amber-500"
                      style={{ left: `${warningPosition}%` }}
                    />
                    <span
                      className="absolute inset-y-0 w-px bg-rose-600"
                      style={{ left: `${overloadPosition}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Aman &lt; {vehicle.warningLimit.toFixed(1)} kg
                    </span>
                    <span className="text-amber-600">Warning {vehicle.warningLimit.toFixed(1)} kg</span>
                    <span className="text-rose-600">Cut-off {vehicle.overloadLimit.toFixed(1)} kg</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                    {(["AMAN", "WARNING", "OVERLOAD"] as const).map((status) => (
                      <div
                        key={status}
                        className={`rounded-lg py-2 text-[10px] font-bold uppercase ${
                          vehicle.telemetry.status === status
                            ? status === "AMAN"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "WARNING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                            : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            );
          })
        )}
      </div>
    </>
  );
}
