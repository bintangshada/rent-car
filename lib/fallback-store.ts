import bcrypt from "bcryptjs";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  CommandAction,
  Role,
  StatusLevel,
  VehicleType,
} from "@/types/iot";
import { SEED_USERS, SEED_VEHICLES, buildSeedReadings } from "@/lib/seed-data";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredVehicle {
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
}

export interface StoredReading {
  id: string;
  vehicleId: string;
  weight: number;
  status: StatusLevel;
  relay: boolean;
  lat: number;
  lng: number;
  speed: number;
  recordedAt: string;
}

export interface StoredCommand {
  id: string;
  vehicleId: string;
  issuedById: string | null;
  issuedBy: string;
  action: CommandAction;
  topic: string;
  payload: string;
  status: string;
  createdAt: string;
}

export interface StoredStore {
  users: StoredUser[];
  vehicles: StoredVehicle[];
  readings: StoredReading[];
  commands: StoredCommand[];
}

const STORE_PATH = join(process.cwd(), ".data", "store.json");
const globalForStore = globalThis as unknown as { fallbackStore?: StoredStore };

function makeInitialStore(): StoredStore {
  const now = new Date().toISOString();
  const createdAt = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  return {
    users: SEED_USERS.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: bcrypt.hashSync(user.password, 10),
      role: user.role,
      avatar: user.avatar,
      createdAt,
      updatedAt: now,
    })),
    vehicles: SEED_VEHICLES.map((vehicle, index) => ({
      id: vehicle.id,
      code: vehicle.code,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      driverName: vehicle.driverName,
      vehicleType: vehicle.vehicleType,
      topic: vehicle.topic,
      warningLimit: vehicle.warningLimit,
      overloadLimit: vehicle.overloadLimit,
      isActive: vehicle.isActive,
      lastSeen: new Date(Date.now() - index * 45_000).toISOString(),
      createdAt,
      updatedAt: now,
    })),
    readings: SEED_VEHICLES.flatMap((vehicle) => buildSeedReadings(vehicle)),
    commands: [
      {
        id: "cmd-seed-1",
        vehicleId: "veh-002",
        issuedById: "usr-admin",
        issuedBy: "Bintang Shada",
        action: "FORCE_OFF" as CommandAction,
        topic: `${SEED_VEHICLES[1].topic}/control`,
        payload: JSON.stringify({ command: "FORCE_OFF", device: "DEV-002" }),
        status: "SENT",
        createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
    ],
  };
}

export function readStore(): StoredStore {
  if (globalForStore.fallbackStore) return globalForStore.fallbackStore;

  let store: StoredStore;
  try {
    if (existsSync(STORE_PATH)) {
      store = JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoredStore;
    } else {
      store = makeInitialStore();
      writeStore(store);
    }
  } catch {
    store = makeInitialStore();
  }

  globalForStore.fallbackStore = store;
  return store;
}

export function writeStore(store: StoredStore): void {
  globalForStore.fallbackStore = store;
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function mutateStore<T>(mutator: (store: StoredStore) => T): T {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}
