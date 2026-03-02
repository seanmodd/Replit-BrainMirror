import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Search, ExternalLink, Plus, Trash2, Bookmark, Repeat2, FileText, MessageCircle, Heart, BarChart2, Share, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type SourceTab = "all" | "bookmark" | "retweet" | "public" | "manual";

const SOURCE_TABS: { value: SourceTab; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Notes", icon: <FileText size={14} /> },
  { value: "bookmark", label: "Bookmarked", icon: <Bookmark size={14} /> },
  { value: "retweet", label: "Retweeted", icon: <Repeat2 size={14} /> },
  { value: "public", label: "Public Sync", icon: <FileText size={14} /> },
  { value: "manual", label: "Manual", icon: <Plus size={14} /> },
];

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

function formatContent(content: string): React.ReactNode[] {
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
        <a key={key++} href={token} target="_blank" rel="noreferrer" className="text-[#1d9bf0] hover:underline">{token}</a>
      );
    } else {
      parts.push(
        <span key={key++} className="text-[#1d9bf0]">{token}</span>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
}

export default function BookmarksView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SourceTab>("all");
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();

  const queryParams = useMemo(() => {
    const params: { search?: string; tag?: string; source?: string } = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedTag) params.tag = selectedTag;
    if (activeTab !== "all") params.source = activeTab;
    return params;
  }, [searchTerm, selectedTag, activeTab]);

  const { data: tweets = [], isLoading } = useQuery({
    queryKey: ["/api/tweets", queryParams],
    queryFn: () => api.tweets.list(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const { data: allTweets = [] } = useQuery({
    queryKey: ["/api/tweets", {}],
    queryFn: () => api.tweets.list(),
  });

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTweets.length, bookmark: 0, retweet: 0, public: 0, manual: 0 };
    allTweets.forEach((t: any) => {
      const src = t.source || "manual";
      if (counts[src] !== undefined) counts[src]++;
    });
    return counts;
  }, [allTweets]);

  const allTags = stats?.tags || [];

  const deleteMutation = useMutation({
    mutationFn: api.tweets.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Tweet deleted" });
    },
  });

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[600px] mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 data-testid="text-bookmarks-title" className="text-xl font-bold text-foreground">Library</h1>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  data-testid="input-search"
                  placeholder="Search..."
                  className="pl-8 h-8 text-sm bg-muted/50 border-none rounded-full"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSelectedTag(null); }}
                />
              </div>
              <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
            </div>
          </div>

          <div className="flex border-b border-border">
            {SOURCE_TABS.map(tab => (
              <button
                key={tab.value}
                data-testid={`tab-source-${tab.value}`}
                onClick={() => { setActiveTab(tab.value); setSearchTerm(""); setSelectedTag(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {tab.label}
                {sourceCounts[tab.value] > 0 && (
                  <span className="text-xs text-muted-foreground">({sourceCounts[tab.value]})</span>
                )}
                {activeTab === tab.value && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1d9bf0] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="max-w-[600px] mx-auto w-full border-b border-border">
          <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none">
            <Badge
              variant={selectedTag === null ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap px-3 py-1 text-xs rounded-full ${selectedTag === null ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setSelectedTag(null); setSearchTerm(""); }}
            >
              All
            </Badge>
            {allTags.map((tag: string) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap px-3 py-1 text-xs rounded-full ${selectedTag === tag ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setSelectedTag(tag === selectedTag ? null : tag); setSearchTerm(""); }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-[600px] mx-auto w-full">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-4 flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : tweets.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground px-4">
            <p className="mb-4 text-[15px]">
              {activeTab === "all"
                ? "No tweets yet. Import your first tweet to get started."
                : `No ${SOURCE_TABS.find(t => t.value === activeTab)?.label.toLowerCase()} tweets found.`
              }
            </p>
            {activeTab === "all" && (
              <Button variant="outline" className="rounded-full" onClick={() => setImportOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Import Tweet
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tweets.map((tweet: any) => (
              <TweetCard key={tweet.id} tweet={tweet} allTweets={tweets} onDelete={() => deleteMutation.mutate(tweet.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TweetCard({ tweet, allTweets, onDelete }: { tweet: any; allTweets: any[]; onDelete: () => void }) {
  const isRetweet = tweet.source === "retweet";
  const quotedTweet = tweet.quotedTweetId ? allTweets.find((t: any) => t.tweetId === tweet.quotedTweetId) : null;

  return (
    <article data-testid={`card-tweet-${tweet.id}`} className="px-4 py-3 hover:bg-foreground/[0.03] transition-colors cursor-pointer group">
      {isRetweet && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-1 ml-[52px]">
          <Repeat2 size={14} />
          <span className="font-bold">You reposted</span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm">
            {tweet.authorName?.[0]?.toUpperCase() || "?"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold text-[15px] text-foreground truncate">{tweet.authorName}</span>
              <span className="text-muted-foreground text-[15px] truncate">@{tweet.authorHandle}</span>
              <span className="text-muted-foreground text-[15px] shrink-0">·</span>
              <span className="text-muted-foreground text-[15px] shrink-0">{formatTimeAgo(tweet.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <button
                data-testid={`button-delete-${tweet.id}`}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
              <a
                href={tweet.tweetUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full text-muted-foreground hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
              >
                <MoreHorizontal size={15} />
              </a>
            </div>
          </div>

          <div className="text-[15px] text-foreground leading-[20px] mt-0.5 whitespace-pre-wrap break-words">
            {formatContent(tweet.content)}
          </div>

          {quotedTweet && (
            <div className="mt-3 border border-border rounded-2xl overflow-hidden hover:bg-foreground/[0.03] transition-colors">
              <div className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-[10px]">
                    {quotedTweet.authorName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="font-bold text-[13px] text-foreground">{quotedTweet.authorName}</span>
                  <span className="text-muted-foreground text-[13px]">@{quotedTweet.authorHandle}</span>
                  <span className="text-muted-foreground text-[13px]">·</span>
                  <span className="text-muted-foreground text-[13px]">{formatTimeAgo(quotedTweet.createdAt)}</span>
                </div>
                <div className="text-[14px] text-foreground leading-[18px] whitespace-pre-wrap break-words line-clamp-4">
                  {formatContent(quotedTweet.content)}
                </div>
              </div>
            </div>
          )}

          {(tweet.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(tweet.tags || []).map((tag: string) => (
                <span key={tag} className="text-[13px] text-[#1d9bf0] hover:underline cursor-pointer">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 max-w-[425px] -ml-2">
            <button className="flex items-center gap-1 group/action p-2 rounded-full text-muted-foreground hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors">
              <MessageCircle size={16} />
            </button>
            <button className="flex items-center gap-1 group/action p-2 rounded-full text-muted-foreground hover:text-[#00ba7c] hover:bg-[#00ba7c]/10 transition-colors">
              <Repeat2 size={16} />
            </button>
            <button className="flex items-center gap-1 group/action p-2 rounded-full text-muted-foreground hover:text-[#f91880] hover:bg-[#f91880]/10 transition-colors">
              <Heart size={16} />
            </button>
            <button className="flex items-center gap-1 group/action p-2 rounded-full text-muted-foreground hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors">
              <BarChart2 size={16} />
            </button>
            <div className="flex items-center">
              <button className="p-2 rounded-full text-muted-foreground hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors">
                <Bookmark size={16} className={tweet.source === "bookmark" ? "fill-[#1d9bf0] text-[#1d9bf0]" : ""} />
              </button>
              <button className="p-2 rounded-full text-muted-foreground hover:text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors">
                <Share size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [form, setForm] = useState({
    tweetUrl: "",
    authorHandle: "",
    authorName: "",
    content: "",
    tags: "",
  });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: api.tweets.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Tweet imported successfully" });
      onOpenChange(false);
      setForm({ tweetUrl: "", authorHandle: "", authorName: "", content: "", tags: "" });
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tweetId = form.tweetUrl.split("/").pop() || Date.now().toString();
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    createMutation.mutate({
      tweetId,
      conversationId: `conv-${tweetId}`,
      tweetUrl: form.tweetUrl,
      authorHandle: form.authorHandle,
      authorName: form.authorName,
      createdAt: new Date().toISOString(),
      content: form.content,
      tags: ["twitter-bookmark", ...tags],
      links: [],
      source: "manual",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-import-tweet" size="sm" className="rounded-full h-8 px-4 text-sm">
          <Plus className="mr-1.5 h-4 w-4" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Import a Tweet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tweet-url">Tweet URL</Label>
            <Input data-testid="input-tweet-url" id="tweet-url" placeholder="https://x.com/user/status/123..." value={form.tweetUrl} onChange={e => setForm(f => ({ ...f, tweetUrl: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author-handle">Author Handle</Label>
              <Input data-testid="input-author-handle" id="author-handle" placeholder="@username" value={form.authorHandle} onChange={e => setForm(f => ({ ...f, authorHandle: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author-name">Author Name</Label>
              <Input data-testid="input-author-name" id="author-name" placeholder="Display Name" value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Tweet Content</Label>
            <Textarea data-testid="input-content" id="content" placeholder="Paste the tweet text..." rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input data-testid="input-tags" id="tags" placeholder="#ai, #startups, #engineering" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <Button data-testid="button-submit-import" type="submit" className="w-full rounded-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Importing..." : "Import Tweet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
