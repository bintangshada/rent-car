"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { EmptyState, PageHeader, StatusBadge, formatDateTime } from "@/components/ui";
import { StatusLevel } from "@/types/iot";

export default function LogsPage() {
  const { data, loading } = useTelemetry();
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const logs = useMemo(() => {
    return (data?.logs ?? []).filter((log) => {
      if (vehicleFilter !== "all" && log.vehicleId !== vehicleFilter) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (search && !`${log.vehicleCode} ${log.id}`.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [data, vehicleFilter, statusFilter, search]);

  function exportCsv() {
    const header = ["Waktu", "Kendaraan", "Beban (kg)", "Status", "Relay", "Kecepatan (km/h)", "Latitude", "Longitude"];
    const rows = logs.map((log) => [
      formatDateTime(log.time),
      log.vehicleCode ?? log.vehicleId,
      log.weight.toFixed(2),
      log.status,
      log.relay ? "AKTIF" : "CUT-OFF",
      log.speed.toFixed(1),
      log.lat.toFixed(6),
      log.lng.toFixed(6),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Riwayat telemetri dan peristiwa keamanan seluruh armada."
        actions={
          <button onClick={exportCsv} className="btn-secondary" disabled={logs.length === 0}>
            <Download className="h-4 w-4" /> Ekspor CSV
          </button>
        }
      />

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Riwayat Telemetri</h2>
            <p className="text-xs text-slate-500">{logs.length} entri ditampilkan</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <select
              value={vehicleFilter}
              onChange={(event) => setVehicleFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="all">Semua kendaraan</option>
              {(data?.vehicles ?? []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.code} · {vehicle.plateNumber}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="all">Semua status</option>
              {(["AMAN", "WARNING", "OVERLOAD"] as StatusLevel[]).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari..."
                className="field-input w-40 py-2 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="h-72 animate-pulse bg-slate-50" />
        ) : logs.length === 0 ? (
          <EmptyState title="Tidak ada log" description="Ubah filter atau tunggu data telemetri masuk." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Kendaraan</th>
                  <th className="px-5 py-3">Beban</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Relay</th>
                  <th className="px-5 py-3">Kecepatan</th>
                  <th className="px-5 py-3">Koordinat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                      {formatDateTime(log.time)}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-700">
                      {log.vehicleCode ?? log.vehicleId}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{log.weight.toFixed(2)} kg</td>
                    <td className="px-5 py-3.5"><StatusBadge status={log.status} /></td>
                    <td className="px-5 py-3.5">
                      <span className={log.relay ? "text-emerald-600" : "font-semibold text-rose-600"}>
                        {log.relay ? "AKTIF" : "CUT-OFF"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{log.speed.toFixed(1)} km/h</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {log.lat.toFixed(4)}, {log.lng.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
