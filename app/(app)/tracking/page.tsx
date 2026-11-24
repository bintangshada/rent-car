"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { EmptyState, MapEmbed, PageHeader, Panel, StatusBadge, timeAgo } from "@/components/ui";

export default function TrackingPage() {
  const { data, loading } = useTelemetry();
  const vehicles = data?.vehicles ?? [];
  const [selectedId, setSelectedId] = useState("");
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0];

  return (
    <>
      <PageHeader
        title="Live Tracking"
        description="Lacak posisi seluruh armada langsung dari modul GPS."
      />

      {loading && !data ? (
        <div className="panel h-[560px] animate-pulse bg-slate-100" />
      ) : !selected ? (
        <Panel title="Peta Armada">
          <EmptyState title="Belum ada kendaraan" description="Tambahkan kendaraan untuk melihat posisi." />
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          <Panel
            title={`Posisi ${selected.plateNumber}`}
            description={`${selected.name} · ${timeAgo(selected.lastSeen)}`}
            className="xl:col-span-9"
            action={
              <a
                href={`https://www.google.com/maps?q=${selected.telemetry.lat},${selected.telemetry.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
              >
                Google Maps <ExternalLink className="h-3.5 w-3.5" />
              </a>
            }
          >
            <div className="h-[420px] sm:h-[520px]">
              <MapEmbed lat={selected.telemetry.lat} lng={selected.telemetry.lng} />
            </div>
            <div className="grid gap-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Latitude</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {selected.telemetry.lat.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Longitude</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {selected.telemetry.lng.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kecepatan</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {selected.telemetry.speed.toFixed(1)} km/h
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Daftar Armada" description="Pilih kendaraan untuk memusatkan peta." className="xl:col-span-3">
            <div className="divide-y divide-slate-100">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedId(vehicle.id)}
                  className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition ${
                    selected.id === vehicle.id ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800">
                      <Navigation className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                      {vehicle.plateNumber}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3" /> {timeAgo(vehicle.lastSeen)}
                    </p>
                  </div>
                  <StatusBadge status={vehicle.telemetry.status} />
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 p-4">
              <Link href="/vehicles" className="btn-secondary w-full">
                Kelola Armada
              </Link>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
