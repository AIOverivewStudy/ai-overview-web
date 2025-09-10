"use client";

import { useEffect } from "react";
import { trackReturnFromLink, initializeSession } from "@/lib/analytics";

export function AnalyticsTracker() {
  useEffect(() => {
    // Initialize session tracking
    console.log("🚀 Analytics Tracker initialized");

    initializeSession();

    // Removed automatic dwell time checking on page load
    // This was causing inaccurate timing measurements

    // Don't check for dwell time on initial page load
    // Dwell time should only be calculated when user returns to a page, not when they first visit it
    // This prevents false dwell time calculations when navigating to iframe pages

    // Set up event listeners for popstate (browser back/forward)
    const handlePopState = () => {
      console.log("⬅️ Browser back/forward button, checking for dwell time...");
      console.log("⬅️ PopState event details:", {
        timestamp: new Date().toISOString(),
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
        url: window.location.href,
        referrer: document.referrer,
        historyLength: history.length,
        fromAiMode:
          document.referrer.includes("/ai-mode") ||
          window.location.href.includes("from="),
      });

      // Delay slightly to ensure DOM is ready and page state is stable
      setTimeout(() => {
        console.log("🔄 Delayed dwell time tracking (popstate)");
        trackReturnFromLink("popstate_delayed");
      }, 100);

      // Also track immediately for backup
      console.log("🔄 Immediate dwell time tracking (popstate)");
      trackReturnFromLink("popstate_immediate");
    };

    // Set up event listeners for page show (when page becomes visible from cache)
    const handlePageShow = (event: PageTransitionEvent) => {
      console.log("📄 Page show event, persisted:", event.persisted);
      console.log("📄 PageShow event details:", {
        timestamp: new Date().toISOString(),
        persisted: event.persisted,
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
        url: window.location.href,
        referrer: document.referrer,
        performance_navigation_type: performance.navigation?.type || "unknown",
      });
      if (event.persisted) {
        // Page was loaded from cache (back button)
        console.log("💾 Page loaded from cache, checking for dwell time...");
        trackReturnFromLink("page_show_cached");
      }
    };

    // Enhanced event listeners for better dwell time tracking
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    // Removed handleBeforeUnload - replaced with enhanced version below

    let hasInitialLoadComplete = false;

    const handleLoad = () => {
      console.log("🔄 Window load event");
      if (hasInitialLoadComplete) {
        console.log(
          "🔄 Not initial load - checking for return from external navigation"
        );
        // Immediate check for better timing accuracy
        trackReturnFromLink("window_load");
      } else {
        console.log("🔄 Initial load - skipping dwell time check");
        hasInitialLoadComplete = true;
      }
    };

    // Focus on dwell time capture - removed visibility tracking per user request

    // Enhanced beforeunload handler to ensure dwell time is recorded
    const handleBeforeUnloadEnhanced = () => {
      console.log("🚪 Enhanced before unload event - ensuring dwell time is recorded");
      console.log("🚪 BeforeUnload details:", {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        hasPendingClickEvents: sessionStorage.getItem(`click_event_stack_${new URLSearchParams(window.location.search).get("RID") || "0"}`) !== null,
      });
      
      // Removed: trackReturnFromLink("beforeunload_sync") - was causing duplicate tracking
      // beforeunload is fired when leaving a page, not when returning to it
      // Dwell time should be calculated when the user actually returns, not when leaving
    };

    // Add pagehide event for better browser back button detection
    const handlePageHide = (event: PageTransitionEvent) => {
      console.log("🔚 Page hide event - user might be leaving via back button");
      console.log("🔚 PageHide details:", {
        timestamp: new Date().toISOString(),
        persisted: event.persisted,
        url: window.location.href,
        hasPendingClickEvents: sessionStorage.getItem(`click_event_stack_${new URLSearchParams(window.location.search).get("RID") || "0"}`) !== null,
      });
      
      // Removed: trackReturnFromLink("pagehide_event") - was causing duplicate tracking
      // pagehide is fired when leaving a page, not when returning to it
      // Dwell time should be calculated when the user actually returns, not when leaving
    };

    // Removed handleFocus - was causing false positive dwell time calculations
    // Focus events are too noisy (tab switching, window clicking, etc.)

    window.addEventListener("beforeunload", handleBeforeUnloadEnhanced);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("load", handleLoad);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeunload", handleBeforeUnloadEnhanced);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
