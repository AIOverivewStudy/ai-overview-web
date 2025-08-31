"use client"
import { AiOverview } from "@/components/ai-overview"

interface ConditionalAiOverviewProps {
  position: 'top' | 'middle' | 'none'
  show?: boolean
}

export function ConditionalAiOverview({ position, show = true }: ConditionalAiOverviewProps) {
  if (!show || position === 'none') {
    return null;
  }

  if (position === 'top') {
    return (
      <div className="px-42">
        <AiOverview />
      </div>
    );
  }

  // For middle position, return just the component - positioning will be handled by parent
  return <AiOverview />;
}
