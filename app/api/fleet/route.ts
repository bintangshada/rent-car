import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureBridgeStarted,
  getBridgeError,
  getBridgeStatus,
  getPendingCommandCount,
  isDemoActive,
  subscribeVehicleTopic,
} from "@/lib/mqtt-bridge";
import { getCommands, getReadings, getVehicles } from "@/lib/repository";
import { brokerBridgeUrl, brokerUrl, brokerWebUrl } from "@/lib/telemetry";

export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureBridgeStarted();
  const [vehicles, logs, commands] = await Promise.all([
    getVehicles(),
    getReadings(200),
    getCommands(50),
  ]);

  for (const vehicle of vehicles) subscribeVehicleTopic(vehicle.topic);

  return NextResponse.json({
    vehicles,
    logs,
    commands,
    brokerStatus: getBridgeStatus(),
    brokerError: getBridgeError(),
    pendingCommands: getPendingCommandCount(),
    demoActive: isDemoActive(),
    brokerUrl: brokerWebUrl(),
    brokerTcpUrl: brokerUrl(),
    brokerBridgeUrl: brokerBridgeUrl(),
    generatedAt: new Date().toISOString(),
  });
}
