import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EpistemeBot — Tutor de Humanidades",
  description: "Plataforma semántica de educación en humanidades: filosofía, historia, psicología, literatura, arte y ciencias sociales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
