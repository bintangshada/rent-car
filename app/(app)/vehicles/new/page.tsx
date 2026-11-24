"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Radio, Save } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { VehicleType } from "@/types/iot";

const TOPIC_BASE = "bintang/if-upn/safety-car/data";

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    name: "",
    plateNumber: "",
    driverName: "",
    vehicleType: "PASSENGER" as VehicleType,
    topic: `${TOPIC_BASE}/DEV-`,
    warningLimit: "3.0",
    overloadLimit: "4.5",
    isActive: true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function syncTopic(code: string) {
    setForm((previous) => ({ ...previous, code, topic: `${TOPIC_BASE}/${code.toUpperCase()}` }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        warningLimit: Number(form.warningLimit),
        overloadLimit: Number(form.overloadLimit),
      }),
    });
    const body = (await response.json()) as {
      error?: string;
      vehicle?: { id: string };
    };
    if (!response.ok || !body.vehicle) {
      setError(body.error ?? "Gagal menyimpan kendaraan.");
      setSaving(false);
      return;
    }
    router.push(`/vehicles/${body.vehicle.id}`);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Tambah Kendaraan"
        description="Daftarkan unit baru beserta topik MQTT dan ambang beban."
        actions={
          <Link href="/vehicles" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-3">
        <Panel title="Identitas Kendaraan" description="Informasi unit yang dipantau." className="lg:col-span-2">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="field-label">Kode Perangkat</label>
              <input
                className="field-input font-mono uppercase"
                value={form.code}
                onChange={(event) => syncTopic(event.target.value)}
                placeholder="DEV-004"
                required
              />
            </div>
            <div>
              <label className="field-label">Nama Kendaraan</label>
              <input
                className="field-input"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Avanza Patroli"
                required
              />
            </div>
            <div>
              <label className="field-label">Plat Nomor</label>
              <input
                className="field-input uppercase"
                value={form.plateNumber}
                onChange={(event) => update("plateNumber", event.target.value)}
                placeholder="L 1234 ABC"
                required
              />
            </div>
            <div>
              <label className="field-label">Nama Driver</label>
              <input
                className="field-input"
                value={form.driverName}
                onChange={(event) => update("driverName", event.target.value)}
                placeholder="Nama pengemudi"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Tipe Kendaraan</label>
              <select
                className="field-input"
                value={form.vehicleType}
                onChange={(event) => update("vehicleType", event.target.value)}
              >
                <option value="PASSENGER">Mobil Penumpang</option>
                <option value="OPERATIONAL">Mobil Operasional</option>
                <option value="LIGHT_TRUCK">Truk Ringan</option>
                <option value="MINIBUS">Minibus</option>
              </select>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Konfigurasi MQTT" description="Topik telemetri perangkat ESP32.">
            <div className="p-5">
              <label className="field-label">Telemetry Topic</label>
              <div className="relative">
                <Radio className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="field-input pl-9 font-mono text-xs"
                  value={form.topic}
                  onChange={(event) => update("topic", event.target.value)}
                  required
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Perintah kontrol dikirim ke <span className="font-mono">{form.topic}/control</span>.
              </p>
            </div>
          </Panel>

          <Panel title="Ambang Beban" description="Satuan dalam kilogram (kg).">
            <div className="grid grid-cols-2 gap-3 p-5">
              <div>
                <label className="field-label">Warning</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="field-input"
                  value={form.warningLimit}
                  onChange={(event) => update("warningLimit", event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label">Cut-off</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  className="field-input"
                  value={form.overloadLimit}
                  onChange={(event) => update("overloadLimit", event.target.value)}
                  required
                />
              </div>
            </div>
          </Panel>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 lg:col-span-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 lg:col-span-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Aktifkan kendaraan setelah disimpan
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Kendaraan"}
          </button>
        </div>
      </form>
    </>
  );
}
