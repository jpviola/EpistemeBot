import type { NextAuthConfig } from "next-auth";

// Edge-compatible config (no DB, no bcrypt) — used by middleware
export const authConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/teacher")) {
        return auth?.user?.role === "teacher";
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.role      = (user as { role?: string }).role ?? "student";
        token.interests = (user as { interests?: string[] }).interests ?? [];
      }
      return token;
    },
    session({ session, token }) {
      session.user.id        = token.id        as string;
      session.user.role      = token.role      as string;
      session.user.interests = token.interests as string[] | undefined;
      return session;
    },
  },
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
