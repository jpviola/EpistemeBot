import type { Metadata } from "next";
import { RoadmapIndex } from "@/components/RoadmapIndex";

export const metadata: Metadata = {
  title: "Trayectos de estudio · EpistemeBot",
  description: "Rutas de aprendizaje estructuradas para Filosofía, Historia, Psicología y Literatura.",
};

export default function RoadmapsPage() {
  return <RoadmapIndex />;
}
