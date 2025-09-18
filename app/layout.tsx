"use client";
import type React from "react";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { PostHogIdentity } from "@/components/posthog-identity";
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
        </Suspense>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
