import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import {
  mutateStore,
  readStore,
  StoredCommand,
  StoredReading,
  StoredUser,
  StoredVehicle,
} from "@/lib/fallback-store";
import {
  AuditLogItem,
  CommandAction,
  CommandLog,
  IoTDevice,
  Role,
  TelemetryData,
  StatusLevel as StatusType,
  User,
  VehicleType,
} from "@/types/iot";

type DbUser = StoredUser & { createdAt: Date | string; updatedAt: Date | string };
type DbReading = Omit<StoredReading, "recordedAt"> & {
  recordedAt: Date | string;
  vehicle?: { code: string };
};
type DbVehicle = Omit<StoredVehicle, "createdAt" | "updatedAt" | "lastSeen"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  lastSeen: Date | string | null;
  readings?: DbReading[];
};
type DbCommand = Omit<StoredCommand, "issuedBy"> & {
  createdAt: Date | string;
  issuedBy: string | { name: string } | null;
};

const iso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

function toUser(row: DbUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
  };
}

function toTelemetry(reading?: DbReading): TelemetryData {
  if (!reading) {
    return { weight: 0, status: "AMAN", relay: true, lat: -7.333145, lng: 112.788452, speed: 0 };
  }
  return {
    weight: reading.weight,
    status: reading.status,
    relay: reading.relay,
    lat: reading.lat,
    lng: reading.lng,
    speed: reading.speed,
    recordedAt: iso(reading.recordedAt) ?? undefined,
  };
}

function toLog(reading: DbReading, vehicleCode?: string): AuditLogItem {
  const recordedAt = iso(reading.recordedAt) ?? new Date().toISOString();
  return {
    ...toTelemetry(reading),
    id: reading.id,
    vehicleId: reading.vehicleId,
    vehicleCode: reading.vehicle?.code ?? vehicleCode,
    time: recordedAt,
  };
}

function toVehicle(row: DbVehicle): IoTDevice {
  const readings = [...(row.readings ?? [])].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    plateNumber: row.plateNumber,
    driverName: row.driverName,
    vehicleType: row.vehicleType,
    topic: row.topic,
    warningLimit: row.warningLimit,
    overloadLimit: row.overloadLimit,
    isActive: row.isActive,
    lastSeen: iso(row.lastSeen),
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(row.updatedAt) ?? new Date().toISOString(),
    telemetry: toTelemetry(readings[0]),
    logs: readings.slice(0, 8).map((reading) => toLog(reading, row.code)),
  };
}

function toCommand(row: DbCommand): CommandLog {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    action: row.action,
    topic: row.topic,
    payload: row.payload,
    status: row.status,
    issuedBy:
      typeof row.issuedBy === "object" && row.issuedBy !== null
        ? row.issuedBy.name
        : row.issuedBy ?? "Sistem",
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
  };
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface VehicleInput {
  code: string;
  name: string;
  plateNumber: string;
  driverName: string;
  vehicleType: VehicleType;
  topic: string;
  warningLimit: number;
  overloadLimit: number;
  isActive: boolean;
}

export interface ReadingInput extends TelemetryData {
  vehicleId: string;
}

export interface CommandInput {
  vehicleId: string;
  issuedById?: string | null;
  issuedBy: string;
  action: CommandAction;
  topic: string;
  payload: string;
  status?: string;
}

export async function listUsers(): Promise<User[]> {
  const prisma = getPrisma();
  if (prisma) {
    const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => toUser(row as DbUser));
  }
  return readStore().users.map(toUser);
}

export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
  const normalized = email.trim().toLowerCase();
  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.user.findUnique({ where: { email: normalized } });
    return row ? { ...toUser(row as DbUser), passwordHash: row.passwordHash } : null;
  }
  const row = readStore().users.find((user) => user.email.toLowerCase() === normalized);
  return row ? { ...toUser(row), passwordHash: row.passwordHash } : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toUser(row as DbUser) : null;
  }
  const row = readStore().users.find((user) => user.id === id);
  return row ? toUser(row) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar?: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const avatar =
    input.avatar ??
    input.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.user.create({
      data: { name: input.name.trim(), email, passwordHash, role: input.role, avatar },
    });
    return toUser(row as DbUser);
  }

  const now = new Date().toISOString();
  const stored: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash,
    role: input.role,
    avatar,
    createdAt: now,
    updatedAt: now,
  };
  mutateStore((store) => store.users.push(stored));
  return toUser(stored);
}

export async function deleteUser(id: string): Promise<boolean> {
  const prisma = getPrisma();
  if (prisma) {
    await prisma.user.delete({ where: { id } });
    return true;
  }
  return mutateStore((store) => {
    const before = store.users.length;
    store.users = store.users.filter((user) => user.id !== id);
    return store.users.length !== before;
  });
}

export async function getVehicles(): Promise<IoTDevice[]> {
  const prisma = getPrisma();
  if (prisma) {
    const rows = await prisma.vehicle.findMany({
      orderBy: { code: "asc" },
      include: { readings: { orderBy: { recordedAt: "desc" }, take: 8 } },
    });
    return rows.map((row) => toVehicle(row as DbVehicle));
  }

  const store = readStore();
  return store.vehicles.map((vehicle) => {
    const readings = store.readings
      .filter((reading) => reading.vehicleId === vehicle.id)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 8);
    return toVehicle({ ...vehicle, readings });
  });
}

export async function getVehicleById(id: string): Promise<IoTDevice | null> {
  const vehicles = await getVehicles();
  return vehicles.find((vehicle) => vehicle.id === id || vehicle.code === id) ?? null;
}

export async function getVehicleByTopic(topic: string): Promise<IoTDevice | null> {
  const vehicles = await getVehicles();
  return vehicles.find((vehicle) => vehicle.topic === topic) ?? null;
}

export async function createVehicle(input: VehicleInput): Promise<IoTDevice> {
  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.vehicle.create({
      data: {
        ...input,
        vehicleType: input.vehicleType,
      },
    });
    return toVehicle({ ...(row as unknown as DbVehicle), readings: [] });
  }

  const now = new Date().toISOString();
  const stored: StoredVehicle = {
    ...input,
    id: crypto.randomUUID(),
    lastSeen: null,
    createdAt: now,
    updatedAt: now,
  };
  mutateStore((store) => store.vehicles.push(stored));
  return toVehicle(stored);
}

export async function updateVehicle(
  id: string,
  patch: Partial<VehicleInput>
): Promise<IoTDevice | null> {
  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.vehicle.update({
      where: { id },
      data: { ...patch, updatedAt: new Date() },
    });
    return toVehicle(row as DbVehicle);
  }

  let updated: StoredVehicle | undefined;
  mutateStore((store) => {
    const index = store.vehicles.findIndex((vehicle) => vehicle.id === id);
    if (index === -1) return;
    store.vehicles[index] = {
      ...store.vehicles[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    updated = store.vehicles[index];
  });
  return updated ? toVehicle(updated) : null;
}

export async function markVehicleSeen(id: string): Promise<void> {
  const prisma = getPrisma();
  if (prisma) {
    await prisma.vehicle.update({
      where: { id },
      data: { lastSeen: new Date(), isActive: true },
    });
    return;
  }
  mutateStore((store) => {
    const vehicle = store.vehicles.find((item) => item.id === id);
    if (vehicle) {
      vehicle.lastSeen = new Date().toISOString();
      vehicle.isActive = true;
    }
  });
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const prisma = getPrisma();
  if (prisma) {
    await prisma.vehicle.delete({ where: { id } });
    return true;
  }
  return mutateStore((store) => {
    const before = store.vehicles.length;
    store.vehicles = store.vehicles.filter((vehicle) => vehicle.id !== id);
    store.readings = store.readings.filter((reading) => reading.vehicleId !== id);
    store.commands = store.commands.filter((command) => command.vehicleId !== id);
    return store.vehicles.length !== before;
  });
}

export async function getReadings(limit = 200, vehicleId?: string): Promise<AuditLogItem[]> {
  const prisma = getPrisma();
  if (prisma) {
    const rows = await prisma.telemetryReading.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      orderBy: { recordedAt: "desc" },
      take: limit,
      include: { vehicle: { select: { code: true } } },
    });
    return rows.map((row) => toLog(row as DbReading));
  }

  const store = readStore();
  const codes = new Map(store.vehicles.map((vehicle) => [vehicle.id, vehicle.code]));
  return store.readings
    .filter((reading) => !vehicleId || reading.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, limit)
    .map((reading) => toLog(reading, codes.get(reading.vehicleId)));
}

export async function createReading(input: ReadingInput): Promise<AuditLogItem> {
  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.telemetryReading.create({
      data: {
        vehicleId: input.vehicleId,
        weight: input.weight,
        status: input.status as StatusType,
        relay: input.relay,
        lat: input.lat,
        lng: input.lng,
        speed: input.speed,
      },
    });
    await markVehicleSeen(input.vehicleId);
    return toLog(row as DbReading);
  }

  const stored: StoredReading = {
    id: crypto.randomUUID(),
    vehicleId: input.vehicleId,
    weight: input.weight,
    status: input.status,
    relay: input.relay,
    lat: input.lat,
    lng: input.lng,
    speed: input.speed,
    recordedAt: new Date().toISOString(),
  };
  mutateStore((store) => {
    store.readings.unshift(stored);
    store.readings = store.readings.slice(0, 500);
    const vehicle = store.vehicles.find((item) => item.id === input.vehicleId);
    if (vehicle) {
      vehicle.lastSeen = stored.recordedAt;
      vehicle.isActive = true;
    }
  });
  const code = readStore().vehicles.find((vehicle) => vehicle.id === input.vehicleId)?.code;
  return toLog(stored, code);
}

export async function getCommands(limit = 50): Promise<CommandLog[]> {
  const prisma = getPrisma();
  if (prisma) {
    const rows = await prisma.commandLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { issuedBy: { select: { name: true } } },
    });
    return rows.map((row) => toCommand(row as DbCommand));
  }

  const store = readStore();
  const names = new Map(store.users.map((user) => [user.id, user.name]));
  const codes = new Map(store.vehicles.map((vehicle) => [vehicle.id, vehicle.code]));
  return [...store.commands]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((command) => ({
      ...toCommand({ ...command, issuedBy: names.get(command.issuedById ?? "") ?? command.issuedBy }),
      vehicleCode: codes.get(command.vehicleId),
    }));
}

export async function createCommand(input: CommandInput): Promise<CommandLog> {
  const prisma = getPrisma();
  if (prisma) {
    const row = await prisma.commandLog.create({
      data: {
        vehicleId: input.vehicleId,
        issuedById: input.issuedById ?? null,
        action: input.action,
        topic: input.topic,
        payload: input.payload,
        status: input.status ?? "SENT",
      },
      include: { issuedBy: { select: { name: true } } },
    });
    return toCommand(row as DbCommand);
  }

  const stored: StoredCommand = {
    id: crypto.randomUUID(),
    vehicleId: input.vehicleId,
    issuedById: input.issuedById ?? null,
    issuedBy: input.issuedBy,
    action: input.action,
    topic: input.topic,
    payload: input.payload,
    status: input.status ?? "SENT",
    createdAt: new Date().toISOString(),
  };
  mutateStore((store) => store.commands.unshift(stored));
  const code = readStore().vehicles.find((vehicle) => vehicle.id === input.vehicleId)?.code;
  return { ...toCommand(stored), vehicleCode: code };
}
