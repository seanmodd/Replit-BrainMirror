import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDisplayInfo(tweet: any): {
  displayName: string;
  displayHandle: string;
  displayContent: string;
  isRetweet: boolean;
} {
  const isRt = tweet.source === "retweet" || tweet.content?.startsWith("RT @");
  if (isRt) {
    const rtMatch = tweet.content?.match(/^RT @([\w]+):\s*([\s\S]*)$/);
    if (rtMatch) {
      return {
        displayName: rtMatch[1],
        displayHandle: rtMatch[1],
        displayContent: rtMatch[2],
        isRetweet: true,
      };
    }
  }
  return {
    displayName: tweet.authorName,
    displayHandle: tweet.authorHandle,
    displayContent: tweet.content,
    isRetweet: tweet.source === "retweet",
  };
}

export function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
