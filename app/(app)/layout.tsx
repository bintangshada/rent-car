import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <TelemetryProvider>
      <AppShell user={user}>{children}</AppShell>
    </TelemetryProvider>
  );
}
