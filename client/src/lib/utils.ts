import React from "react"
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
  retweetedBy: string | null;
} {
  const content = tweet.content || "";
  const isRt = tweet.source === "retweet" || content.startsWith("RT @");
  if (isRt) {
    const rtMatch = content.match(/^RT @([\w]+):\s*([\s\S]*)$/);
    if (rtMatch) {
      return {
        displayName: rtMatch[1],
        displayHandle: rtMatch[1],
        displayContent: rtMatch[2],
        isRetweet: true,
        retweetedBy: tweet.authorName || tweet.authorHandle,
      };
    }
  }

  const urlMatch = tweet.tweetUrl?.match(/x\.com\/(\w+)\/status/);
  const urlAuthor = urlMatch ? urlMatch[1] : null;
  const storedHandle = tweet.authorHandle || "unknown";
  const storedName = tweet.authorName || storedHandle;

  if (urlAuthor && urlAuthor.toLowerCase() !== storedHandle.toLowerCase()) {
    return {
      displayName: urlAuthor,
      displayHandle: urlAuthor,
      displayContent: content,
      isRetweet: false,
      retweetedBy: null,
    };
  }

  return {
    displayName: storedName,
    displayHandle: storedHandle,
    displayContent: content,
    isRetweet: isRt,
    retweetedBy: null,
  };
}

export function formatContent(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(@\w+|#\w+|https?:\/\/\S+)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("http")) {
      parts.push(
        React.createElement("a", { key: key++, href: token, target: "_blank", rel: "noreferrer", className: "text-[#1d9bf0] hover:underline" }, token)
      );
    } else {
      parts.push(
        React.createElement("span", { key: key++, className: "text-[#1d9bf0]" }, token)
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
}

export function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") ||
    lower.includes("/video/") || lower.includes("video.twimg.com") ||
    lower.includes("/ext_tw_video/") || lower.includes("/amplify_video/");
}

export function proxyImageUrl(url: string): string {
  if (!url) return url;
  if (url.includes("twimg.com")) {
    return `/api/proxy/twitter-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function getAutoTags(tweet: any): string[] {
  const tags = new Set<string>();
  const existingTags = tweet.tags || [];
  for (const t of existingTags) {
    tags.add(t.startsWith("#") ? t : `#${t}`);
  }
  const content = tweet.content || "";
  const isRt = content.startsWith("RT @") || tweet.source === "retweet";
  if (isRt) {
    tags.add("#retweet");
  }
  if (tweet.source === "bookmark" || (!isRt && tweet.source !== "retweet")) {
    tags.add("#bookmark");
  }
  return Array.from(tags);
}

export interface LinkCardData {
  url: string;
  displayUrl?: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
}

export function getLinkCards(tweet: any): LinkCardData[] {
  if (tweet.linkCards && Array.isArray(tweet.linkCards) && tweet.linkCards.length > 0) {
    return tweet.linkCards;
  }
  return [];
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " PST";
}
