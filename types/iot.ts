export type StatusLevel = "AMAN" | "WARNING" | "OVERLOAD";

export interface TelemetryData {
  weight: number;
  status: StatusLevel;
  relay: boolean;
  lat: number;
  lng: number;
  speed: number;
}

export interface AuditLogItem extends TelemetryData {
  id: string;
  time: string;
}

export interface IoTDevice {
  id: string; // e.g. "DEV-001"
  name: string; // e.g. "Armada 01 - Avanza"
  plateNumber: string; // e.g. "L 1945 UPN"
  driverName: string; // e.g. "Budi Santoso"
  vehicleType: "Mobil Penumpang" | "Mobil Operasional" | "Truk Ringan" | "Minibus";
  topic: string; // e.g. "bintang/if-upn/safety-car/data" or "bintang/if-upn/safety-car/data/DEV-001"
  warningLimit: number; // e.g. 30g
  overloadLimit: number; // e.g. 50g
  telemetry: TelemetryData;
  logs: AuditLogItem[];
  isOnline: boolean;
  lastUpdated?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Fleet Commander" | "Safety Officer" | "Armada Driver";
  avatar: string;
}

