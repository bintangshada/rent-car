import { Role, StatusLevel, VehicleType } from "@/types/iot";
import { deriveStatus } from "@/lib/telemetry";

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar: string;
}

export interface SeedVehicle {
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
  weight: number;
  lat: number;
  lng: number;
  speed: number;
}

export const TOPIC_BASE = "bintang/if-upn/safety-car/data";

export const SEED_USERS: SeedUser[] = [
  {
    id: "usr-admin",
    name: "Bintang Shada",
    email: "admin@safetycar.id",
    password: "Admin123!",
    role: "FLEET_COMMANDER",
    avatar: "BS",
  },
  {
    id: "usr-officer",
    name: "Rina Wijaya",
    email: "officer@safetycar.id",
    password: "Officer123!",
    role: "SAFETY_OFFICER",
    avatar: "RW",
  },
  {
    id: "usr-driver",
    name: "Budi Santoso",
    email: "driver@safetycar.id",
    password: "Driver123!",
    role: "ARMADA_DRIVER",
    avatar: "BD",
  },
];

export const SEED_VEHICLES: SeedVehicle[] = [
  {
    id: "veh-001",
    code: "DEV-001",
    name: "Avanza Patroli Kampus",
    plateNumber: "L 1945 UPN",
    driverName: "Budi Santoso",
    vehicleType: "OPERATIONAL",
    topic: `${TOPIC_BASE}/DEV-001`,
    warningLimit: 3.0,
    overloadLimit: 4.5,
    isActive: true,
    weight: 1.84,
    lat: -7.333145,
    lng: 112.788452,
    speed: 42.5,
  },
  {
    id: "veh-002",
    code: "DEV-002",
    name: "Innova Zenix VIP",
    plateNumber: "B 2024 UPN",
    driverName: "Siti Rahma",
    vehicleType: "PASSENGER",
    topic: `${TOPIC_BASE}/DEV-002`,
    warningLimit: 3.2,
    overloadLimit: 4.8,
    isActive: true,
    weight: 3.65,
    lat: -7.33512,
    lng: 112.78912,
    speed: 28.0,
  },
  {
    id: "veh-003",
    code: "DEV-003",
    name: "HiAce Shuttle Kampus",
    plateNumber: "N 7788 AB",
    driverName: "Ahmad Fauzi",
    vehicleType: "MINIBUS",
    topic: `${TOPIC_BASE}/DEV-003`,
    warningLimit: 3.5,
    overloadLimit: 5.0,
    isActive: true,
    weight: 2.1,
    lat: -7.33125,
    lng: 112.78654,
    speed: 35.2,
  },
];

export function seedStatus(vehicle: SeedVehicle, weight = vehicle.weight): StatusLevel {
  return deriveStatus(weight, vehicle.warningLimit, vehicle.overloadLimit);
}

export function buildSeedReadings(vehicle: SeedVehicle, now = Date.now()) {
  const offsets = [0, 45, 90, 140, 190, 240, 300, 360];
  return offsets.map((secondsAgo, index) => {
    const weight = Number(
      Math.max(0, vehicle.weight + Math.sin(index * 1.7) * 0.45).toFixed(2)
    );
    return {
      id: `reading-${vehicle.code}-${index + 1}`,
      vehicleId: vehicle.id,
      weight,
      status: seedStatus(vehicle, weight),
      relay: seedStatus(vehicle, weight) !== "OVERLOAD",
      lat: Number((vehicle.lat + Math.sin(index) * 0.0004).toFixed(6)),
      lng: Number((vehicle.lng + Math.cos(index) * 0.0004).toFixed(6)),
      speed: Math.max(0, Number((vehicle.speed + Math.cos(index * 2) * 6).toFixed(1))),
      recordedAt: new Date(now - secondsAgo * 1000).toISOString(),
    };
  });
}
