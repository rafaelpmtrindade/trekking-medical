import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { EventProvider } from "@/contexts/EventContext";

export const metadata: Metadata = {
  title: "TrackMed",
  description: "Sistema inteligente de apoio médico para eventos esportivos e outdoor.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <EventProvider>
            {children}
          </EventProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
