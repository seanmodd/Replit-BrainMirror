import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, RefreshCw, FileText, Hash, Users, ExternalLink, Loader2, Bookmark, Repeat2, MessageCircle, Heart, MoreHorizontal } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

function formatTimeAgo(dateStr: string): string {
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

  const isSyncing = publicSyncMutation.isPending || bookmarkSyncMutation.isPending;

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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
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
        
        <Card>
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

        <Card>
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

        <Card>
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
                {recentTweets.map((tweet: any) => (
                  <article key={tweet.id} data-testid={`card-recent-tweet-${tweet.id}`} className="px-4 py-3 hover:bg-foreground/[0.03] transition-colors">
                    {tweet.source === "retweet" && (
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-1 ml-[44px]">
                        <Repeat2 size={12} />
                        <span className="font-bold">You reposted</span>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xs shrink-0">
                        {tweet.authorName?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[14px] text-foreground truncate">{tweet.authorName}</span>
                          <span className="text-muted-foreground text-[13px] truncate">@{tweet.authorHandle}</span>
                          <span className="text-muted-foreground text-[13px]">·</span>
                          <span className="text-muted-foreground text-[13px] shrink-0">{formatTimeAgo(tweet.createdAt)}</span>
                          {tweet.source === "bookmark" && (
                            <Bookmark size={12} className="text-[#1d9bf0] fill-[#1d9bf0] shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="text-[14px] text-foreground/90 leading-[18px] mt-0.5 line-clamp-3 whitespace-pre-wrap">{tweet.content}</p>
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
                ))}
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
