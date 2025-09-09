"use client"

import { useEffect } from "react"
import { trackReturnFromLink, initializeSession } from "@/lib/analytics"

export function AnalyticsTracker() {
  useEffect(() => {
    // Initialize session tracking
    console.log('🚀 Analytics Tracker initialized');
    
    initializeSession()

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
        historyLength: history.length
      });
      // Add a small delay to allow the page to settle
      setTimeout(() => {
        trackReturnFromLink("popstate")
      }, 100)
    }

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
        performance_navigation_type: performance.navigation?.type || 'unknown'
      });
      if (event.persisted) {
        // Page was loaded from cache (back button)
        console.log("💾 Page loaded from cache, checking for dwell time...");
        trackReturnFromLink("page_show_cached")
      }
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("pageshow", handlePageShow)

    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("pageshow", handlePageShow)
    }
  }, [])

  // This component doesn't render anything
  return null
}
