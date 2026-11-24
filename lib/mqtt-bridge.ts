import mqtt, { MqttClient } from "mqtt";
import { emitAppEvent } from "@/lib/events";
import { createCommand, createReading, getVehicles } from "@/lib/repository";
import { brokerBridgeUrl, deriveStatus } from "@/lib/telemetry";
import { CommandAction, CommandLog, IoTDevice } from "@/types/iot";

type BrokerStatus = "connected" | "connecting" | "offline";

interface PendingCommand {
  topic: string;
  payload: string;
}

interface BridgeState {
  started: boolean;
  client: MqttClient | null;
  status: BrokerStatus;
  lastError: string | null;
  pendingCommands: PendingCommand[];
  subscribed: Set<string>;
  demoTimer: NodeJS.Timeout | null;
  demoActive: boolean;
  demoStep: number;
}

const globalForBridge = globalThis as unknown as { mqttBridge?: BridgeState };

function state(): BridgeState {
  if (!globalForBridge.mqttBridge) {
    globalForBridge.mqttBridge = {
      started: false,
      client: null,
      status: "offline",
      lastError: null,
      pendingCommands: [],
      subscribed: new Set(),
      demoTimer: null,
      demoActive: false,
      demoStep: 0,
    };
  }

  const bridge = globalForBridge.mqttBridge;
  if (!Array.isArray(bridge.pendingCommands)) bridge.pendingCommands = [];
  if (!bridge.subscribed) bridge.subscribed = new Set();
  if (bridge.lastError === undefined) bridge.lastError = null;

  return bridge;
}

function setStatus(status: BrokerStatus): void {
  state().status = status;
  emitAppEvent({ type: "status" });
}

async function handleTelemetry(topic: string, message: Buffer): Promise<void> {
  try {
    const payload = JSON.parse(message.toString()) as Record<string, unknown>;
    const vehicles = await getVehicles();
    const vehicle =
      vehicles.find((item) => item.topic === topic) ??
      vehicles.find((item) => item.topic === `${topic}/${String(payload.device ?? "")}`);
    if (!vehicle) return;

    const weight = Number(payload.weight);
    if (!Number.isFinite(weight) || weight < 0) return;

    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const speed = Number(payload.speed);
    const status = deriveStatus(weight, vehicle.warningLimit, vehicle.overloadLimit);
    const firmwareRelay = payload.relay === true || payload.relay === false ? payload.relay : true;

    await createReading({
      vehicleId: vehicle.id,
      weight: Number(weight.toFixed(2)),
      status,
      relay: firmwareRelay && status !== "OVERLOAD",
      lat: Number.isFinite(lat) ? lat : vehicle.telemetry.lat,
      lng: Number.isFinite(lng) ? lng : vehicle.telemetry.lng,
      speed: Number.isFinite(speed) ? Math.max(0, speed) : 0,
    });
    emitAppEvent({ type: "telemetry", vehicleId: vehicle.id });
  } catch (error) {
    console.warn("[mqtt] payload telemetri tidak valid", error);
  }
}

export async function ensureBridgeStarted(): Promise<void> {
  const bridge = state();
  if (bridge.started) return;
  bridge.started = true;

  const vehicles = await getVehicles();
  const topics = Array.from(new Set(vehicles.map((vehicle) => vehicle.topic)));

  try {
    const client = mqtt.connect(brokerBridgeUrl(), {
      clientId: `rentcar-server-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      keepalive: 30,
      reconnectPeriod: 4000,
      connectTimeout: 10000,
    });
    bridge.client = client;
    setStatus("connecting");

    client.on("connect", () => {
      bridge.lastError = null;
      setStatus("connected");
      for (const topic of topics) {
        client.subscribe(topic, { qos: 0 });
        bridge.subscribed.add(topic);
      }
      const pending = bridge.pendingCommands.splice(0);
      for (const command of pending) {
        client.publish(command.topic, command.payload, { qos: 1, retain: false });
      }
    });

    client.on("reconnect", () => setStatus("connecting"));
    client.on("close", () => setStatus("offline"));
    client.on("offline", () => setStatus("offline"));
    client.on("error", (error) => {
      bridge.lastError = error.message;
      console.warn("[mqtt]", error.message);
      setStatus("offline");
    });

    client.on("message", (topic, message) => {
      void handleTelemetry(topic, message);
    });
  } catch (error) {
    bridge.lastError = error instanceof Error ? error.message : String(error);
    console.warn("[mqtt] gagal memulai bridge", error);
    setStatus("offline");
  }
}

export function subscribeVehicleTopic(topic: string): void {
  const bridge = state();
  if (bridge.client?.connected && !bridge.subscribed.has(topic)) {
    bridge.client.subscribe(topic);
    bridge.subscribed.add(topic);
  }
}

export function getBridgeStatus(): BrokerStatus {
  return state().status;
}

export function getBridgeError(): string | null {
  return state().lastError;
}

export function getPendingCommandCount(): number {
  return state().pendingCommands.length;
}

export function isDemoActive(): boolean {
  return state().demoActive;
}

export async function publishRelayCommand(
  vehicle: IoTDevice,
  action: CommandAction,
  issuedBy: string,
  issuedById?: string | null
): Promise<CommandLog> {
  const controlTopic = `${vehicle.topic}/control`;
  const payload = JSON.stringify({
    command: action,
    device: vehicle.code,
    relay: action === "FORCE_ON",
  });

  await ensureBridgeStarted();
  const bridge = state();
  const connected = bridge.status === "connected" && bridge.client?.connected === true;

  if (bridge.client && connected) {
    bridge.client.publish(controlTopic, payload, { qos: 1, retain: false });
  } else {
    bridge.pendingCommands.push({ topic: controlTopic, payload });
    if (bridge.pendingCommands.length > 20) bridge.pendingCommands.shift();
  }

  const log = await createCommand({
    vehicleId: vehicle.id,
    issuedById: issuedById ?? null,
    issuedBy,
    action,
    topic: controlTopic,
    payload,
    status: connected ? "SENT" : "QUEUED",
  });
  emitAppEvent({ type: "command", vehicleId: vehicle.id });
  return log;
}

export function toggleDemo(): boolean {
  const bridge = state();
  bridge.demoActive = !bridge.demoActive;

  if (bridge.demoTimer) {
    clearInterval(bridge.demoTimer);
    bridge.demoTimer = null;
  }

  if (bridge.demoActive) {
    bridge.demoTimer = setInterval(() => {
      void (async () => {
        try {
          const vehicles = await getVehicles();
          if (vehicles.length === 0) return;
          const vehicle = vehicles[bridge.demoStep % vehicles.length];
          bridge.demoStep += 1;
          const wave = (Math.sin(bridge.demoStep / 2.2) + 1) / 2;
          const weight = Number(
            (vehicle.warningLimit * 0.45 + wave * vehicle.overloadLimit * 1.15).toFixed(2)
          );
          const status = deriveStatus(weight, vehicle.warningLimit, vehicle.overloadLimit);
          await createReading({
            vehicleId: vehicle.id,
            weight,
            status,
            relay: status !== "OVERLOAD",
            lat: Number((vehicle.telemetry.lat + Math.sin(bridge.demoStep) * 0.00035).toFixed(6)),
            lng: Number((vehicle.telemetry.lng + Math.cos(bridge.demoStep) * 0.00035).toFixed(6)),
            speed: status === "OVERLOAD" ? 0 : Number((20 + wave * 35).toFixed(1)),
          });
          emitAppEvent({ type: "telemetry", vehicleId: vehicle.id });
        } catch (error) {
          console.warn("[demo] gagal membuat data simulasi", error);
        }
      })();
    }, 3000);
  }

  emitAppEvent({ type: "status" });
  return bridge.demoActive;
}
