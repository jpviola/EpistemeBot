import type { Metadata } from "next";
import { PromptingCoach } from "@/components/PromptingCoach";

export const metadata: Metadata = {
  title: "Prompt Engineering · EpistemeBot",
  description: "Aprendé a escribir mejores prompts: roles, few-shot, chain of thought, constraints y más.",
};

export default function PromptingPage() {
  return <PromptingCoach />;
}
