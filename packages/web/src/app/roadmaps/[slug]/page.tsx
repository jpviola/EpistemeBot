import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoadmap, ROADMAPS } from "@/data/roadmaps";
import { RoadmapViewer } from "@/components/RoadmapViewer";

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return ROADMAPS.map(r => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoadmap(slug);
  if (!r) return {};
  return {
    title: `${r.emoji} ${r.title} · EpistemeBot`,
    description: r.description,
  };
}

export default async function RoadmapPage({ params }: Props) {
  const { slug } = await params;
  const roadmap = getRoadmap(slug);
  if (!roadmap) notFound();
  return <RoadmapViewer roadmap={roadmap} />;
}
