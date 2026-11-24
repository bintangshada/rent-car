import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toggleDemo } from "@/lib/mqtt-bridge";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = toggleDemo();
  return NextResponse.json({ demoActive: active });
}
