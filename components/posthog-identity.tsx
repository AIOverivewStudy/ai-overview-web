"use client";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { useSearchParams } from "next/navigation";

export function PostHogIdentity() {
  const posthog = usePostHog();
  const searchParams = useSearchParams();

  useEffect(() => {
    const research_id = searchParams.get("RID") || "Anonymous user";
    posthog.identify(research_id);
  }, [posthog, searchParams]);

  return null;
}
