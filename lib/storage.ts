import { IoTDevice, User } from "@/types/iot";

export const DEFAULT_USERS: User[] = [
  {
    id: "usr-admin",
    name: "Bintang Shada (Fleet Admin)",
    email: "admin@safetycar.id",
    role: "Fleet Commander",
    avatar: "BS",
  },
  {
    id: "usr-driver",
    name: "Budi Santoso",
    email: "driver1@safetycar.id",
    role: "Armada Driver",
    avatar: "BD",
  },
];

export const INITIAL_DEVICES: IoTDevice[] = [
  {
    id: "DEV-001",
    name: "Armada 01 - Avanza Patroli",
    plateNumber: "L 1945 UPN",
    driverName: "Budi Santoso",
    vehicleType: "Mobil Operasional",
    topic: "bintang/if-upn/safety-car/data", // Default topic yang sudah kompatibel langsung dengan Wokwi/ESP32 saat ini!
    warningLimit: 30,
    overloadLimit: 50,
    isOnline: true,
    lastUpdated: "Baru saja",
    telemetry: {
      weight: 18.4,
      status: "AMAN",
      relay: true,
      lat: -7.333145,
      lng: 112.788452,
      speed: 42.5,
    },
    logs: [
      {
        id: "log-1",
        time: "10:20:15",
        weight: 18.4,
        status: "AMAN",
        relay: true,
        lat: -7.333145,
        lng: 112.788452,
        speed: 42.5,
      },
    ],
  },
  {
    id: "DEV-002",
    name: "Armada 02 - Innova Zenix VIP",
    plateNumber: "B 2024 UPN",
    driverName: "Siti Rahma",
    vehicleType: "Mobil Penumpang",
    topic: "bintang/if-upn/safety-car/data/DEV-002",
    warningLimit: 35,
    overloadLimit: 60,
    isOnline: true,
    lastUpdated: "1 mnt lalu",
    telemetry: {
      weight: 38.2,
      status: "WARNING",
      relay: true,
      lat: -7.33512,
      lng: 112.78912,
      speed: 28.0,
    },
    logs: [
      {
        id: "log-2",
        time: "10:19:40",
        weight: 38.2,
        status: "WARNING",
        relay: true,
        lat: -7.33512,
        lng: 112.78912,
        speed: 28.0,
      },
    ],
  },
  {
    id: "DEV-003",
    name: "Armada 03 - HiAce Shuttle Kampus",
    plateNumber: "N 7788 AB",
    driverName: "Ahmad Fauzi",
    vehicleType: "Minibus",
    topic: "bintang/if-upn/safety-car/data/DEV-003",
    warningLimit: 40,
    overloadLimit: 70,
    isOnline: true,
    lastUpdated: "3 mnt lalu",
    telemetry: {
      weight: 22.0,
      status: "AMAN",
      relay: true,
      lat: -7.33125,
      lng: 112.78654,
      speed: 35.2,
    },
    logs: [
      {
        id: "log-3",
        time: "10:18:12",
        weight: 22.0,
        status: "AMAN",
        relay: true,
        lat: -7.33125,
        lng: 112.78654,
        speed: 35.2,
      },
    ],
  },
];

const STORAGE_KEY_USER = "safetycar_current_user";
const STORAGE_KEY_DEVICES = "safetycar_registered_devices";

export function getSavedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY_USER);
  } else {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }
}

export function getSavedDevices(): IoTDevice[] {
  if (typeof window === "undefined") return INITIAL_DEVICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEVICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(INITIAL_DEVICES));
      return INITIAL_DEVICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEVICES;
  }
}

export function saveDevices(devices: IoTDevice[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(devices));
}

