"use client"
import { DiscussionsAndForums } from "@/components/discussions-and-forums"

interface ConditionalDiscussionsProps {
  topic: string
  show?: boolean
}

const topicsWithDiscussions = ['Car-vehicle', 'Phone', 'Taylor-swift'];

export function ConditionalDiscussions({ topic, show = true }: ConditionalDiscussionsProps) {
  if (!show || !topicsWithDiscussions.includes(topic)) {
    return null;
  }

  return <DiscussionsAndForums />;
}
