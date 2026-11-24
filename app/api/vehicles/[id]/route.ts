import { NextResponse } from "next/server";
import { canManageFleet, getCurrentUser } from "@/lib/auth";
import { emitAppEvent } from "@/lib/events";
import { deleteVehicle, updateVehicle } from "@/lib/repository";
import { VehicleInput } from "@/lib/repository";

interface Context {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageFleet(user.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Partial<VehicleInput>;
  const patch: Partial<VehicleInput> = {};

  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.driverName !== undefined) patch.driverName = body.driverName.trim();
  if (body.plateNumber !== undefined) patch.plateNumber = body.plateNumber.trim().toUpperCase();
  if (body.topic !== undefined) patch.topic = body.topic.trim();
  if (body.vehicleType !== undefined) patch.vehicleType = body.vehicleType;
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
  if (body.warningLimit !== undefined) patch.warningLimit = Number(body.warningLimit);
  if (body.overloadLimit !== undefined) patch.overloadLimit = Number(body.overloadLimit);

  if (
    (patch.warningLimit !== undefined && !(patch.warningLimit > 0)) ||
    (patch.overloadLimit !== undefined && !(patch.overloadLimit > 0))
  ) {
    return NextResponse.json({ error: "Batas beban tidak valid." }, { status: 400 });
  }

  const vehicle = await updateVehicle(id, patch);
  if (!vehicle) return NextResponse.json({ error: "Kendaraan tidak ditemukan." }, { status: 404 });

  emitAppEvent({ type: "vehicles" });
  return NextResponse.json({ vehicle });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "FLEET_COMMANDER") {
    return NextResponse.json({ error: "Hanya Fleet Commander yang bisa menghapus." }, { status: 403 });
  }

  const { id } = await context.params;
  const deleted = await deleteVehicle(id);
  if (!deleted) return NextResponse.json({ error: "Kendaraan tidak ditemukan." }, { status: 404 });

  emitAppEvent({ type: "vehicles" });
  return NextResponse.json({ ok: true });
}
