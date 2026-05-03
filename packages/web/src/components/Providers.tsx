"use client";

import { SessionProvider } from "next-auth/react";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });
        console.info("[sentry] browser initialized");
      } catch (e) {
        console.warn("[sentry] browser init failed", e);
      }
    }
  }, []);

  return (
    <SessionProvider>
      <Sentry.ErrorBoundary fallback={<div>Se produjo un error en la aplicación.</div>}>
        {children}
      </Sentry.ErrorBoundary>
    </SessionProvider>
  );
}
