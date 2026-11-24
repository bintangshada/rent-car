import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const filePath = join(process.cwd(), "firmware", "safety_car", "safety_car.ino");
  const source = await readFile(filePath, "utf8");

  return new Response(source, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="safety_car.ino"',
    },
  });
}
