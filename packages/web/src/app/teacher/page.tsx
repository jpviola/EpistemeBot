import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherDashboard } from "@/components/TeacherDashboard";

export const metadata = { title: "Dashboard Docente · EpistemeBot" };

export default async function TeacherPage() {
  const session = await auth();
  if (!session || session.user.role !== "teacher") redirect("/login?redirect=/teacher");

  return <TeacherDashboard teacherName={session.user.name} />;
}
