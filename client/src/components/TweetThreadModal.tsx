import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bookmark, ExternalLink, Globe, Heart, MessageCircle, Pencil, Repeat2, Play } from "lucide-react";
import { getDisplayInfo, formatTimeAgo, formatContent, isVideoUrl, proxyImageUrl, getAutoTags, getLinkCards } from "@/lib/utils";

interface TweetThreadModalProps {
  tweet: any;
  allTweets: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MediaItemComponent({ url, tweetId, index, single }: { url: string; tweetId: string; index: number; single: boolean }) {
  const proxiedUrl = proxyImageUrl(url);
  if (isVideoUrl(url)) {
    return (
      <div className={`relative ${single ? "max-h-[400px]" : "h-[180px]"} bg-black`}>
        <video
          data-testid={`modal-video-media-${tweetId}-${index}`}
          src={proxiedUrl}
          controls
          playsInline
          preload="metadata"
          className={`w-full object-contain ${single ? "max-h-[400px]" : "h-[180px]"}`}
        />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        data-testid={`modal-img-media-${tweetId}-${index}`}
        src={proxiedUrl}
        alt=""
        className={`w-full object-cover ${single ? "max-h-[400px]" : "h-[180px]"} hover:opacity-90 transition-opacity`}
        loading="lazy"
      />
    </a>
  );
}

export default function TweetThreadModal({ tweet, allTweets, open, onOpenChange }: TweetThreadModalProps) {
  const threadTweets = useMemo(() => {
    if (!tweet) return [];
    const convId = tweet.conversationId;
    const inThread = allTweets.filter(
      (t: any) => t.conversationId === convId
    );
    inThread.sort(
      (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return inThread;
  }, [tweet, allTweets]);

  if (!tweet) return null;

  const hasThread = threadTweets.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="modal-tweet-thread"
        className="max-w-[600px] max-h-[85vh] overflow-y-auto p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
          <DialogTitle className="text-lg font-bold">
            {hasThread ? `Thread (${threadTweets.length} tweets)` : "Tweet"}
          </DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border">
          {threadTweets.map((t: any, idx: number) => (
            <ThreadTweetItem
              key={t.id}
              tweet={t}
              isMainTweet={t.id === tweet.id}
              isLast={idx === threadTweets.length - 1}
              showConnector={hasThread && idx < threadTweets.length - 1}
              allTweets={allTweets}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThreadTweetItem({
  tweet,
  isMainTweet,
  isLast,
  showConnector,
  allTweets,
}: {
  tweet: any;
  isMainTweet: boolean;
  isLast: boolean;
  showConnector: boolean;
  allTweets: any[];
}) {
  const { displayName, displayHandle, displayContent, isRetweet, retweetedBy } = getDisplayInfo(tweet);
  const mediaUrls = (tweet.mediaUrls || []).filter((u: string) => u && u !== "");
  const autoTags = getAutoTags(tweet);

  const contentLinks = (tweet.links || []).filter((u: string) => u && u !== "" && u !== "undefined");
  const videoLinks = contentLinks.filter((u: string) => isVideoUrl(u) && !u.includes("x.com/") && !u.includes("twitter.com/"));
  const allMedia = [...mediaUrls, ...videoLinks.filter((v: string) => !mediaUrls.includes(v))];
  const profileSrc = tweet.authorProfileImageUrl ? proxyImageUrl(tweet.authorProfileImageUrl) : null;

  const hasStoredQuote = tweet.quotedTweetContent && tweet.quotedTweetAuthorHandle;
  const fallbackQuote = tweet.quotedTweetId ? allTweets.find((t: any) => t.tweetId === tweet.quotedTweetId) : null;
  const showQuote = hasStoredQuote || fallbackQuote;
  const quoteName = hasStoredQuote ? tweet.quotedTweetAuthorName : fallbackQuote?.authorName;
  const quoteHandle = hasStoredQuote ? tweet.quotedTweetAuthorHandle : fallbackQuote?.authorHandle;
  const quoteContent = hasStoredQuote ? tweet.quotedTweetContent : fallbackQuote?.content;
  const quoteMediaUrls = fallbackQuote ? (fallbackQuote.mediaUrls || []).filter((u: string) => u && u !== "") : [];

  const fullDate = formatTimeAgo(tweet.createdAt);

  return (
    <article
      data-testid={`modal-tweet-${tweet.id}`}
      className={`px-4 py-3 ${isMainTweet ? "bg-foreground/[0.03]" : ""}`}
    >
      {isRetweet && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-1 ml-[52px]">
          <Repeat2 size={14} />
          <span className="font-bold">{retweetedBy ? `${retweetedBy} reposted` : "Reposted"}</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          {profileSrc ? (
            <img
              data-testid={`modal-avatar-img-${tweet.id}`}
              src={profileSrc}
              alt={displayName}
              className={`w-10 h-10 rounded-full object-cover shrink-0 ${isMainTweet ? "ring-2 ring-[#7C3AED]" : ""}`}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
            />
          ) : null}
          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm shrink-0 ${isMainTweet ? "ring-2 ring-[#7C3AED]" : ""} ${profileSrc ? 'hidden' : ''}`}>
            {displayName?.[0]?.toUpperCase() || "?"}
          </div>
          {showConnector && (
            <div className="w-0.5 flex-1 bg-border mt-1 min-h-[8px]" />
          )}
        </div>

        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-bold text-[15px] text-foreground truncate">{displayName}</span>
            <span className="text-muted-foreground text-[15px] truncate">@{displayHandle}</span>
            {tweet.source === "bookmark" && <Bookmark size={13} className="text-[#1d9bf0] fill-[#1d9bf0] shrink-0 ml-0.5" />}
            {tweet.source === "retweet" && <Repeat2 size={13} className="text-[#00ba7c] shrink-0 ml-0.5" />}
            {tweet.source === "public" && <Globe size={13} className="text-[#A78BFA] shrink-0 ml-0.5" />}
            {tweet.source === "manual" && <Pencil size={13} className="text-muted-foreground shrink-0 ml-0.5" />}
          </div>

          <div className={`text-foreground leading-[20px] mt-1 whitespace-pre-wrap break-words ${isMainTweet ? "text-[16px]" : "text-[15px]"}`}>
            {formatContent(displayContent)}
          </div>

          {allMedia.length > 0 && (
            <div className={`mt-3 rounded-2xl overflow-hidden border border-border ${allMedia.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
              {allMedia.map((url: string, i: number) => (
                <MediaItemComponent key={i} url={url} tweetId={tweet.id} index={i} single={allMedia.length === 1} />
              ))}
            </div>
          )}

          {(() => {
            const cards = getLinkCards(tweet);
            return cards.length > 0 && allMedia.length === 0 ? (
              <a href={cards[0].url} target="_blank" rel="noreferrer" className="mt-3 border border-border rounded-2xl overflow-hidden hover:bg-foreground/[0.03] transition-colors block">
                {cards[0].image && <img src={proxyImageUrl(cards[0].image)} alt="" className="w-full h-[200px] object-cover border-b border-border" loading="lazy" />}
                <div className="px-3 py-2.5">
                  {cards[0].displayUrl && <div className="text-[13px] text-muted-foreground truncate">{cards[0].displayUrl}</div>}
                  {cards[0].title && <div className="text-[15px] text-foreground leading-[20px] truncate">{cards[0].title}</div>}
                  {cards[0].description && <div className="text-[13px] text-muted-foreground leading-[16px] line-clamp-2 mt-0.5">{cards[0].description}</div>}
                </div>
              </a>
            ) : null;
          })()}

          {showQuote && (
            <div className="mt-3 border border-border rounded-2xl overflow-hidden">
              <div className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-[10px]">
                    {(quoteName || quoteHandle)?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="font-bold text-[13px] text-foreground">{quoteName || quoteHandle}</span>
                  <span className="text-muted-foreground text-[13px]">@{quoteHandle}</span>
                </div>
                <div className="text-[14px] text-foreground leading-[18px] whitespace-pre-wrap break-words">
                  {formatContent(quoteContent || "")}
                </div>
                {quoteMediaUrls.length > 0 && (
                  <div className={`mt-2 rounded-xl overflow-hidden border border-border ${quoteMediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                    {quoteMediaUrls.map((url: string, i: number) => (
                      <MediaItemComponent key={i} url={url} tweetId={`quote-${tweet.id}`} index={i} single={quoteMediaUrls.length === 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {autoTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {autoTags.map((tag: string) => (
                <span key={tag} className="text-[13px] text-[#1d9bf0]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className={`mt-2 ${isMainTweet ? "text-[14px]" : "text-[13px]"} text-muted-foreground`}>
            {fullDate}
          </div>

          <div className="flex items-center justify-between mt-2 max-w-[400px] -ml-2">
            <span className="flex items-center gap-1 p-2 rounded-full text-muted-foreground">
              <MessageCircle size={16} />
            </span>
            <span className="flex items-center gap-1 p-2 rounded-full text-muted-foreground">
              <Repeat2 size={16} />
            </span>
            <span className="flex items-center gap-1 p-2 rounded-full text-muted-foreground">
              <Heart size={16} />
            </span>
            <a
              href={tweet.tweetUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full text-muted-foreground hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
