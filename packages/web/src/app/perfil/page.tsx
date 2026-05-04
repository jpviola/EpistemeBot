import type { Metadata } from "next";
import { ProfilePage } from "@/components/ProfilePage";

export const metadata: Metadata = {
  title: "Mi perfil · EpistemeBot",
  description: "Tu perfil de estudiante: progreso, badges, intereses y más.",
};

export default function PerfilPage() {
  return <ProfilePage />;
}
