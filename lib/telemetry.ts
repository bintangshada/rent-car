import { StatusLevel } from "@/types/iot";

export function deriveStatus(
  weight: number,
  warningLimit: number,
  overloadLimit: number
): StatusLevel {
  if (weight >= overloadLimit) return "OVERLOAD";
  if (weight >= warningLimit) return "WARNING";
  return "AMAN";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function statusFromPayload(
  payload: Record<string, unknown>,
  warningLimit: number,
  overloadLimit: number
): StatusLevel | null {
  if (payload.status === "OVERLOAD" || payload.status === "WARNING" || payload.status === "AMAN") {
    return payload.status;
  }
  if (typeof payload.weight === "number" && Number.isFinite(payload.weight)) {
    return deriveStatus(payload.weight, warningLimit, overloadLimit);
  }
  return null;
}

export function brokerUrl(): string {
  const value = process.env.MQTT_BROKER_URL?.trim() || "broker.hivemq.com:1883";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `mqtt://${value}`;
}

export function brokerWebUrl(): string {
  return process.env.NEXT_PUBLIC_MQTT_WS_URL?.trim() || "wss://broker.hivemq.com:8884/mqtt";
}

export function brokerBridgeUrl(): string {
  return process.env.MQTT_BRIDGE_URL?.trim() || brokerWebUrl();
}
