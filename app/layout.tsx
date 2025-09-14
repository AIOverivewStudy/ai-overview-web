"use client";
import type React from "react";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { Suspense, useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useSearchParams } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const posthog = usePostHog();
  const searchParams = useSearchParams();

  useEffect(() => {
    const research_id = searchParams.get("RID") || "Anonymous user";
    posthog.identify(research_id);
  }, [posthog, searchParams]);
  return (
    <html lang="en">
      <body>
        <AnalyticsTracker />
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
