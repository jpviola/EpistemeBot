import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const user = await (db as any).user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, school: true, bio: true,
      interests: true, socialLinks: true,
      createdAt: true,
    },
  });
  if (!user) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  return Response.json({
    ...user,
    interests: user.interests ? JSON.parse(user.interests) : [],
    socialLinks: user.socialLinks ? JSON.parse(user.socialLinks) : {},
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    school?: string;
    bio?: string;
    interests?: string[];
    socialLinks?: { twitter?: string; instagram?: string; linkedin?: string; github?: string };
  };

  const updated = await (db as any).user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name      !== undefined && { name: body.name }),
      ...(body.school    !== undefined && { school: body.school }),
      ...(body.bio       !== undefined && { bio: body.bio }),
      ...(body.interests !== undefined && { interests: JSON.stringify(body.interests) }),
      ...(body.socialLinks !== undefined && { socialLinks: JSON.stringify(body.socialLinks) }),
    },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, school: true, bio: true,
      interests: true, socialLinks: true,
    },
  });

  return Response.json({
    ...updated,
    interests: updated.interests ? JSON.parse(updated.interests) : [],
    socialLinks: updated.socialLinks ? JSON.parse(updated.socialLinks) : {},
  });
}
