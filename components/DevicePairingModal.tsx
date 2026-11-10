"use client";

import { useState } from "react";
import { IoTDevice } from "@/types/iot";
import {
  X,
  PlusCircle,
  Cpu,
  Truck,
  Code,
  Copy,
  Check,
  ShieldAlert,
  Radio,
} from "lucide-react";

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceAdded: (newDevice: IoTDevice) => void;
  existingCount: number;
}

export default function DevicePairingModal({
  isOpen,
  onClose,
  onDeviceAdded,
  existingCount,
}: DevicePairingModalProps) {
  const nextIdNum = existingCount + 1;
  const defaultId = `DEV-00${nextIdNum}`;

  const [id, setId] = useState(defaultId);
  const [name, setName] = useState(`Armada 0${nextIdNum} - Kendaraan Baru`);
  const [plateNumber, setPlateNumber] = useState("L 1234 XY");
  const [driverName, setDriverName] = useState("Pengemudi Armada");
  const [vehicleType, setVehicleType] = useState<IoTDevice["vehicleType"]>("Mobil Operasional");
  const [warningLimit, setWarningLimit] = useState<number>(30);
  const [overloadLimit, setOverloadLimit] = useState<number>(50);
  const [topic, setTopic] = useState(`bintang/if-upn/safety-car/data/${defaultId}`);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "code">("form");

  if (!isOpen) return null;

  // Auto-update topic when ID changes
  const handleIdChange = (newId: string) => {
    setId(newId);
    setTopic(`bintang/if-upn/safety-car/data/${newId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDevice: IoTDevice = {
      id: id.trim() || `DEV-${Date.now().toString().slice(-4)}`,
      name: name.trim() || "Kendaraan IoT Baru",
      plateNumber: plateNumber.trim().toUpperCase() || "L 0000 XX",
      driverName: driverName.trim() || "Driver Belum Ditugaskan",
      vehicleType,
      topic: topic.trim() || `bintang/if-upn/safety-car/data/${id}`,
      warningLimit: Number(warningLimit) || 30,
      overloadLimit: Number(overloadLimit) || 50,
      isOnline: true,
      lastUpdated: "Baru terpasang",
      telemetry: {
        weight: 12.0,
        status: "AMAN",
        relay: true,
        lat: -7.333145,
        lng: 112.788452,
        speed: 0.0,
      },
      logs: [
        {
          id: `log-${Date.now()}`,
          time: new Date().toLocaleTimeString("id-ID", { hour12: false }),
          weight: 12.0,
          status: "AMAN",
          relay: true,
          lat: -7.333145,
          lng: 112.788452,
          speed: 0.0,
        },
      ],
    };

    onDeviceAdded(newDevice);
    onClose();
  };

  const sampleArduinoCode = `// Konfigurasi Firmware untuk Device: ${id} (${name})
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic = "${topic}";
const char* device_id = "${id}";

// Batas Beban Sensor (gram)
const float WARNING_THRESHOLD = ${warningLimit}.0;
const float OVERLOAD_THRESHOLD = ${overloadLimit}.0;`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleArduinoCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-lg shadow-indigo-950/60">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Pasangkan Device IoT Baru
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                MQTT Auto-Pair
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Registrasikan unit kendaraan armada baru untuk dipantau secara real-time.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-5 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "form"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Form Registrasi Armada</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === "code"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Firmware ESP32 Config</span>
          </button>
        </div>

        {activeTab === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Device ID (Hardware ID)
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder="e.g. DEV-004"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nomor Polisi (Plat Mobil)
                </label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="e.g. L 1945 UPN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono uppercase placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nama Armada / Unit Mobil
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Armada 04 - HiAce Eksekutif"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nama Pengemudi Bertugas
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Agus Pratama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tipe Kendaraan
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleType(e.target.value as IoTDevice["vehicleType"])
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Mobil Operasional">Mobil Operasional</option>
                  <option value="Mobil Penumpang">Mobil Penumpang</option>
                  <option value="Minibus">Minibus / Shuttle</option>
                  <option value="Truk Ringan">Truk Ringan / Pick-up</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Ambang Warning (g)
                </label>
                <input
                  type="number"
                  value={warningLimit}
                  onChange={(e) => setWarningLimit(Number(e.target.value))}
                  min={1}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Ambang Overload (g)
                </label>
                <input
                  type="number"
                  value={overloadLimit}
                  onChange={(e) => setOverloadLimit(Number(e.target.value))}
                  min={1}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                <span>Topik MQTT Subscribed:</span>
                <span className="text-[10px] text-sky-400 font-mono">HiveMQ WSS</span>
              </label>
              <div className="relative">
                <Radio className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-sky-300 font-mono focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                ESP32 pada kendaraan ini wajib mengirim data JSON ke topik di atas.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-950/60 flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Pasangkan &amp; Simpan Device</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                <span className="text-sky-400 text-[11px] font-bold">
                  Arduino / ESP32 Configuration
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Salin Konfig</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {sampleArduinoCode}
              </pre>
            </div>

            <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-800/60 text-sky-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Petunjuk Pemasangan Hardware:</span>
                Pastikan ESP32 pada kendaraan ini terhubung ke broker HiveMQ (port 1883 TCP atau 8884 WSS) dan mengirim payload JSON ke topik <code>{topic}</code>.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
              >
                Kembali ke Form Simpan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

