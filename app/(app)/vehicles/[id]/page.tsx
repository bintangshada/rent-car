"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Gauge, MapPin, Power, Radio, Save, Scale } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import {
  EmptyState,
  MapEmbed,
  PageHeader,
  Panel,
  StatusBadge,
  formatDateTime,
  timeAgo,
} from "@/components/ui";
import { VEHICLE_TYPE_LABELS } from "@/types/iot";

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, refresh, sendCommand } = useTelemetry();
  const vehicle = data?.vehicles.find(
    (item) => item.id === params.id || item.code === params.id
  );
  const [warningLimit, setWarningLimit] = useState("");
  const [overloadLimit, setOverloadLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const configId = vehicle?.id;
  const configWarning = vehicle?.warningLimit;
  const configOverload = vehicle?.overloadLimit;
  const configActive = vehicle?.isActive;

  useEffect(() => {
    if (configWarning === undefined || configOverload === undefined || configActive === undefined) return;
    queueMicrotask(() => {
      setWarningLimit(String(configWarning));
      setOverloadLimit(String(configOverload));
      setIsActive(configActive);
    });
  }, [configId, configWarning, configOverload, configActive]);

  async function control(action: "FORCE_ON" | "FORCE_OFF") {
    if (!vehicle) return;
    setBusy(true);
    const result = await sendCommand(vehicle.id, action);
    setMessage(result.message);
    setBusy(false);
  }

  async function saveConfiguration(event: React.FormEvent) {
    event.preventDefault();
    if (!vehicle) return;
    setBusy(true);
    const response = await fetch(`/api/vehicles/${vehicle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warningLimit: Number(warningLimit),
        overloadLimit: Number(overloadLimit),
        isActive,
      }),
    });
    const body = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Konfigurasi kendaraan berhasil diperbarui." : (body.error ?? "Gagal menyimpan."));
    await refresh();
    setBusy(false);
  }

  if (loading && !data) return <div className="panel h-96 animate-pulse bg-slate-100" />;
  if (!vehicle) {
    return (
      <Panel title="Kendaraan tidak ditemukan">
        <EmptyState title="Data tidak tersedia" description="Kembali ke daftar armada untuk memilih unit lain." />
      </Panel>
    );
  }

  const maxWeight = Math.max(vehicle.overloadLimit, vehicle.telemetry.weight, 5);
  const commands = (data?.commands ?? []).filter((command) => command.vehicleId === vehicle.id).slice(0, 6);
  const readings = vehicle.logs.slice(0, 8).reverse();

  return (
    <>
      <PageHeader
        title={`${vehicle.plateNumber} · ${vehicle.code}`}
        description={`${vehicle.name} — ${vehicle.driverName} (${VEHICLE_TYPE_LABELS[vehicle.vehicleType]})`}
        actions={
          <>
            <Link href="/vehicles" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" /> Daftar Armada
            </Link>
            <StatusBadge status={vehicle.telemetry.status} />
          </>
        }
      />

      {message && (
        <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-medium text-brand-700">
          {message}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <Panel title="Peta Lokasi" description={`Update terakhir ${timeAgo(vehicle.lastSeen)}`}>
            <div className="h-[340px]">
              <MapEmbed lat={vehicle.telemetry.lat} lng={vehicle.telemetry.lng} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-xs">
              <span className="flex items-center gap-2 font-mono text-slate-600">
                <MapPin className="h-4 w-4 text-brand-600" />
                {vehicle.telemetry.lat.toFixed(6)}, {vehicle.telemetry.lng.toFixed(6)}
              </span>
              <span className="font-mono text-slate-500">{vehicle.telemetry.speed.toFixed(1)} km/h</span>
            </div>
          </Panel>

          <Panel title="Riwayat Beban" description="8 pembacaan sensor terakhir.">
            <div className="flex h-48 items-end gap-2 px-5 py-5">
              {readings.map((reading, index) => (
                <div key={reading.id} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500">{reading.weight.toFixed(1)}</span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      reading.status === "OVERLOAD"
                        ? "bg-rose-500"
                        : reading.status === "WARNING"
                        ? "bg-amber-400"
                        : "bg-brand-400"
                    }`}
                    style={{ height: `${Math.max(8, (reading.weight / maxWeight) * 100)}%` }}
                  />
                  <span className="text-[10px] text-slate-400">T-{readings.length - index}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Panel title="Telemetri Terkini">
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Scale className="h-4 w-4" /> Beban
                </span>
                <span className="font-mono text-lg font-bold text-slate-900">
                  {vehicle.telemetry.weight.toFixed(2)} kg
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Gauge className="h-4 w-4" /> Kecepatan
                </span>
                <span className="font-mono text-lg font-bold text-slate-900">
                  {vehicle.telemetry.speed.toFixed(0)} km/h
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Power className="h-4 w-4" /> Relay
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    vehicle.telemetry.relay ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {vehicle.telemetry.relay ? "AKTIF" : "CUT-OFF"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-900 px-4 py-3">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Radio className="h-3.5 w-3.5" /> Topik MQTT
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-brand-200">{vehicle.topic}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Kontrol Motor" description="Perintah dikirim via MQTT ke ESP32.">
            <div className="space-y-3 p-5">
              <button
                onClick={() => void control("FORCE_ON")}
                disabled={busy}
                className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Power className="h-4 w-4" /> Nyalakan Motor
              </button>
              <button
                onClick={() => void control("FORCE_OFF")}
                disabled={busy}
                className="btn-danger w-full"
              >
                <Power className="h-4 w-4" /> Matikan Motor
              </button>
            </div>
          </Panel>

          <Panel title="Konfigurasi" description="Ambang beban dan status unit.">
            <form onSubmit={saveConfiguration} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Warning (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="field-input"
                    value={warningLimit}
                    onChange={(event) => setWarningLimit(event.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Cut-off (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    className="field-input"
                    value={overloadLimit}
                    onChange={(event) => setOverloadLimit(event.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 accent-brand-600"
                />
                Kendaraan aktif
              </label>
              <button type="submit" className="btn-secondary w-full" disabled={busy}>
                <Save className="h-4 w-4" /> Simpan Konfigurasi
              </button>
            </form>
          </Panel>
        </div>
      </div>

      <div className="mt-5">
        <Panel title="Riwayat Perintah" description="Perintah kontrol yang pernah dikirim ke unit ini.">
          {commands.length === 0 ? (
            <EmptyState title="Belum ada perintah" description="Perintah remote akan tampil di sini." />
          ) : (
            <div className="divide-y divide-slate-100">
              {commands.map((command) => (
                <div key={command.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{command.action}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{command.topic}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-600">{command.issuedBy}</p>
                    <p className="text-slate-400">{formatDateTime(command.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
