import type { Metadata } from "next";
import { StudyCoach } from "@/components/StudyCoach";

export const metadata: Metadata = {
  title: "Técnicas de estudio · EpistemeBot",
  description: "Aprendé metodologías de estudio efectivas: Pomodoro, Feynman, Cornell, repetición espaciada, Kanban y más.",
};

export default function TecnicasPage() {
  return <StudyCoach />;
}
