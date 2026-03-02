import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Search, ExternalLink, Plus, Trash2, Bookmark, Repeat2, FileText, MessageCircle, Heart, BarChart2, Share, MoreHorizontal, ArrowUpDown, Filter, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getDisplayInfo, formatTimeAgo, formatContent } from "@/lib/utils";

type SourceTab = "all" | "bookmark" | "retweet" | "public" | "manual";
type SortOption = "newest" | "oldest" | "author-az" | "author-za";

const SOURCE_TABS: { value: SourceTab; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Notes", icon: <FileText size={14} /> },
  { value: "bookmark", label: "Bookmarked", icon: <Bookmark size={14} /> },
  { value: "retweet", label: "Retweeted", icon: <Repeat2 size={14} /> },
  { value: "public", label: "Public Sync", icon: <FileText size={14} /> },
  { value: "manual", label: "Manual", icon: <Plus size={14} /> },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "author-az", label: "Author A-Z" },
  { value: "author-za", label: "Author Z-A" },
];

export default function BookmarksView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SourceTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterAuthor, setFilterAuthor] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();

  const queryParams = useMemo(() => {
    const params: { search?: string; tag?: string; source?: string } = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedTag) params.tag = selectedTag;
    if (activeTab !== "all") params.source = activeTab;
    return params;
  }, [searchTerm, selectedTag, activeTab]);

  const { data: rawTweets = [], isLoading } = useQuery({
    queryKey: ["/api/tweets", queryParams],
    queryFn: () => api.tweets.list(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const { data: allTweetsRaw = [] } = useQuery({
    queryKey: ["/api/tweets", {}],
    queryFn: () => api.tweets.list(),
  });

  const uniqueAuthors = useMemo(() => {
    const map = new Map<string, string>();
    allTweetsRaw.forEach((t: any) => {
      const info = getDisplayInfo(t);
      if (!map.has(info.displayHandle)) {
        map.set(info.displayHandle, info.displayName);
      }
    });
    return Array.from(map.entries())
      .map(([handle, name]) => ({ handle, name }))
      .sort((a, b) => a.handle.localeCompare(b.handle));
  }, [allTweetsRaw]);

  const tweets = useMemo(() => {
    let list = [...rawTweets];

    if (filterAuthor) {
      list = list.filter((t: any) => {
        const info = getDisplayInfo(t);
        return info.displayHandle === filterAuthor;
      });
    }

    list.sort((a: any, b: any) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "author-az": {
          const aInfo = getDisplayInfo(a);
          const bInfo = getDisplayInfo(b);
          return aInfo.displayHandle.localeCompare(bInfo.displayHandle);
        }
        case "author-za": {
          const aInfo = getDisplayInfo(a);
          const bInfo = getDisplayInfo(b);
          return bInfo.displayHandle.localeCompare(aInfo.displayHandle);
        }
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [rawTweets, sortBy, filterAuthor]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTweetsRaw.length, bookmark: 0, retweet: 0, public: 0, manual: 0 };
    allTweetsRaw.forEach((t: any) => {
      const src = t.source || "manual";
      if (counts[src] !== undefined) counts[src]++;
    });
    return counts;
  }, [allTweetsRaw]);

  const allTags = stats?.tags || [];
  const hasActiveFilters = filterAuthor || sortBy !== "newest";

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

      <div className="max-w-[600px] mx-auto w-full border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1 mr-2">
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

          <div className="flex items-center gap-1 shrink-0">
            <div className="relative">
              <button
                data-testid="button-sort"
                onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy !== "newest" ? "bg-[#1d9bf0]/10 text-[#1d9bf0]" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <ArrowUpDown size={13} />
                Sort
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 z-30 min-w-[160px]">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      data-testid={`sort-${opt.value}`}
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sortBy === opt.value ? "text-[#1d9bf0] bg-[#1d9bf0]/5" : "text-foreground hover:bg-foreground/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                data-testid="button-filter-author"
                onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterAuthor ? "bg-[#1d9bf0]/10 text-[#1d9bf0]" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <Filter size={13} />
                Author
                {filterAuthor && <ChevronDown size={11} />}
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 z-30 min-w-[200px] max-h-[300px] overflow-y-auto">
                  <button
                    onClick={() => { setFilterAuthor(null); setShowFilterMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      !filterAuthor ? "text-[#1d9bf0] bg-[#1d9bf0]/5" : "text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    All authors
                  </button>
                  {uniqueAuthors.map(a => (
                    <button
                      key={a.handle}
                      data-testid={`filter-author-${a.handle}`}
                      onClick={() => { setFilterAuthor(a.handle); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                        filterAuthor === a.handle ? "text-[#1d9bf0] bg-[#1d9bf0]/5" : "text-foreground hover:bg-foreground/5"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                        {a.name[0]?.toUpperCase()}
                      </div>
                      <span className="truncate">@{a.handle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 px-4 pb-2">
            {sortBy !== "newest" && (
              <span className="text-xs bg-[#1d9bf0]/10 text-[#1d9bf0] px-2.5 py-1 rounded-full flex items-center gap-1">
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                <button onClick={() => setSortBy("newest")} className="hover:text-[#1d9bf0]/70">
                  <X size={11} />
                </button>
              </span>
            )}
            {filterAuthor && (
              <span className="text-xs bg-[#1d9bf0]/10 text-[#1d9bf0] px-2.5 py-1 rounded-full flex items-center gap-1">
                @{filterAuthor}
                <button onClick={() => setFilterAuthor(null)} className="hover:text-[#1d9bf0]/70">
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              onClick={() => { setSortBy("newest"); setFilterAuthor(null); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

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

      {(showSortMenu || showFilterMenu) && (
        <div className="fixed inset-0 z-20" onClick={() => { setShowSortMenu(false); setShowFilterMenu(false); }} />
      )}
    </div>
  );
}

function TweetCard({ tweet, allTweets, onDelete }: { tweet: any; allTweets: any[]; onDelete: () => void }) {
  const { displayName, displayHandle, displayContent, isRetweet } = getDisplayInfo(tweet);
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
            {displayName?.[0]?.toUpperCase() || "?"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold text-[15px] text-foreground truncate">{displayName}</span>
              <span className="text-muted-foreground text-[15px] truncate">@{displayHandle}</span>
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
            {formatContent(displayContent)}
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
