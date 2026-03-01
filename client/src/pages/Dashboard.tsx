import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockTweets, mockAuthorHubs } from "@/lib/mock-data";
import { Twitter, RefreshCw, FileText, Hash, Users, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">Overview</h1>
          <p className="text-muted-foreground">Your Obsidian Twitter vault at a glance.</p>
        </div>
        <Button className="w-fit" onClick={() => console.log('Manual sync')}>
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
            <div className="text-2xl font-bold">{mockTweets.length}</div>
            <p className="text-xs text-muted-foreground">+3 processed today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Author Hubs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAuthorHubs.length}</div>
            <p className="text-xs text-muted-foreground">Generated index notes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Markdown Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTweets.length + mockAuthorHubs.length}</div>
            <p className="text-xs text-muted-foreground">Clean local files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tags Created</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Unique connections</p>
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
            <div className="space-y-4">
              {mockTweets.slice(0, 3).map(tweet => (
                <div key={tweet.id} className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tweet.author_name}</span>
                      <span className="text-xs text-muted-foreground">{tweet.author_handle}</span>
                      <span className="text-xs text-muted-foreground">· {new Date(tweet.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2">{tweet.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {tweet.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
                          {tag}
                        </span>
                      ))}
                      {tweet.tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{tweet.tags.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <a href={tweet.tweet_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors p-2">
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
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
                <span className="text-muted-foreground">X Connection</span>
                <span className="text-green-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate Limit Status</span>
                <span className="text-foreground">42/180 calls</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vault Path</span>
                <span className="text-foreground font-mono text-xs truncate max-w-[120px]" title="~/Documents/Obsidian/SecondBrain">
                  .../SecondBrain
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Auto-Sync</span>
                <span className="text-foreground">Every 10m</span>
              </div>
            </div>

            <Link href="/settings">
              <Button variant="outline" className="w-full">Configure Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}