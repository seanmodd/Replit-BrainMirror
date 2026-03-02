import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, RefreshCw, FileText, Hash, Users, ExternalLink, Loader2, Bookmark, Repeat2, Globe, Pencil, Github, Sparkles, CalendarDays, Tag } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getDisplayInfo, formatTimeAgo, formatContent, isVideoUrl, proxyImageUrl, getAutoTags, getLinkCards } from "@/lib/utils";
import TweetThreadModal from "@/components/TweetThreadModal";
import { useMemo, useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DateGroup {
  year: number;
  month: number;
  monthName: string;
  days: {
    day: number;
    dateStr: string;
    tweets: any[];
  }[];
}

function groupTweetsByDate(tweets: any[]): DateGroup[] {
  const map = new Map<string, Map<number, any[]>>();

  for (const tweet of tweets) {
    const d = new Date(tweet.createdAt);
    if (isNaN(d.getTime())) continue;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const ymKey = `${year}-${month}`;

    if (!map.has(ymKey)) map.set(ymKey, new Map());
    const dayMap = map.get(ymKey)!;
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(tweet);
  }

  const groups: DateGroup[] = [];
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  for (const key of sortedKeys) {
    const [yearStr, monthStr] = key.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const dayMap = map.get(key)!;

    const days = Array.from(dayMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([day, dayTweets]) => ({
        day,
        dateStr: `${MONTH_NAMES[month]} ${day}, ${year}`,
        tweets: dayTweets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      }));

    groups.push({ year, month, monthName: MONTH_NAMES[month], days });
  }

  return groups;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [threadTweet, setThreadTweet] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const { data: tweets, isLoading: tweetsLoading } = useQuery({
    queryKey: ["/api/tweets"],
    queryFn: () => api.tweets.list(),
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: api.settings.get,
  });

  const { data: ghStatus } = useQuery({
    queryKey: ["/api/github/status"],
    queryFn: api.github.status,
  });

  const invalidateAfterSync = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sync-logs"] });
  };

  const publicSyncMutation = useMutation({
    mutationFn: () => api.sync.public(["tweets"]),
    onSuccess: (data) => {
      invalidateAfterSync();
      toast({
        title: "Public sync complete",
        description: `${data.imported} new, ${data.skipped} already imported (${data.total} total)`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Public sync failed", description: err.message, variant: "destructive" });
    },
  });

  const bookmarkSyncMutation = useMutation({
    mutationFn: api.sync.bookmarks,
    onSuccess: (data) => {
      invalidateAfterSync();
      toast({
        title: "Bookmark sync complete",
        description: `${data.imported} new, ${data.skipped} already imported (${data.total} total bookmarks)`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Bookmark sync failed", description: err.message, variant: "destructive" });
    },
  });

  const githubPushMutation = useMutation({
    mutationFn: api.github.push,
    onSuccess: (data) => {
      const total = data.created.length + data.updated.length;
      const parts = [];
      if (data.created.length) parts.push(`${data.created.length} created`);
      if (data.updated.length) parts.push(`${data.updated.length} updated`);
      if (data.unchanged.length) parts.push(`${data.unchanged.length} unchanged`);
      if (data.errors.length) parts.push(`${data.errors.length} failed`);
      toast({
        title: `Synced ${total} notes to GitHub`,
        description: parts.join(", "),
        variant: data.errors.length ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "GitHub sync failed", description: err.message, variant: "destructive" });
    },
  });

  const handleGitHubSync = () => {
    const repo = settingsData?.githubRepo || "seanmodd/brainmirror";
    const [owner, repoName] = repo.split("/");
    if (!owner || !repoName) {
      toast({ title: "Invalid repo", description: "Configure your GitHub repo in Settings first.", variant: "destructive" });
      return;
    }
    githubPushMutation.mutate({ owner, repo: repoName, folder: settingsData?.githubFolder || undefined });
  };

  const enrichProfilesMutation = useMutation({
    mutationFn: api.tweets.enrichProfiles,
    onSuccess: (data) => {
      invalidateAfterSync();
      toast({
        title: "Profile images updated",
        description: `${data.updated} tweets enriched (${data.looked_up} authors checked)`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Profile enrichment failed", description: err.message, variant: "destructive" });
    },
  });

  const enrichContentMutation = useMutation({
    mutationFn: api.tweets.enrichContent,
    onSuccess: (data) => {
      invalidateAfterSync();
      toast({
        title: "Content enriched",
        description: `${data.updated} tweets updated with full content, media & link previews`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Content enrichment failed", description: err.message, variant: "destructive" });
    },
  });

  const isSyncing = publicSyncMutation.isPending || bookmarkSyncMutation.isPending || githubPushMutation.isPending || enrichProfilesMutation.isPending || enrichContentMutation.isPending;

  const dateGroups = useMemo(() => {
    if (!tweets) return [];
    return groupTweetsByDate(tweets);
  }, [tweets]);

  const years = useMemo(() => {
    const s = new Set<number>();
    dateGroups.forEach(g => s.add(g.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [dateGroups]);

  const filteredGroups = useMemo(() => {
    return dateGroups.filter(g => {
      if (selectedYear !== null && g.year !== selectedYear) return false;
      if (selectedMonth !== null && g.month !== selectedMonth) return false;
      return true;
    });
  }, [dateGroups, selectedYear, selectedMonth]);

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.days.reduce((s, d) => s + d.tweets.length, 0), 0);

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-dashboard-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Overview</h1>
          <p className="text-muted-foreground">Your Obsidian Twitter vault at a glance.</p>
        </div>
        <div className="relative">
          <div className="flex gap-2 flex-wrap">
            <Button
              data-testid="button-sync-public"
              variant="outline"
              className="w-fit"
              onClick={() => publicSyncMutation.mutate()}
              disabled={isSyncing}
            >
              {publicSyncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {publicSyncMutation.isPending ? "Syncing..." : "Sync Public"}
            </Button>
            <Button
              data-testid="button-sync-bookmarks"
              className="w-fit"
              onClick={() => bookmarkSyncMutation.mutate()}
              disabled={isSyncing}
            >
              {bookmarkSyncMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bookmark className="mr-2 h-4 w-4" />
              )}
              {bookmarkSyncMutation.isPending ? "Syncing..." : "Sync Bookmarks"}
            </Button>
            <Button
              data-testid="button-enrich-content"
              variant="outline"
              className="w-fit border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              onClick={() => enrichContentMutation.mutate()}
              disabled={isSyncing}
            >
              {enrichContentMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {enrichContentMutation.isPending ? "Enriching..." : "Enrich Content"}
            </Button>
            {ghStatus?.connected && (
              <Button
                data-testid="button-sync-github"
                variant="outline"
                className="w-fit border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={handleGitHubSync}
                disabled={isSyncing}
              >
                {githubPushMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Github className="mr-2 h-4 w-4" />
                )}
                {githubPushMutation.isPending ? "Pushing..." : "Sync to GitHub"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/tweets">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-sm font-medium">Total Tweets</span>
              <Twitter className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-4 pt-0">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-tweets" className="text-2xl font-bold">{stats?.totalTweets ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Imported bookmarks</p>
                </>
              )}
            </div>
          </Card>
        </Link>
        
        <Link href="/authors">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-sm font-medium">Author Hubs</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-4 pt-0">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-authors" className="text-2xl font-bold">{stats?.totalAuthors ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Generated index notes</p>
                </>
              )}
            </div>
          </Card>
        </Link>

        <Link href="/files">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-sm font-medium">Markdown Files</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-4 pt-0">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-files" className="text-2xl font-bold">{stats?.totalFiles ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Clean local files</p>
                </>
              )}
            </div>
          </Card>
        </Link>

        <Link href="/tags">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <div className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <span className="text-sm font-medium">Tags Created</span>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-4 pt-0">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-tags" className="text-2xl font-bold">{stats?.totalTags ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Unique connections</p>
                </>
              )}
            </div>
          </Card>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          data-testid="button-filter-all-years"
          variant={selectedYear === null ? "default" : "outline"}
          size="sm"
          onClick={() => { setSelectedYear(null); setSelectedMonth(null); }}
        >
          All Years
        </Button>
        {years.map(year => (
          <Button
            key={year}
            data-testid={`button-filter-year-${year}`}
            variant={selectedYear === year ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedYear(year); setSelectedMonth(null); }}
          >
            {year}
          </Button>
        ))}
      </div>

      {selectedYear !== null && (
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="button-filter-all-months"
            variant={selectedMonth === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMonth(null)}
          >
            All Months
          </Button>
          {MONTH_NAMES.map((name, idx) => {
            const hasData = dateGroups.some(g => g.year === selectedYear && g.month === idx);
            if (!hasData) return null;
            return (
              <Button
                key={idx}
                data-testid={`button-filter-month-${idx}`}
                variant={selectedMonth === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(idx)}
              >
                {name}
              </Button>
            );
          })}
        </div>
      )}

      {tweetsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>No tweets found for this period.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredGroups.map(group => (
            <div key={`${group.year}-${group.month}`}>
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays size={16} className="text-primary" />
                <h2 data-testid={`text-month-header-${group.year}-${group.month}`} className="text-lg font-semibold text-foreground">
                  {group.monthName} {group.year}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({group.days.reduce((s, d) => s + d.tweets.length, 0)} tweets)
                </span>
              </div>

              <div className="space-y-4 ml-2 border-l-2 border-border pl-6">
                {group.days.map(({ day, dateStr, tweets: dayTweets }) => (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-2 -ml-[29px]">
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shrink-0" />
                      <span data-testid={`text-day-${group.year}-${group.month}-${day}`} className="text-sm font-medium text-foreground">{dateStr}</span>
                      <span className="text-xs text-muted-foreground">({dayTweets.length})</span>
                    </div>
                    <Card className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="divide-y divide-border">
                          {dayTweets.map((tweet: any) => {
                            const info = getDisplayInfo(tweet);
                            const autoTags = getAutoTags(tweet);
                            const mediaUrls = (tweet.mediaUrls || []).filter((u: string) => u && u !== "");
                            const videoLinks = (tweet.links || []).filter((u: string) => u && u !== "" && isVideoUrl(u) && !u.includes("x.com/") && !u.includes("twitter.com/"));
                            const allMedia = [...mediaUrls, ...videoLinks.filter((v: string) => !mediaUrls.includes(v))];
                            const profileSrc = tweet.authorProfileImageUrl ? proxyImageUrl(tweet.authorProfileImageUrl) : null;
                            return (
                              <article key={tweet.id} data-testid={`timeline-tweet-${tweet.id}`} className="px-4 py-3 hover:bg-foreground/[0.03] transition-colors cursor-pointer" onClick={() => setThreadTweet(tweet)}>
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
                                    {allMedia.length > 0 && (
                                      <div className={`mt-2 rounded-xl overflow-hidden border border-border ${allMedia.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                                        {allMedia.map((url: string, i: number) => (
                                          isVideoUrl(url) ? (
                                            <div key={i} className={`relative bg-black ${allMedia.length === 1 ? "max-h-[280px]" : "h-[140px]"}`}>
                                              <video
                                                data-testid={`timeline-video-${tweet.id}-${i}`}
                                                src={proxyImageUrl(url)}
                                                controls
                                                playsInline
                                                preload="metadata"
                                                className={`w-full object-cover ${allMedia.length === 1 ? "max-h-[280px]" : "h-[140px]"}`}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            </div>
                                          ) : (
                                            <img
                                              key={i}
                                              data-testid={`timeline-img-${tweet.id}-${i}`}
                                              src={proxyImageUrl(url)}
                                              alt=""
                                              className={`w-full object-cover ${allMedia.length === 1 ? "max-h-[280px]" : "h-[140px]"}`}
                                              loading="lazy"
                                            />
                                          )
                                        ))}
                                      </div>
                                    )}
                                    {(() => {
                                      const cards = getLinkCards(tweet);
                                      return cards.length > 0 && allMedia.length === 0 ? (
                                        <a href={cards[0].url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 border border-border rounded-xl overflow-hidden hover:bg-foreground/[0.03] transition-colors block">
                                          {cards[0].image && <img src={proxyImageUrl(cards[0].image)} alt="" className="w-full h-[140px] object-cover border-b border-border" loading="lazy" />}
                                          <div className="px-3 py-2">
                                            {cards[0].displayUrl && <div className="text-[12px] text-muted-foreground truncate">{cards[0].displayUrl}</div>}
                                            {cards[0].title && <div className="text-[13px] text-foreground leading-[16px] truncate">{cards[0].title}</div>}
                                            {cards[0].description && <div className="text-[12px] text-muted-foreground leading-[14px] line-clamp-2 mt-0.5">{cards[0].description}</div>}
                                          </div>
                                        </a>
                                      ) : null;
                                    })()}
                                    {autoTags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {autoTags.map((tag, i) => (
                                          <span key={i} data-testid={`tag-${tag}`} className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            <Tag size={8} />
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-2">
                                      <a href={tweet.tweetUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1d9bf0] p-1" onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink size={14} />
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TweetThreadModal
        tweet={threadTweet}
        allTweets={tweets || []}
        open={!!threadTweet}
        onOpenChange={(open: boolean) => { if (!open) setThreadTweet(null); }}
      />
    </div>
  );
}
