-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FLEET_COMMANDER', 'SAFETY_OFFICER', 'ARMADA_DRIVER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('PASSENGER', 'OPERATIONAL', 'LIGHT_TRUCK', 'MINIBUS');

-- CreateEnum
CREATE TYPE "TelemetryStatus" AS ENUM ('AMAN', 'WARNING', 'OVERLOAD');

-- CreateEnum
CREATE TYPE "CommandAction" AS ENUM ('FORCE_ON', 'FORCE_OFF');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ARMADA_DRIVER',
    "avatar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'PASSENGER',
    "topic" TEXT NOT NULL,
    "warningLimit" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "overloadLimit" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_readings" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "status" "TelemetryStatus" NOT NULL,
    "relay" BOOLEAN NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_logs" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "issuedById" TEXT,
    "action" "CommandAction" NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_code_key" ON "vehicles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plateNumber_key" ON "vehicles"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_topic_key" ON "vehicles"("topic");

-- CreateIndex
CREATE INDEX "telemetry_readings_vehicleId_recordedAt_idx" ON "telemetry_readings"("vehicleId", "recordedAt");

-- CreateIndex
CREATE INDEX "command_logs_vehicleId_createdAt_idx" ON "command_logs"("vehicleId", "createdAt");

-- AddForeignKey
ALTER TABLE "telemetry_readings" ADD CONSTRAINT "telemetry_readings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

