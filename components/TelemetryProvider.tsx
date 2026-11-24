"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MqttClient } from "mqtt";
import { deriveStatus } from "@/lib/telemetry";
import { CommandAction, FleetSnapshot, IoTDevice, TelemetryData } from "@/types/iot";

type ConnectionStatus = "connected" | "connecting" | "offline";

interface LiveReading extends TelemetryData {
  recordedAt: string;
}

interface TelemetryContextValue {
  data: FleetSnapshot | null;
  loading: boolean;
  error: string | null;
  liveStatus: ConnectionStatus;
  liveReadings: Record<string, LiveReading>;
  refresh: () => Promise<void>;
  sendCommand: (vehicleId: string, action: CommandAction) => Promise<{ ok: boolean; message: string }>;
  toggleDemo: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FleetSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<ConnectionStatus>("connecting");
  const [liveReadings, setLiveReadings] = useState<Record<string, LiveReading>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehiclesRef = useRef<IoTDevice[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/fleet", { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat data armada.");
      setData((await response.json()) as FleetSnapshot);
      setError(null);
    } catch {
      setError("Koneksi ke server terputus.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());

    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void refresh(), 250);
    };

    const source = new EventSource("/api/telemetry/stream");
    source.onmessage = (event) => {
      if (event.data?.includes('"type":"connected"')) return;
      scheduleRefresh();
    };

    const polling = setInterval(() => void refresh(), 15_000);

    return () => {
      source.close();
      clearInterval(polling);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    vehiclesRef.current = data?.vehicles ?? [];
  }, [data]);

  const topicsKey = Array.from(new Set((data?.vehicles ?? []).map((vehicle) => vehicle.topic)))
    .sort()
    .join("|");
  const topics = useMemo(() => (topicsKey ? topicsKey.split("|") : []), [topicsKey]);

  useEffect(() => {
    const url = data?.brokerUrl;
    if (!url || topics.length === 0) return;

    let disposed = false;
    let client: MqttClient | null = null;

    void (async () => {
      try {
        const { default: mqtt } = await import("mqtt");
        if (disposed) return;

        client = mqtt.connect(url, {
          clientId: `rentcar-web-${Math.random().toString(16).slice(2, 10)}`,
          clean: true,
          reconnectPeriod: 4000,
          connectTimeout: 10000,
        });

        client.on("connect", () => {
          if (disposed) return;
          setLiveStatus("connected");
          for (const topic of topics) client?.subscribe(topic, { qos: 0 });
        });
        client.on("reconnect", () => setLiveStatus("connecting"));
        client.on("close", () => setLiveStatus("offline"));
        client.on("offline", () => setLiveStatus("offline"));
        client.on("error", () => setLiveStatus("offline"));
        client.on("message", (topic, message) => {
          try {
            const payload = JSON.parse(message.toString()) as Record<string, unknown>;
            const weight = Number(payload.weight);
            if (!Number.isFinite(weight) || weight < 0) return;

            const vehicle = vehiclesRef.current.find(
              (item) =>
                item.topic === topic ||
                item.topic === `${topic}/${String(payload.device ?? "")}`
            );
            if (!vehicle) return;

            const status =
              payload.status === "AMAN" ||
              payload.status === "WARNING" ||
              payload.status === "OVERLOAD"
                ? payload.status
                : deriveStatus(weight, vehicle.warningLimit, vehicle.overloadLimit);
            const lat = Number(payload.lat);
            const lng = Number(payload.lng);
            const speed = Number(payload.speed);

            setLiveReadings((previous) => ({
              ...previous,
              [vehicle.topic]: {
                weight: Number(weight.toFixed(2)),
                status,
                relay: typeof payload.relay === "boolean" ? payload.relay : true,
                lat: Number.isFinite(lat) ? lat : vehicle.telemetry.lat,
                lng: Number.isFinite(lng) ? lng : vehicle.telemetry.lng,
                speed: Number.isFinite(speed) ? Math.max(0, speed) : vehicle.telemetry.speed,
                recordedAt: new Date().toISOString(),
              },
            }));
          } catch {
            return;
          }
        });
      } catch {
        if (!disposed) setLiveStatus("offline");
      }
    })();

    return () => {
      disposed = true;
      client?.end(true);
    };
  }, [data?.brokerUrl, topics]);

  const sendCommand = useCallback(
    async (vehicleId: string, action: CommandAction) => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const payload = (await response.json()) as {
          error?: string;
          log?: { status?: string };
        };
        if (!response.ok) return { ok: false, message: payload.error ?? "Perintah gagal." };
        await refresh();
        if (payload.log?.status === "QUEUED") {
          return {
            ok: true,
            message:
              "Broker MQTT server sedang offline. Perintah antrean akan dikirim otomatis saat koneksi pulih; cek Status server di halaman Pengaturan.",
          };
        }
        return {
          ok: true,
          message:
            action === "FORCE_ON"
              ? "Perintah NYALAKAN motor berhasil dikirim."
              : "Perintah MATIKAN motor berhasil dikirim.",
        };
      } catch {
        return { ok: false, message: "Gagal menghubungi server MQTT." };
      }
    },
    [refresh]
  );

  const toggleDemo = useCallback(async () => {
    await fetch("/api/demo", { method: "POST" });
    await refresh();
  }, [refresh]);

  const mergedData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      vehicles: data.vehicles.map((vehicle) => {
        const reading = liveReadings[vehicle.topic];
        if (!reading) return vehicle;
        return {
          ...vehicle,
          telemetry: { ...vehicle.telemetry, ...reading },
          lastSeen: reading.recordedAt,
          isActive: true,
        };
      }),
    };
  }, [data, liveReadings]);

  const value = useMemo(
    () => ({
      data: mergedData,
      loading,
      error,
      liveStatus,
      liveReadings,
      refresh,
      sendCommand,
      toggleDemo,
    }),
    [mergedData, loading, error, liveStatus, liveReadings, refresh, sendCommand, toggleDemo]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error("useTelemetry harus dipakai di dalam TelemetryProvider");
  return context;
}
