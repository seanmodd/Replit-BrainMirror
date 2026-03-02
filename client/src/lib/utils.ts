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
  const hashtagMatches = content.match(/#(\w+)/g);
  if (hashtagMatches) {
    for (const ht of hashtagMatches) tags.add(ht);
  }
  if (tweet.source) tags.add(`#${tweet.source}`);
  const mediaUrls = (tweet.mediaUrls || []).filter((u: string) => u && u !== "");
  if (mediaUrls.length > 0) tags.add("#hasmedia");
  if (tweet.quotedTweetId || tweet.quotedTweetContent) tags.add("#hasquote");
  if (tweet.inReplyToTweetId) tags.add("#reply");
  if (content.startsWith("RT @")) tags.add("#retweet");
  const mentionMatches = content.match(/@(\w+)/g);
  if (mentionMatches) {
    for (const m of mentionMatches) tags.add(`#${m.slice(1)}`);
  }
  const contentLower = content.toLowerCase();
  const topicKeywords: Record<string, string[]> = {
    "ai": ["AI", "artificial intelligence", "machine learning", "ML", "GPT", "LLM", "neural network", "deep learning", "ChatGPT", "OpenAI", "AGI"],
    "crypto": ["crypto", "bitcoin", "ethereum", "blockchain", "web3", "NFT", "DeFi", "BTC", "ETH"],
    "programming": ["coding", "programming", "developer", "software", "API", "JavaScript", "Python", "TypeScript", "React", "code", "frontend", "backend", "fullstack"],
    "startup": ["startup", "founder", "fundraising", "venture capital", "VC", "seed round", "Series A", "YC", "accelerator"],
    "design": ["design", "UX", "UI", "Figma", "typography", "branding", "CSS"],
    "productivity": ["productivity", "workflow", "automation", "efficiency", "habit", "routine", "time management"],
    "marketing": ["marketing", "SEO", "growth", "content marketing", "social media", "branding", "audience"],
    "finance": ["finance", "investing", "stock", "market", "portfolio", "trading", "economy"],
    "writing": ["writing", "copywriting", "newsletter", "blogging", "content creation", "storytelling"],
  };
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    for (const kw of keywords) {
      if (contentLower.includes(kw.toLowerCase())) {
        tags.add(`#${topic}`);
        break;
      }
    }
  }
  const urlMatches = content.match(/https?:\/\/[^\s]+/g);
  if (urlMatches && urlMatches.length > 0) tags.add("#haslinks");
  if (content.length > 200) tags.add("#longform");
  return Array.from(tags).sort();
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
