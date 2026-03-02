import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, RefreshCw, FileText, Hash, Users, ExternalLink, Loader2, Bookmark, Repeat2, MessageCircle, Heart, MoreHorizontal, Globe, Pencil, Github, Upload } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getDisplayInfo, formatTimeAgo, formatContent } from "@/lib/utils";

export default function Dashboard() {
  const { toast } = useToast();

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

  const isSyncing = publicSyncMutation.isPending || bookmarkSyncMutation.isPending || githubPushMutation.isPending;

  const recentTweets = tweets?.slice(0, 5) || [];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-dashboard-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Overview</h1>
          <p className="text-muted-foreground">Your Obsidian Twitter vault at a glance.</p>
        </div>
        <div className="relative">
          <div className="flex gap-2">
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tweets</CardTitle>
              <Twitter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-tweets" className="text-2xl font-bold">{stats?.totalTweets ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Imported bookmarks</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/authors">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Author Hubs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-authors" className="text-2xl font-bold">{stats?.totalAuthors ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Generated index notes</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/files">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Markdown Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-files" className="text-2xl font-bold">{stats?.totalFiles ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Clean local files</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/tags">
          <Card className="cursor-pointer hover:bg-foreground/[0.03] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tags Created</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div data-testid="text-total-tags" className="text-2xl font-bold">{stats?.totalTags ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Unique connections</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Feed</CardTitle>
            <CardDescription>Latest tweets pulled into your vault</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tweetsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : recentTweets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground px-6">
                <p className="mb-2">No tweets imported yet.</p>
                <Link href="/bookmarks">
                  <Button variant="outline" size="sm" className="rounded-full">Import Your First Tweet</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTweets.map((tweet: any) => {
                  const info = getDisplayInfo(tweet);
                  const hasStoredQuote = tweet.quotedTweetContent && tweet.quotedTweetAuthorHandle;
                  const fallbackQuote = !hasStoredQuote && tweet.quotedTweetId ? (tweets || []).find((t: any) => t.tweetId === tweet.quotedTweetId) : null;
                  const showQuote = hasStoredQuote || fallbackQuote;
                  const quoteName = hasStoredQuote ? tweet.quotedTweetAuthorName : fallbackQuote?.authorName;
                  const quoteHandle = hasStoredQuote ? tweet.quotedTweetAuthorHandle : fallbackQuote?.authorHandle;
                  const quoteContent = hasStoredQuote ? tweet.quotedTweetContent : fallbackQuote?.content;
                  const mediaUrls = (tweet.mediaUrls || []).filter((u: string) => u && u !== "");
                  return (
                    <article key={tweet.id} data-testid={`card-recent-tweet-${tweet.id}`} className="px-4 py-3 hover:bg-foreground/[0.03] transition-colors">
                      {info.isRetweet && (
                        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-1 ml-[44px]">
                          <Repeat2 size={12} />
                          <span className="font-bold">{info.retweetedBy ? `${info.retweetedBy} reposted` : "You reposted"}</span>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs shrink-0">
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
                          <div className="text-[14px] text-foreground/90 leading-[18px] mt-0.5 line-clamp-3 whitespace-pre-wrap">{formatContent(info.displayContent)}</div>
                          {mediaUrls.length > 0 && (
                            <div className={`mt-2 rounded-xl overflow-hidden border border-border ${mediaUrls.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}`}>
                              {mediaUrls.slice(0, 2).map((url: string, i: number) => (
                                <img key={i} src={url} alt="" className="w-full object-cover h-[120px]" loading="lazy" />
                              ))}
                            </div>
                          )}
                          {showQuote && (
                            <div className="mt-2 border border-border rounded-xl overflow-hidden">
                              <div className="p-2.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-[8px]">
                                    {(quoteName || quoteHandle)?.[0]?.toUpperCase() || "?"}
                                  </div>
                                  <span className="font-bold text-[12px] text-foreground">{quoteName || quoteHandle}</span>
                                  <span className="text-muted-foreground text-[12px]">@{quoteHandle}</span>
                                </div>
                                <div className="text-[13px] text-foreground leading-[16px] whitespace-pre-wrap break-words line-clamp-3">
                                  {formatContent(quoteContent || "")}
                                </div>
                              </div>
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
                            <a href={tweet.tweetUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1d9bf0] p-1 ml-auto">
                              <ExternalLink size={14} />
                            </a>
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

        <Card>
          <CardHeader>
            <CardTitle>Vault Status</CardTitle>
            <CardDescription>System health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Database</span>
                <span className="text-green-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Connected
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Notes</span>
                <span className="text-foreground">{stats?.totalTweets ?? 0}</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Top Authors</span>
              </div>
              {(stats?.authors || []).slice(0, 3).map((a: any) => (
                <div key={a.handle} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">{a.handle}</span>
                  <span className="text-foreground">{a.count} notes</span>
                </div>
              ))}
            </div>

            <Link href="/settings">
              <Button data-testid="link-settings" variant="outline" className="w-full">Configure Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
