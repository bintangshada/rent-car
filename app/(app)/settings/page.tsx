"use client";

import { Copy, Cpu, Download, Radio, Server, Wifi } from "lucide-react";
import { useTelemetry } from "@/components/TelemetryProvider";
import { PageHeader, Panel } from "@/components/ui";

export default function SettingsPage() {
  const { data, toggleDemo, liveStatus, liveReadings } = useTelemetry();

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <>
      <PageHeader
        title="Pengaturan & Firmware"
        description="Konfigurasi broker MQTT, topik perangkat, dan firmware ESP32."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Koneksi MQTT" description="Broker yang dipakai oleh dashboard dan perangkat.">
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Server className="h-4 w-4" /> ESP32 (TCP)
              </span>
              <span className="font-mono text-xs text-slate-800">
                {data?.brokerTcpUrl ?? "mqtt://broker.hivemq.com:1883"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Wifi className="h-4 w-4" /> Browser (WSS)
              </span>
              <span className="font-mono text-xs text-slate-800">{data?.brokerUrl ?? "wss://broker.hivemq.com:8884/mqtt"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Radio className="h-4 w-4" /> Server bridge
              </span>
              <span className="font-mono text-[11px] text-slate-800">
                {data?.brokerBridgeUrl ?? "wss://broker.hivemq.com:8884/mqtt"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Radio className="h-4 w-4" /> Status server
              </span>
              <span className="text-xs font-bold uppercase text-slate-800">
                {data?.brokerStatus ?? "connecting"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Wifi className="h-4 w-4" /> Status browser (live)
              </span>
              <span
                className={`text-xs font-bold uppercase ${
                  liveStatus === "connected" ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {liveStatus}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Radio className="h-4 w-4" /> Perintah antrean
              </span>
              <span className="font-mono text-xs text-slate-800">
                {data?.pendingCommands ?? 0}
              </span>
            </div>
            {(data?.pendingCommands ?? 0) > 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
                Perintah MATIKAN/NYALAKAN belum terkirim ke ESP32 karena bridge server offline.
                Perintah akan dikirim otomatis saat broker terhubung.
              </p>
            )}
            {data?.brokerError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
                {data.brokerError}
              </p>
            )}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Simulator Telemetri</p>
                <p className="text-[11px] text-slate-500">Buat data dummy tanpa hardware.</p>
              </div>
              <button
                onClick={() => void toggleDemo()}
                className={`chip ring-1 ring-inset ${
                  data?.demoActive
                    ? "bg-indigo-600 text-white ring-indigo-600"
                    : "bg-white text-slate-600 ring-slate-200"
                }`}
              >
                {data?.demoActive ? "AKTIF" : "NONAKTIF"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Firmware ESP32" description="Source code siap pakai untuk Arduino IDE / Wokwi.">
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-bold text-brand-900">safety_car.ino</p>
                <p className="mt-1 text-xs leading-relaxed text-brand-800">
                  Sudah termasuk WiFi, MQTT PubSubClient, HX711, GPS NEO-6M, LCD I2C, LED,
                  buzzer, relay, dan penanganan perintah FORCE_ON / FORCE_OFF.
                </p>
              </div>
            </div>
            <a href="/api/firmware" className="btn-primary w-full">
              <Download className="h-4 w-4" /> Unduh Firmware
            </a>
            <div className="rounded-xl bg-slate-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Library Arduino yang dibutuhkan
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-emerald-300">
                WiFi · PubSubClient · ArduinoJson · HX711 · TinyGPSPlus · LiquidCrystal_I2C
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Topik Telemetri Kendaraan" description="Salin topik untuk dikonfigurasi pada firmware.">
          <div className="divide-y divide-slate-100">
            {(data?.vehicles ?? []).map((vehicle) => (
              <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {vehicle.code} · {vehicle.plateNumber}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">{vehicle.topic}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{vehicle.topic}/control</span>
                  <button
                    onClick={() => void copy(vehicle.topic)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-300 hover:text-brand-600"
                    title="Salin topik"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          title="Output MQTT Live"
          description="Payload terakhir yang diterima browser langsung dari broker (WebSocket)."
        >
          <div className="divide-y divide-slate-100">
            {(data?.vehicles ?? []).map((vehicle) => {
              const reading = liveReadings[vehicle.topic];
              return (
                <div key={vehicle.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-500">{vehicle.topic}</span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {(reading ?? vehicle.telemetry).weight.toFixed(2)} kg
                    </span>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-emerald-300">
                    {JSON.stringify(reading ?? vehicle.telemetry, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
