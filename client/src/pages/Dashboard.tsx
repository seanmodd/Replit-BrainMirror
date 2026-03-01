import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Twitter, RefreshCw, FileText, Hash, Users, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const { data: tweets, isLoading: tweetsLoading } = useQuery({
    queryKey: ["/api/tweets"],
    queryFn: () => api.tweets.list(),
  });

  const recentTweets = tweets?.slice(0, 3) || [];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-dashboard-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Overview</h1>
          <p className="text-muted-foreground">Your Obsidian Twitter vault at a glance.</p>
        </div>
        <Button data-testid="button-sync-now" className="w-fit">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Now
        </Button>
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recently Processed Bookmarks</CardTitle>
            <CardDescription>Latest threads pulled into your vault</CardDescription>
          </CardHeader>
          <CardContent>
            {tweetsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : recentTweets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p className="mb-2">No bookmarks imported yet.</p>
                <Link href="/bookmarks">
                  <Button variant="outline" size="sm">Import Your First Tweet</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTweets.map((tweet: any) => (
                  <div key={tweet.id} data-testid={`card-recent-tweet-${tweet.id}`} className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tweet.authorName}</span>
                        <span className="text-xs text-muted-foreground">{tweet.authorHandle}</span>
                        <span className="text-xs text-muted-foreground">· {new Date(tweet.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-foreground/80 line-clamp-2">{tweet.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {(tweet.tags || []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <a href={tweet.tweetUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors p-2">
                      <ExternalLink size={14} />
                    </a>
                  </div>
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
