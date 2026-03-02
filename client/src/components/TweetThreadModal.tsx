import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bookmark, ExternalLink, Globe, Heart, MessageCircle, Pencil, Repeat2, Loader2, AlertCircle } from "lucide-react";
import { formatTimeAgo, formatContent, isVideoUrl, proxyImageUrl } from "@/lib/utils";
import { api } from "@/lib/api";

interface TweetThreadModalProps {
  tweet: any;
  allTweets: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ThreadTweetCard({ t, isHighlighted }: { t: any; isHighlighted: boolean }) {
  const profileUrl = t.authorProfileImageUrl ? proxyImageUrl(t.authorProfileImageUrl) : null;
  const mediaUrls = (t.mediaUrls || []).filter((u: string) => u && u !== "");

  return (
    <div className={`px-4 py-3 ${isHighlighted ? "bg-[#7C3AED]/5 border-l-2 border-[#7C3AED]" : ""}`}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={t.authorName}
              className={`w-10 h-10 rounded-full object-cover ${isHighlighted ? "ring-2 ring-[#7C3AED]" : ""}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
            />
          ) : null}
          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm ${isHighlighted ? "ring-2 ring-[#7C3AED]" : ""} ${profileUrl ? 'hidden' : ''}`}>
            {t.authorName?.[0]?.toUpperCase() || "?"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[15px] text-foreground truncate">{t.authorName}</span>
            <span className="text-muted-foreground text-[14px] truncate">@{t.authorHandle}</span>
          </div>

          <div className="text-[15px] text-foreground leading-[22px] mt-1 whitespace-pre-wrap break-words">
            {formatContent(t.text)}
          </div>

          {mediaUrls.length > 0 && (
            <div className={`mt-3 rounded-2xl overflow-hidden border border-border ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
              {mediaUrls.map((url: string, i: number) =>
                isVideoUrl(url) ? (
                  <div key={i} className="relative bg-black max-h-[300px]">
                    <video src={proxyImageUrl(url)} controls playsInline preload="metadata" className="w-full object-contain max-h-[300px]" />
                  </div>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                    <img src={proxyImageUrl(url)} alt="" className="w-full object-cover max-h-[300px] hover:opacity-90 transition-opacity" loading="lazy" />
                  </a>
                )
              )}
            </div>
          )}

          {t.quotedTweetContent && t.quotedTweetAuthorHandle && (
            <div className="mt-3 border border-border rounded-2xl overflow-hidden p-3">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-[10px]">
                  {(t.quotedTweetAuthorName || t.quotedTweetAuthorHandle)?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="font-bold text-[13px]">{t.quotedTweetAuthorName || t.quotedTweetAuthorHandle}</span>
                <span className="text-muted-foreground text-[13px]">@{t.quotedTweetAuthorHandle}</span>
              </div>
              <div className="text-[14px] leading-[18px] whitespace-pre-wrap break-words">
                {formatContent(t.quotedTweetContent)}
              </div>
            </div>
          )}

          <div className="text-[13px] text-muted-foreground mt-2">
            {t.createdAt ? formatTimeAgo(t.createdAt) : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TweetThreadModal({ tweet, allTweets, open, onOpenChange }: TweetThreadModalProps) {
  const conversationId = tweet?.conversationId || tweet?.tweetId;

  const { data: threadData, isLoading, error } = useQuery({
    queryKey: ["/api/thread", conversationId],
    queryFn: () => api.thread(conversationId),
    enabled: open && !!conversationId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const localThreadTweets = useMemo(() => {
    if (!tweet) return [];
    const convId = tweet.conversationId;
    const inThread = allTweets.filter(
      (t: any) => t.conversationId === convId || t.inReplyToTweetId === tweet.tweetId || tweet.inReplyToTweetId === t.tweetId
    );
    const uniqueThread = Array.from(new Map(inThread.map(t => [t.id, t])).values());
    uniqueThread.sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return uniqueThread;
  }, [tweet, allTweets]);

  if (!tweet) return null;

  const apiThreadTweets = threadData?.tweets || [];
  const hasApiThread = apiThreadTweets.length > 0;
  const displayTweets = hasApiThread ? apiThreadTweets : localThreadTweets.map((t: any) => ({
    id: t.tweetId,
    text: t.content,
    authorName: t.authorName,
    authorHandle: t.authorHandle,
    authorProfileImageUrl: t.authorProfileImageUrl,
    createdAt: t.createdAt,
    mediaUrls: t.mediaUrls,
    quotedTweetContent: t.quotedTweetContent,
    quotedTweetAuthorHandle: t.quotedTweetAuthorHandle,
    quotedTweetAuthorName: t.quotedTweetAuthorName,
  }));

  const totalCount = displayTweets.length;
  const highlightTweetId = tweet.tweetId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="modal-tweet-thread"
        className="max-w-[650px] max-h-[90vh] overflow-y-auto p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              {totalCount > 1 ? `Full Thread (${totalCount} tweets)` : "Tweet"}
            </DialogTitle>
            <a
              href={tweet.tweetUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="button-view-on-x"
              className="text-xs text-muted-foreground hover:text-[#1d9bf0] flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={12} />
              View on X
            </a>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" />
            <p className="text-sm text-muted-foreground">Fetching full thread from X...</p>
          </div>
        ) : error && !hasApiThread && localThreadTweets.length <= 1 ? (
          <div className="divide-y divide-border">
            <ThreadTweetCard t={{
              id: tweet.tweetId,
              text: tweet.content,
              authorName: tweet.authorName,
              authorHandle: tweet.authorHandle,
              authorProfileImageUrl: tweet.authorProfileImageUrl,
              createdAt: tweet.createdAt,
              mediaUrls: tweet.mediaUrls,
              quotedTweetContent: tweet.quotedTweetContent,
              quotedTweetAuthorHandle: tweet.quotedTweetAuthorHandle,
              quotedTweetAuthorName: tweet.quotedTweetAuthorName,
            }} isHighlighted={false} />
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground bg-foreground/[0.02]">
              <AlertCircle size={14} />
              <span>Could not fetch full thread. Showing saved data only.</span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayTweets.map((t: any, idx: number) => (
              <ThreadTweetCard
                key={t.id || idx}
                t={t}
                isHighlighted={t.id === highlightTweetId}
              />
            ))}
            {hasApiThread && (
              <div className="px-4 py-2 text-[12px] text-muted-foreground text-center bg-foreground/[0.02]">
                {totalCount} tweet{totalCount !== 1 ? "s" : ""} in this thread
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
