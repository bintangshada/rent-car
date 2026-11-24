import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { SEED_USERS, SEED_VEHICLES, buildSeedReadings } from "../lib/seed-data";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diset. Salin .env.example ke .env lalu isi koneksi Supabase.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        passwordHash: bcrypt.hashSync(user.password, 10),
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: bcrypt.hashSync(user.password, 10),
        role: user.role,
        avatar: user.avatar,
      },
    });
  }

  for (const vehicle of SEED_VEHICLES) {
    await prisma.vehicle.upsert({
      where: { code: vehicle.code },
      update: {
        name: vehicle.name,
        plateNumber: vehicle.plateNumber,
        driverName: vehicle.driverName,
        vehicleType: vehicle.vehicleType,
        topic: vehicle.topic,
        warningLimit: vehicle.warningLimit,
        overloadLimit: vehicle.overloadLimit,
        isActive: vehicle.isActive,
      },
      create: {
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
      },
    });

    const existing = await prisma.telemetryReading.count({ where: { vehicleId: vehicle.id } });
    if (existing === 0) {
      await prisma.telemetryReading.createMany({
        data: buildSeedReadings(vehicle).map((reading) => ({
          ...reading,
          status: reading.status,
        })),
      });
    }
  }

  console.log("Seeder selesai: users, vehicles, dan telemetry berhasil dibuat.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
