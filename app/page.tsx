"use client";

import { useEffect, useState, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import mqtt, { MqttClient } from "mqtt";
import {
  ShieldCheck,
  AlertOctagon,
  Gauge,
  MapPin,
  Copy,
  Check,
  Activity,
  Radio,
  ExternalLink,
  Clock,
  Volume2,
  VolumeX,
  Cpu,
  Layers,
  Sparkles,
  AlertTriangle,
  LogOut,
  ChevronDown,
  Plus,
  Truck,
  Layers as FleetIcon,
  Download,
  Power,
} from "lucide-react";

import { StatusLevel, TelemetryData, AuditLogItem, IoTDevice, User } from "@/types/iot";
import {
  getSavedUser,
  saveUser,
  getSavedDevices,
  saveDevices,
  INITIAL_DEVICES,
} from "@/lib/storage";
import LoginView from "@/components/LoginView";
import DevicePairingModal from "@/components/DevicePairingModal";
import FleetOverviewModal from "@/components/FleetOverviewModal";

const MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const emptySubscribe = () => () => {};

export default function TelemetryDashboard() {
  // Hydration safety: returns false on server, true on client without cascading renders
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSavedUser());

  // Multi-Device Management State
  const [devices, setDevices] = useState<IoTDevice[]>(() => getSavedDevices());
  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => {
    const devs = getSavedDevices();
    return devs && devs.length > 0 ? devs[0].id : "DEV-001";
  });
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);

  // UI & Network State
  const [brokerStatus, setBrokerStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");
  const [isMockActive, setIsMockActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const mqttClientRef = useRef<MqttClient | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mockStepRef = useRef<number>(0);

  // Compute active device
  const activeDevice = useMemo(() => {
    return devices.find((d) => d.id === activeDeviceId) || devices[0] || INITIAL_DEVICES[0];
  }, [devices, activeDeviceId]);

  // Real-time local clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update telemetry for a specific device
  const updateDeviceTelemetry = useCallback((targetDeviceId: string, payload: TelemetryData) => {
    const timeStr = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const newLogItem: AuditLogItem = {
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time: timeStr,
    };

    setDevices((prevDevices) => {
      const updated = prevDevices.map((d) => {
        if (d.id === targetDeviceId) {
          const newLogs = [newLogItem, ...(d.logs || []).slice(0, 7)];
          return {
            ...d,
            telemetry: payload,
            logs: newLogs,
            lastUpdated: timeStr,
            isOnline: true,
          };
        }
        return d;
      });
      saveDevices(updated);
      return updated;
    });
  }, []);

  // MQTT Connection & dynamic subscription to all device topics
  useEffect(() => {
    if (!currentUser) return;

    const clientId = "web_" + Math.random().toString(16).substring(2, 10);
    const client = mqtt.connect(MQTT_BROKER, {
      clientId,
      clean: true,
      connectTimeout: 15000,
      reconnectPeriod: 5000,
      keepalive: 60,
    });

    mqttClientRef.current = client;

    // Collect all unique topics from registered devices
    const deviceTopics = Array.from(new Set(devices.map((d) => d.topic)));

    client.on("connect", () => {
      setBrokerStatus("connected");
      deviceTopics.forEach((t) => {
        client.subscribe(t, (err) => {
          if (err) console.warn("MQTT Subscription notice on", t, err.message);
        });
      });
    });

    client.on("reconnect", () => setBrokerStatus("connecting"));
    client.on("close", () => setBrokerStatus("disconnected"));
    client.on("error", (err) => {
      console.warn("MQTT Connection notice:", err.message);
      setBrokerStatus("connecting");
    });

    client.on("message", (incomingTopic, message) => {
      if (isMockActive) return;

      try {
        const parsed = JSON.parse(message.toString());
        if (typeof parsed.weight === "number") {
          // Identify which device this message belongs to
          const matchedDevice = devices.find((d) => d.topic === incomingTopic);
          const targetId = matchedDevice ? matchedDevice.id : activeDeviceId;

          const sanitizedStatus: StatusLevel =
            parsed.status === "OVERLOAD"
              ? "OVERLOAD"
              : parsed.status === "WARNING"
              ? "WARNING"
              : "AMAN";

          const payload: TelemetryData = {
            weight: Number(parsed.weight),
            status: sanitizedStatus,
            relay: Boolean(parsed.relay),
            lat: typeof parsed.lat === "number" ? parsed.lat : -7.333145,
            lng: typeof parsed.lng === "number" ? parsed.lng : 112.788452,
            speed: typeof parsed.speed === "number" ? parsed.speed : 0,
          };

          updateDeviceTelemetry(targetId, payload);
        }
      } catch (error) {
        console.warn("MQTT Parse Exception:", error);
      }
    });

    return () => {
      if (client) client.end(true);
    };
  }, [currentUser, devices, activeDeviceId, isMockActive, updateDeviceTelemetry]);

  // Demo Simulator for the active device
  useEffect(() => {
    if (!isMockActive) {
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
      return;
    }

    const mockScenarios: TelemetryData[] = [
      { weight: 16.5, status: "AMAN", relay: true, lat: -7.333145, lng: 112.788452, speed: 45.2 },
      { weight: 27.8, status: "AMAN", relay: true, lat: -7.33342, lng: 112.78881, speed: 38.6 },
      { weight: 34.2, status: "WARNING", relay: true, lat: -7.33385, lng: 112.78925, speed: 28.0 },
      { weight: 44.7, status: "WARNING", relay: true, lat: -7.33412, lng: 112.78968, speed: 18.5 },
      { weight: 56.4, status: "OVERLOAD", relay: false, lat: -7.33441, lng: 112.79002, speed: 0.0 },
      { weight: 63.1, status: "OVERLOAD", relay: false, lat: -7.33441, lng: 112.79002, speed: 0.0 },
      { weight: 48.0, status: "WARNING", relay: true, lat: -7.33455, lng: 112.79021, speed: 12.0 },
      { weight: 22.1, status: "AMAN", relay: true, lat: -7.33492, lng: 112.79065, speed: 36.4 },
    ];

    mockIntervalRef.current = setInterval(() => {
      mockStepRef.current = (mockStepRef.current + 1) % mockScenarios.length;
      const scenario = mockScenarios[mockStepRef.current];
      const jitter = (Math.random() - 0.5) * 0.8;
      const simulated: TelemetryData = {
        ...scenario,
        weight: Number(Math.max(0, scenario.weight + jitter).toFixed(2)),
      };
      updateDeviceTelemetry(activeDeviceId, simulated);
    }, 2800);

    return () => {
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, [isMockActive, activeDeviceId, updateDeviceTelemetry]);

  // Handle Preset Trigger
  const triggerPreset = (scenario: StatusLevel) => {
    setIsMockActive(true);
    let mockPreset: TelemetryData;
    if (scenario === "AMAN") {
      mockPreset = { weight: 21.4, status: "AMAN", relay: true, lat: -7.333145, lng: 112.788452, speed: 40.0 };
    } else if (scenario === "WARNING") {
      mockPreset = { weight: 38.2, status: "WARNING", relay: true, lat: -7.33385, lng: 112.78925, speed: 22.5 };
    } else {
      mockPreset = { weight: 58.9, status: "OVERLOAD", relay: false, lat: -7.33441, lng: 112.79002, speed: 0.0 };
    }
    updateDeviceTelemetry(activeDeviceId, mockPreset);
  };

  // Add Device Handler
  const handleDeviceAdded = (newDevice: IoTDevice) => {
    const updated = [...devices, newDevice];
    setDevices(updated);
    saveDevices(updated);
    setActiveDeviceId(newDevice.id);

    // Subscribe to new topic immediately
    if (mqttClientRef.current) {
      mqttClientRef.current.subscribe(newDevice.topic);
    }
  };

  // Delete Device Handler
  const handleDeleteDevice = (delId: string) => {
    if (devices.length <= 1) return;
    const updated = devices.filter((d) => d.id !== delId);
    setDevices(updated);
    saveDevices(updated);
    if (activeDeviceId === delId) {
      setActiveDeviceId(updated[0].id);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    saveUser(null);
    setCurrentUser(null);
  };

  // Copy coordinates
  const handleCopyCoordinates = () => {
    const text = `${activeDevice.telemetry.lat.toFixed(6)}, ${activeDevice.telemetry.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Progress Bar
  const maxWeightCeiling = activeDevice.overloadLimit * 1.2 || 60;
  const weightPercentage = Math.min(
    100,
    Math.max(0, (activeDevice.telemetry.weight / maxWeightCeiling) * 100)
  );

  const getStatusBadgeClasses = (status: StatusLevel) => {
    switch (status) {
      case "AMAN":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-800/50";
      case "WARNING":
        return "text-amber-400 bg-amber-950/40 border-amber-800/50";
      case "OVERLOAD":
        return "text-rose-400 bg-rose-950/50 border-rose-800 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.35)]";
    }
  };

  // OpenStreetMap Bounding Box
  const delta = 0.005;
  const bbox = `${activeDevice.telemetry.lng - delta}%2C${activeDevice.telemetry.lat - delta}%2C${
    activeDevice.telemetry.lng + delta
  }%2C${activeDevice.telemetry.lat + delta}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${activeDevice.telemetry.lat}%2C${activeDevice.telemetry.lng}`;

  // Hydration safety: render consistent loading state on initial render before client mount
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">
            Memuat Sistem Keamanan IoT...
          </span>
        </div>
      </div>
    );
  }

  // If user is not logged in, render the Login/Register Gateway
  if (!currentUser) {
    return <LoginView onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/20 selection:text-rose-300">
      {/* ===================== TOP NAVIGATION BAR ===================== */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Brand & Project Subtitle */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-600 to-emerald-500 p-[2px] shadow-lg shadow-indigo-950/50 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Vehicle Passenger Weight Safety System
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Fleet v2.5
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Real-Time Telemetry &amp; Multi-Device Overload Prevention
              </p>
            </div>
          </div>

          {/* Device Selector, Fleet Overview, & User Profile */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Device Switcher Dropdown */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <Truck className="w-4 h-4 text-sky-400 ml-2 mr-1 shrink-0" />
              <select
                value={activeDeviceId}
                onChange={(e) => setActiveDeviceId(e.target.value)}
                className="bg-transparent text-white font-medium text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                    {d.plateNumber} - {d.name} ({d.telemetry.status})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 mr-2 pointer-events-none" />
            </div>

            {/* Fleet Overview Button */}
            <button
              type="button"
              onClick={() => setIsFleetModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition-colors"
              title="Lihat seluruh armada IoT"
            >
              <FleetIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Armada</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                {devices.length}
              </span>
            </button>

            {/* Add Device Button */}
            <button
              type="button"
              onClick={() => setIsPairingModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-all"
              title="Pasangkan Device IoT Kendaraan Baru"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pasang IoT</span>
            </button>

            {/* Broker Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="relative flex h-2 w-2">
                {brokerStatus === "connected" && (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                )}
                {brokerStatus === "connecting" && (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                )}
                {brokerStatus === "disconnected" && (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                )}
              </span>
              <span
                className={`font-mono text-[11px] font-semibold uppercase ${
                  brokerStatus === "connected"
                    ? "text-emerald-400"
                    : brokerStatus === "connecting"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {brokerStatus === "connected"
                  ? "Connected"
                  : brokerStatus === "connecting"
                  ? "Connecting"
                  : "Offline"}
              </span>
            </div>

            {/* Demo Simulator Toggle */}
            <button
              type="button"
              onClick={() => setIsMockActive(!isMockActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isMockActive
                  ? "bg-indigo-600 text-white shadow-[0_0_12px_rgba(79,70,229,0.5)]"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Aktifkan simulasi beban dinamis saat Wokwi/ESP32 offline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulator</span>
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.avatar}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                title="Keluar dari akun (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Simulator & Device Active Banner */}
        <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 py-1.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Active Device Info */}
            <div className="flex items-center gap-2.5 font-mono text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">{activeDevice.plateNumber}</span>
              <span className="text-slate-500">&bull;</span>
              <span>{activeDevice.name}</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-sky-400 flex items-center gap-1">
                <Radio className="w-3 h-3" />
                <span>{activeDevice.topic}</span>
              </span>
            </div>

            {/* Clock & Simulator Presets */}
            <div className="flex items-center gap-3">
              {isMockActive && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400">Preset:</span>
                  <button
                    onClick={() => triggerPreset("AMAN")}
                    className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                  >
                    Aman (21g)
                  </button>
                  <button
                    onClick={() => triggerPreset("WARNING")}
                    className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700/60 text-amber-300 hover:bg-amber-900/60 transition-colors"
                  >
                    Warning (38g)
                  </button>
                  <button
                    onClick={() => triggerPreset("OVERLOAD")}
                    className="px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 hover:bg-rose-900/60 transition-colors animate-pulse"
                  >
                    Overload (58g)
                  </button>
                </div>
              )}

              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentDate}</span>
                <span className="text-sky-400 font-bold">{currentTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===================== MAIN CONTENT WRAPPER ===================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ===================== 1. KPI CARDS GRID (4 COLUMNS) ===================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Payload Weight */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Payload Weight
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                    {activeDevice.telemetry.weight.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">gram</span>
                </div>
              </div>
              <span
                className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full ${getStatusBadgeClasses(
                  activeDevice.telemetry.status
                )}`}
              >
                {activeDevice.telemetry.status}
              </span>
            </div>

            {/* Tolerance Threshold Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0g</span>
                <span className="text-amber-400/90 font-medium">
                  Warning: {activeDevice.warningLimit}g
                </span>
                <span className="text-rose-400/90 font-medium">
                  Cut-off: {activeDevice.overloadLimit}g
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-amber-500/60 z-10"
                  style={{
                    left: `${(activeDevice.warningLimit / maxWeightCeiling) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-rose-500/80 z-10"
                  style={{
                    left: `${(activeDevice.overloadLimit / maxWeightCeiling) * 100}%`,
                  }}
                />

                <div
                  className={`h-full transition-all duration-500 ease-out rounded-full ${
                    activeDevice.telemetry.status === "OVERLOAD"
                      ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                      : activeDevice.telemetry.status === "WARNING"
                      ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${weightPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                <span>Beban Armada:</span>
                <span className="font-mono font-medium text-slate-300">
                  {Math.round(weightPercentage)}% dari skala toleransi
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Motor Ignition & Safety Lock (Relay Actuator) */}
          <div
            className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm flex flex-col justify-between transition-all duration-300 ${
              activeDevice.telemetry.relay
                ? "bg-emerald-950/20 border-emerald-800/40"
                : "bg-rose-950/30 border-rose-800 shadow-[0_0_24px_rgba(225,29,72,0.25)]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Motor Actuator &amp; Relay
                </span>
                <div className="mt-1">
                  <div
                    className={`text-base sm:text-lg font-bold tracking-tight ${
                      activeDevice.telemetry.relay ? "text-emerald-400" : "text-rose-400 animate-pulse"
                    }`}
                  >
                    {activeDevice.telemetry.relay ? "MOTOR ACTIVE" : "ENGINE CUT-OFF"}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    {activeDevice.telemetry.relay ? "(DRIVE ALLOWED)" : "(SAFETY LOCKED)"}
                  </div>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  activeDevice.telemetry.relay
                    ? "bg-emerald-950/70 border-emerald-700/60 text-emerald-400"
                    : "bg-rose-950/80 border-rose-700 text-rose-400 animate-bounce"
                }`}
              >
                {activeDevice.telemetry.relay ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : (
                  <AlertOctagon className="w-6 h-6" />
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Status Kontak:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  activeDevice.telemetry.relay
                    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/60"
                    : "bg-rose-900/50 text-rose-300 border border-rose-800"
                }`}
              >
                {activeDevice.telemetry.relay ? "RELAY CLOSED (ON)" : "RELAY OPEN (OFF)"}
              </span>
            </div>
          </div>

          {/* Card 3: Velocity / Speedometer */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Vehicle Velocity
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                    {activeDevice.telemetry.speed.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">km/h</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-sky-400">
                <Gauge className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0 km/h</span>
                <span>Batas Armada: 80 km/h</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (activeDevice.telemetry.speed / 80) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-0.5 font-mono">
                <span>Driver:</span>
                <span className="text-slate-200 font-sans font-medium">
                  {activeDevice.driverName}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Geospatial Coordinates */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  GPS Telemetry
                </span>
                <div className="mt-1 space-y-0.5">
                  <div className="font-mono text-sm text-slate-200">
                    <span className="text-slate-500 text-xs">LAT: </span>
                    <span className="font-bold">{activeDevice.telemetry.lat.toFixed(6)}</span>
                  </div>
                  <div className="font-mono text-sm text-slate-200">
                    <span className="text-slate-500 text-xs">LNG: </span>
                    <span className="font-bold">{activeDevice.telemetry.lng.toFixed(6)}</span>
                  </div>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 text-emerald-400">
                <MapPin className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                ID: {activeDevice.id}
              </span>
              <button
                type="button"
                onClick={handleCopyCoordinates}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors border border-slate-700"
                title="Salin koordinat Latitude dan Longitude"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-sans">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-sans">Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ===================== 2. MIDDLE SECTION (2 COLUMNS GRID) ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Live Vehicle Tracking (OpenStreetMap) */}
          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  Live Vehicle Tracking
                  <span className="text-[10px] text-sky-400 font-mono font-medium">
                    [{activeDevice.plateNumber}]
                  </span>
                </h2>
              </div>
              <a
                href={`https://www.google.com/maps?q=${activeDevice.telemetry.lat},${activeDevice.telemetry.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors font-mono"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Map Frame */}
            <div className="relative w-full h-[340px] sm:h-[400px] bg-slate-950">
              <iframe
                title="OpenStreetMap Vehicle Location"
                src={osmEmbedUrl}
                className="w-full h-full border-0 filter contrast-105"
                loading="lazy"
              />

              {/* Interactive Coordinates Badge Overlay */}
              <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 shadow-lg text-[11px] font-mono text-slate-300 flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  {activeDevice.telemetry.lat.toFixed(6)}, {activeDevice.telemetry.lng.toFixed(6)}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-sky-400 font-bold">
                  {activeDevice.telemetry.speed.toFixed(1)} km/h
                </span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Hardware Mirroring & Alert Center */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* 1. Hardware LED Physical Mirroring */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-200">
                    Hardware Mirroring (LED Indicators)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {activeDevice.id} Mirror
                </span>
              </div>

              <div className="py-4">
                <div className="grid grid-cols-3 gap-3">
                  {/* GREEN LED (AMAN) */}
                  <div
                    className={`rounded-xl p-3 border flex flex-col items-center justify-center transition-all duration-300 ${
                      activeDevice.telemetry.status === "AMAN"
                        ? "bg-emerald-950/60 border-emerald-700/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        : "bg-slate-950/60 border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-inner mb-2.5">
                      <div
                        className={`w-7 h-7 rounded-full transition-all duration-300 ${
                          activeDevice.telemetry.status === "AMAN"
                            ? "bg-emerald-400 shadow-[0_0_18px_#10b981] animate-pulse"
                            : "bg-emerald-950 border border-emerald-900"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-200 font-mono">LED HIJAU</span>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase mt-0.5">
                      Aman (&lt;{activeDevice.warningLimit}g)
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-1">GPIO 18</span>
                  </div>

                  {/* YELLOW LED (WARNING) */}
                  <div
                    className={`rounded-xl p-3 border flex flex-col items-center justify-center transition-all duration-300 ${
                      activeDevice.telemetry.status === "WARNING"
                        ? "bg-amber-950/60 border-amber-700/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        : "bg-slate-950/60 border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-inner mb-2.5">
                      <div
                        className={`w-7 h-7 rounded-full transition-all duration-300 ${
                          activeDevice.telemetry.status === "WARNING"
                            ? "bg-amber-400 shadow-[0_0_18px_#f59e0b] animate-pulse"
                            : "bg-amber-950 border border-amber-900"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-200 font-mono">LED KUNING</span>
                    <span className="text-[10px] font-mono text-amber-400 uppercase mt-0.5">
                      Batas ({activeDevice.warningLimit}-{activeDevice.overloadLimit}g)
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-1">GPIO 19</span>
                  </div>

                  {/* RED LED (OVERLOAD) */}
                  <div
                    className={`rounded-xl p-3 border flex flex-col items-center justify-center transition-all duration-300 ${
                      activeDevice.telemetry.status === "OVERLOAD"
                        ? "bg-rose-950/70 border-rose-700 shadow-[0_0_25px_rgba(244,63,94,0.45)]"
                        : "bg-slate-950/60 border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shadow-inner mb-2.5">
                      <div
                        className={`w-7 h-7 rounded-full transition-all duration-300 ${
                          activeDevice.telemetry.status === "OVERLOAD"
                            ? "bg-rose-500 shadow-[0_0_22px_#f43f5e] animate-ping"
                            : "bg-rose-950 border border-rose-900"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-200 font-mono">LED MERAH</span>
                    <span className="text-[10px] font-mono text-rose-400 uppercase mt-0.5">
                      Overload (&gt;{activeDevice.overloadLimit}g)
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-1">GPIO 21</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Alert Center / Emergency Box */}
            {activeDevice.telemetry.status === "OVERLOAD" ? (
              <div className="bg-rose-950/50 border-2 border-rose-700 rounded-2xl p-5 shadow-[0_0_30px_rgba(244,63,94,0.3)] relative overflow-hidden backdrop-blur-md">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-rose-900/80 border border-rose-600 text-rose-200 animate-bounce">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-300 uppercase tracking-wide flex items-center gap-2">
                      <span>Protokol Darurat: Overload Terdeteksi!</span>
                      <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-rose-400"></span>
                    </h4>
                    <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                      Bobot muatan pada armada <strong className="text-white">{activeDevice.plateNumber}</strong> telah melampaui batas toleransi ({activeDevice.overloadLimit}g). Sistem keselamatan telah memutus pengapian dinamo secara seketika.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-800/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="font-semibold">Aktuator Relay Dinamo:</span>
                    <span className="font-mono text-rose-300">Engine Cut-off ENGAGED</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="font-semibold">Buzzer &amp; Strobo Fisik Aktif:</span>
                    <span className="font-mono text-rose-300">Frekuensi 2.4 kHz (Warning Sounding)</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-300/80 bg-rose-900/40 p-2 rounded-lg border border-rose-800/60 mt-1 font-mono text-[11px]">
                    <Volume2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Instruksi: Segera kurangi muatan penumpang/barang hingga di bawah {activeDevice.warningLimit}g untuk membuka kunci sistem pengapian.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-sm flex items-center gap-4">
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Safety Interlock Siap ({activeDevice.plateNumber})
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Sistem pemutus mesin darurat berada dalam status normal. Pengapian mesin beroperasi tanpa pembatasan muatan.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===================== 3. BOTTOM SECTION (AUDIT LOG TABLE) ===================== */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Audit Log Telemetri Terakhir: {activeDevice.name} ({activeDevice.plateNumber})
              </h3>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Topik: <span className="text-sky-400">{activeDevice.topic}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800/80 font-mono text-[11px]">
                  <th className="py-3 px-4 font-semibold">WAKTU</th>
                  <th className="py-3 px-4 font-semibold">BOBOT (GRAM)</th>
                  <th className="py-3 px-4 font-semibold">STATUS</th>
                  <th className="py-3 px-4 font-semibold">KUNCI MOTOR (RELAY)</th>
                  <th className="py-3 px-4 font-semibold">KECEPATAN</th>
                  <th className="py-3 px-4 font-semibold">KOORDINAT GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {!activeDevice.logs || activeDevice.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                      Menunggu aliran data telemetri pertama untuk kendaraan ini...
                    </td>
                  </tr>
                ) : (
                  activeDevice.logs.map((item) => {
                    const isOverload = item.status === "OVERLOAD";
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isOverload
                            ? "bg-rose-950/30 text-rose-200 border-l-4 border-rose-500 hover:bg-rose-950/40"
                            : "hover:bg-slate-800/40 text-slate-300"
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-400">{item.time}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white text-sm">
                            {item.weight.toFixed(2)}
                          </span>{" "}
                          <span className="text-slate-400 text-[11px]">g</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === "AMAN"
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                                : item.status === "WARNING"
                                ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                                : "bg-rose-950 text-rose-300 border border-rose-800 animate-pulse font-extrabold"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {item.relay ? (
                            <span className="text-emerald-400 flex items-center gap-1.5 font-sans font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active (Drive Allowed)
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1.5 font-sans font-bold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                              CUT-OFF (Safety Locked)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {item.speed.toFixed(1)} km/h
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ===================== MODALS ===================== */}
      <DevicePairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        onDeviceAdded={handleDeviceAdded}
        existingCount={devices.length}
      />

      <FleetOverviewModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
        devices={devices}
        activeDeviceId={activeDeviceId}
        onSelectDevice={setActiveDeviceId}
        onDeleteDevice={handleDeleteDevice}
        onOpenAddModal={() => setIsPairingModalOpen(true)}
      />

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
          <div>
            Proyek IoT Informatika UPN &quot;Veteran&quot; Jawa Timur &bull; Vehicle Safety System
          </div>
          <div className="flex items-center gap-3">
            <span>Broker: broker.hivemq.com:8884</span>
            <span>&bull;</span>
            <span>{devices.length} Armada Terpasang</span>
            <span>&bull;</span>
            <span>User: {currentUser.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
