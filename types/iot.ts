export type Role = "FLEET_COMMANDER" | "SAFETY_OFFICER" | "ARMADA_DRIVER";

export type StatusLevel = "AMAN" | "WARNING" | "OVERLOAD";

export type VehicleType = "PASSENGER" | "OPERATIONAL" | "LIGHT_TRUCK" | "MINIBUS";

export type CommandAction = "FORCE_ON" | "FORCE_OFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  createdAt: string;
}

export interface TelemetryData {
  weight: number;
  status: StatusLevel;
  relay: boolean;
  lat: number;
  lng: number;
  speed: number;
  recordedAt?: string;
}

export interface AuditLogItem extends TelemetryData {
  id: string;
  vehicleId: string;
  vehicleCode?: string;
  time: string;
}

export interface CommandLog {
  id: string;
  vehicleId: string;
  vehicleCode?: string;
  action: CommandAction;
  topic: string;
  payload: string;
  status: string;
  issuedBy: string;
  createdAt: string;
}

export interface IoTDevice {
  id: string;
  code: string;
  name: string;
  plateNumber: string;
  driverName: string;
  vehicleType: VehicleType;
  topic: string;
  warningLimit: number;
  overloadLimit: number;
  isActive: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
  telemetry: TelemetryData;
  logs: AuditLogItem[];
}

export interface FleetSnapshot {
  vehicles: IoTDevice[];
  logs: AuditLogItem[];
  commands: CommandLog[];
  brokerStatus: "connected" | "connecting" | "offline";
  brokerError?: string | null;
  pendingCommands?: number;
  demoActive: boolean;
  brokerUrl: string;
  brokerTcpUrl?: string;
  brokerBridgeUrl?: string;
  generatedAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  FLEET_COMMANDER: "Fleet Commander",
  SAFETY_OFFICER: "Safety Officer",
  ARMADA_DRIVER: "Armada Driver",
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  PASSENGER: "Mobil Penumpang",
  OPERATIONAL: "Mobil Operasional",
  LIGHT_TRUCK: "Truk Ringan",
  MINIBUS: "Minibus",
};

export const STATUS_LABELS: Record<StatusLevel, string> = {
  AMAN: "Aman",
  WARNING: "Peringatan",
  OVERLOAD: "Overload",
};
