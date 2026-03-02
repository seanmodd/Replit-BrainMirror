import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Twitter, ExternalLink, Bookmark, Repeat2, Globe, Pencil, MessageCircle, Heart, Search, ArrowLeft, Trash2 } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getDisplayInfo, formatTimeAgo, formatContent, isVideoUrl, proxyImageUrl, getAutoTags } from "@/lib/utils";
import { useState, useMemo } from "react";
import TweetThreadModal from "@/components/TweetThreadModal";

export default function TweetsPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const tagFilter = queryParams.get("tag") || "";
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [threadTweet, setThreadTweet] = useState<any>(null);

  const { data: tweets, isLoading } = useQuery({
    queryKey: ["/api/tweets", search, sourceFilter, tagFilter],
    queryFn: () => api.tweets.list({ search: search || undefined, source: sourceFilter || undefined, tag: tagFilter || undefined }),
  });

  const { data: allTweets = [] } = useQuery({
    queryKey: ["/api/tweets", {}],
    queryFn: () => api.tweets.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.tweets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Tweet deleted" });
    },
  });

  const sources = [
    { value: "", label: "All Sources" },
    { value: "bookmark", label: "Bookmarks" },
    { value: "retweet", label: "Retweets" },
    { value: "public", label: "Public" },
    { value: "manual", label: "Manual" },
  ];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-tweets">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 data-testid="text-tweets-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">{tagFilter ? `Tweets tagged ${tagFilter}` : "All Tweets"}</h1>
          <p className="text-muted-foreground">{tweets?.length ?? 0} tweets {tagFilter ? `with tag ${tagFilter}` : "imported into your vault"}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search-tweets"
            placeholder="Search tweets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {sources.map((s) => (
            <Button
              key={s.value}
              data-testid={`button-filter-${s.value || "all"}`}
              variant={sourceFilter === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (tweets?.length ?? 0) === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Twitter className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No tweets found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tweets!.map((tweet: any) => {
                const info = getDisplayInfo(tweet);
                const mediaUrls = (tweet.mediaUrls || []).filter((u: string) => u && u !== "");
                const autoTags = getAutoTags(tweet);
                const profileSrc = tweet.authorProfileImageUrl ? proxyImageUrl(tweet.authorProfileImageUrl) : null;
                return (
                  <article key={tweet.id} data-testid={`card-tweet-${tweet.id}`} className="px-4 py-3 hover:bg-foreground/[0.03] transition-colors cursor-pointer" onDoubleClick={() => setThreadTweet(tweet)}>
                    {info.isRetweet && (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-1 ml-[44px]">
                        <Repeat2 size={12} />
                        <span className="font-bold">{info.retweetedBy ? `${info.retweetedBy} reposted` : "Reposted"}</span>
                      </div>
                    )}
                    <div className="flex gap-3">
                      {profileSrc ? (
                        <img
                          data-testid={`avatar-img-${tweet.id}`}
                          src={profileSrc}
                          alt={info.displayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs shrink-0 ${profileSrc ? 'hidden' : ''}`}>
                        {info.displayName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[14px] text-foreground truncate">{info.displayName}</span>
                          <span className="text-muted-foreground text-[13px] truncate">@{info.displayHandle}</span>
                          <span className="text-muted-foreground text-[13px]">·</span>
                          <span className="text-muted-foreground text-[13px] shrink-0">{formatTimeAgo(tweet.createdAt)}</span>
                          {tweet.source === "bookmark" && <Bookmark size={12} className="text-[#1d9bf0] fill-[#1d9bf0] shrink-0 ml-0.5" />}
                          {tweet.source === "retweet" && <Repeat2 size={12} className="text-[#00ba7c] shrink-0 ml-0.5" />}
                          {tweet.source === "public" && <Globe size={12} className="text-[#A78BFA] shrink-0 ml-0.5" />}
                          {tweet.source === "manual" && <Pencil size={12} className="text-muted-foreground shrink-0 ml-0.5" />}
                        </div>
                        <div className="text-[14px] text-foreground/90 leading-[18px] mt-0.5 whitespace-pre-wrap">{formatContent(info.displayContent)}</div>
                        {mediaUrls.length > 0 && (
                          <div className={`mt-2 rounded-xl overflow-hidden border border-border ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                            {mediaUrls.slice(0, 4).map((url: string, i: number) =>
                              isVideoUrl(url) ? (
                                <div key={i} className="relative bg-black h-[140px]">
                                  <video
                                    data-testid={`video-media-${tweet.id}-${i}`}
                                    src={proxyImageUrl(url)}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full object-contain h-[140px]"
                                  />
                                </div>
                              ) : (
                                <img key={i} src={proxyImageUrl(url)} alt="" className="w-full object-cover h-[140px]" loading="lazy" />
                              )
                            )}
                          </div>
                        )}
                        {autoTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {autoTags.map((tag: string) => (
                              <span key={tag} className="text-[12px] text-[#1d9bf0]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 -ml-2">
                          <span className="flex items-center gap-1 text-muted-foreground p-1">
                            <MessageCircle size={14} />
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground p-1">
                            <Repeat2 size={14} />
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground p-1">
                            <Heart size={14} />
                          </span>
                          <a href={tweet.tweetUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1d9bf0] p-1">
                            <ExternalLink size={14} />
                          </a>
                          <button
                            data-testid={`button-delete-tweet-${tweet.id}`}
                            onClick={() => deleteMutation.mutate(tweet.id)}
                            className="text-muted-foreground hover:text-red-500 p-1 ml-auto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TweetThreadModal
        tweet={threadTweet}
        allTweets={allTweets}
        open={!!threadTweet}
        onOpenChange={(open) => { if (!open) setThreadTweet(null); }}
      />
    </div>
  );
}
