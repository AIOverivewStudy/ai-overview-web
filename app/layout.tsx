"use client";
import type React from "react";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { PostHogIdentity } from "@/components/posthog-identity";
import { EnhancedPostHogTracker } from "@/components/enhanced-posthog-tracker";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsTracker />
        <Suspense fallback={null}>
          <PostHogIdentity />
          <EnhancedPostHogTracker />
        </Suspense>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
