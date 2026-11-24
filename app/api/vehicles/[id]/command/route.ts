import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publishRelayCommand } from "@/lib/mqtt-bridge";
import { getVehicleById } from "@/lib/repository";
import { CommandAction } from "@/types/iot";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "FORCE_ON" && body.action !== "FORCE_OFF") {
    return NextResponse.json({ error: "Perintah tidak dikenal." }, { status: 400 });
  }

  const { id } = await context.params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return NextResponse.json({ error: "Kendaraan tidak ditemukan." }, { status: 404 });

  const log = await publishRelayCommand(
    vehicle,
    body.action as CommandAction,
    user.name,
    user.id
  );

  return NextResponse.json({ log, topic: `${vehicle.topic}/control` });
}
