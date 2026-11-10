"use client";

import { IoTDevice } from "@/types/iot";
import {
  X,
  Truck,
  ShieldCheck,
  AlertOctagon,
  Trash2,
  Radio,
  Plus,
} from "lucide-react";

interface FleetOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: IoTDevice[];
  activeDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onDeleteDevice: (deviceId: string) => void;
  onOpenAddModal: () => void;
}

export default function FleetOverviewModal({
  isOpen,
  onClose,
  devices,
  activeDeviceId,
  onSelectDevice,
  onDeleteDevice,
  onOpenAddModal,
}: FleetOverviewModalProps) {
  if (!isOpen) return null;

  const total = devices.length;
  const countAman = devices.filter((d) => d.telemetry.status === "AMAN").length;
  const countWarning = devices.filter((d) => d.telemetry.status === "WARNING").length;
  const countOverload = devices.filter((d) => d.telemetry.status === "OVERLOAD").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Pusat Kendali Armada IoT (Fleet Overview)
              </h2>
              <p className="text-xs text-slate-400">
                Memantau seluruh kendaraan yang terhubung ke jaringan HiveMQ secara serentak.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenAddModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Device</span>
          </button>
        </div>

        {/* Summary Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-mono text-slate-400">Total Armada</span>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{total}</div>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-mono text-emerald-400">Status Aman</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{countAman}</div>
          </div>
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-mono text-amber-400">Status Warning</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{countWarning}</div>
          </div>
          <div className="bg-rose-950/30 border border-rose-800/40 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-mono text-rose-400">Status Overload</span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">{countOverload}</div>
          </div>
        </div>

        {/* Devices Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {devices.map((device) => {
            const isActive = device.id === activeDeviceId;
            const isOverload = device.telemetry.status === "OVERLOAD";
            const isWarning = device.telemetry.status === "WARNING";

            return (
              <div
                key={device.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? "bg-slate-800/90 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/50"
                    : isOverload
                    ? "bg-rose-950/20 border-rose-800 hover:bg-rose-950/30"
                    : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl border mt-0.5 ${
                        device.telemetry.relay
                          ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                          : "bg-rose-950 border-rose-800 text-rose-400 animate-pulse"
                      }`}
                    >
                      {device.telemetry.relay ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : (
                        <AlertOctagon className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {device.name}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {device.plateNumber}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {device.id}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40">
                            Sedang Dipantau
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
                        <span>
                          Driver: <strong className="text-slate-200">{device.driverName}</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Radio className="w-3 h-3 text-sky-400" />
                          <span>{device.topic}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <div className="text-right">
                      <div className="font-mono font-bold text-white text-sm">
                        {device.telemetry.weight.toFixed(1)} <span className="text-xs text-slate-400 font-normal">g</span>
                      </div>
                      <div
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          device.telemetry.status === "AMAN"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : isWarning
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800 animate-pulse"
                        }`}
                      >
                        {device.telemetry.status}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onSelectDevice(device.id);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-sky-500 text-white"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                        }`}
                      >
                        {isActive ? "Aktif" : "Pilih Armada"}
                      </button>

                      {devices.length > 1 && (
                        <button
                          onClick={() => onDeleteDevice(device.id)}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Hapus Device ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{total} Kendaraan Terdaftar</span>
          <span>Broker: wss://broker.hivemq.com:8884/mqtt</span>
        </div>
      </div>
    </div>
  );
}
