import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FleetSync — Rental Car IoT Tracking",
    template: "%s | FleetSync",
  },
  description:
    "Platform monitoring armada rental: beban penumpang, lokasi GPS real-time, dan kendali motor jarak jauh.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
