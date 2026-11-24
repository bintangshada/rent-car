import { NextResponse } from "next/server";
import { canManageFleet, getCurrentUser } from "@/lib/auth";
import { emitAppEvent } from "@/lib/events";
import { subscribeVehicleTopic } from "@/lib/mqtt-bridge";
import { createVehicle, getVehicles } from "@/lib/repository";
import { VehicleInput } from "@/lib/repository";
import { VehicleType } from "@/types/iot";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFleet(user.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<VehicleInput>;
  const code = body.code?.trim().toUpperCase();
  const name = body.name?.trim();
  const plateNumber = body.plateNumber?.trim().toUpperCase();
  const topic = body.topic?.trim();
  const driverName = body.driverName?.trim();

  if (!code || !name || !plateNumber || !topic || !driverName) {
    return NextResponse.json({ error: "Semua field wajib diisi." }, { status: 400 });
  }

  const warningLimit = Number(body.warningLimit);
  const overloadLimit = Number(body.overloadLimit);
  if (!(warningLimit > 0) || !(overloadLimit > warningLimit)) {
    return NextResponse.json(
      { error: "Batas overload harus lebih besar dari batas peringatan." },
      { status: 400 }
    );
  }

  const vehicles = await getVehicles();
  if (
    vehicles.some(
      (vehicle) =>
        vehicle.code === code ||
        vehicle.plateNumber === plateNumber ||
        vehicle.topic === topic
    )
  ) {
    return NextResponse.json(
      { error: "Kode, plat nomor, atau topik sudah digunakan kendaraan lain." },
      { status: 409 }
    );
  }

  const allowedTypes: VehicleType[] = ["PASSENGER", "OPERATIONAL", "LIGHT_TRUCK", "MINIBUS"];
  const vehicleType = allowedTypes.includes(body.vehicleType as VehicleType)
    ? (body.vehicleType as VehicleType)
    : "PASSENGER";

  const vehicle = await createVehicle({
    code,
    name,
    plateNumber,
    driverName,
    vehicleType,
    topic,
    warningLimit,
    overloadLimit,
    isActive: body.isActive !== false,
  });

  subscribeVehicleTopic(topic);
  emitAppEvent({ type: "vehicles" });
  return NextResponse.json({ vehicle }, { status: 201 });
}
