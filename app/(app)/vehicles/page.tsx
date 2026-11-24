"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { EmptyState, PageHeader, StatusBadge, timeAgo } from "@/components/ui";
import { VEHICLE_TYPE_LABELS } from "@/types/iot";

export default function VehiclesPage() {
  const { data, loading, refresh } = useTelemetry();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const vehicles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (data?.vehicles ?? []).filter(
      (vehicle) =>
        !keyword ||
        [vehicle.code, vehicle.name, vehicle.plateNumber, vehicle.driverName].some((value) =>
          value.toLowerCase().includes(keyword)
        )
    );
  }, [data, search]);

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    setMessage("");
    const response = await fetch(`/api/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setMessage(body.error ?? "Gagal mengubah status kendaraan.");
    }
    await refresh();
    setBusyId(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus kendaraan ini beserta seluruh riwayat telemetrinya?")) return;
    setBusyId(id);
    const response = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setMessage(body.error ?? "Gagal menghapus kendaraan.");
    }
    await refresh();
    setBusyId(null);
  }

  return (
    <>
      <PageHeader
        title="Armada Terdaftar"
        description="Kelola kendaraan, batas beban, dan topik MQTT tiap unit."
        actions={
          <Link href="/vehicles/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Tambah Kendaraan
          </Link>
        }
      />

      {message && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {message}
        </div>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Daftar Kendaraan</h2>
            <p className="mt-0.5 text-xs text-slate-500">{vehicles.length} unit ditemukan</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari plat, driver, atau kode..."
              className="field-input w-64 pl-9"
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="h-64 animate-pulse bg-slate-50" />
        ) : vehicles.length === 0 ? (
          <EmptyState title="Tidak ada kendaraan" description="Coba kata kunci lain atau tambahkan unit baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Kendaraan</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Beban</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Update</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                          <Truck className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{vehicle.plateNumber}</p>
                          <p className="text-xs text-slate-500">
                            {vehicle.code} · {VEHICLE_TYPE_LABELS[vehicle.vehicleType]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700">{vehicle.driverName}</p>
                      <p className="text-xs text-slate-400">{vehicle.name}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-700">
                      {vehicle.telemetry.weight.toFixed(2)} kg
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={vehicle.telemetry.status} />
                        <span
                          className={`chip ${
                            vehicle.isActive
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {vehicle.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{timeAgo(vehicle.lastSeen)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void toggleActive(vehicle.id, vehicle.isActive)}
                          disabled={busyId === vehicle.id}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {vehicle.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
                          title="Lihat detail"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => void remove(vehicle.id)}
                          disabled={busyId === vehicle.id}
                          className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
