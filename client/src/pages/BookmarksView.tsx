import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Search, ExternalLink, Calendar, Reply, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function BookmarksView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();

  const queryParams = useMemo(() => {
    if (searchTerm) return { search: searchTerm };
    if (selectedTag) return { tag: selectedTag };
    return {};
  }, [searchTerm, selectedTag]);

  const { data: tweets = [], isLoading } = useQuery({
    queryKey: ["/api/tweets", queryParams],
    queryFn: () => api.tweets.list(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

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
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 data-testid="text-bookmarks-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Bookmarks</h1>
          <p className="text-muted-foreground">All synced tweets, ready for Obsidian.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              data-testid="input-search"
              placeholder="Search content or author..." 
              className="pl-9 bg-card border-border focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedTag(null); }}
            />
          </div>
          <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
        <Badge 
          variant={selectedTag === null ? "default" : "outline"} 
          className={`cursor-pointer whitespace-nowrap px-4 py-2 text-xs ${selectedTag === null ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'}`}
          onClick={() => { setSelectedTag(null); setSearchTerm(""); }}
        >
          All Topics
        </Badge>
        {allTags.map((tag: string) => (
          <Badge 
            key={tag}
            variant={selectedTag === tag ? "default" : "outline"} 
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-xs ${selectedTag === tag ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'}`}
            onClick={() => { setSelectedTag(tag === selectedTag ? null : tag); setSearchTerm(""); }}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
          {tweets.map((tweet: any) => (
            <TweetCard key={tweet.id} tweet={tweet} onDelete={() => deleteMutation.mutate(tweet.id)} />
          ))}
          {tweets.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              <p className="mb-4">No bookmarks found. Import your first tweet to get started.</p>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Import Tweet
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TweetCard({ tweet, onDelete }: { tweet: any; onDelete: () => void }) {
  return (
    <div data-testid={`card-tweet-${tweet.id}`} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
            {tweet.authorName?.[0] || "?"}
          </div>
          <div>
            <div className="text-sm font-semibold">{tweet.authorName}</div>
            <div className="text-xs text-muted-foreground">{tweet.authorHandle}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <a href={tweet.tweetUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-colors bg-muted p-1.5 rounded-md">
            <ExternalLink size={14} />
          </a>
          <button data-testid={`button-delete-${tweet.id}`} onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors bg-muted p-1.5 rounded-md opacity-0 group-hover:opacity-100">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {tweet.threadPosition && (
        <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2 flex items-center gap-1.5">
          <Reply size={10} className="rotate-180" />
          Thread {tweet.threadPosition}
        </div>
      )}
      
      <p className="text-sm text-foreground/90 mb-4 flex-1 whitespace-pre-wrap">
        {tweet.content}
      </p>
      
      <div className="mt-auto">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(tweet.tags || []).map((tag: string) => (
            <span key={tag} className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-border/50">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
          <div className="font-mono truncate max-w-[150px]">
            Twitter - {tweet.authorHandle}
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={10} />
            <span>{new Date(tweet.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-import-tweet">
          <Plus className="mr-2 h-4 w-4" /> Import Tweet
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
          <Button data-testid="button-submit-import" type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Importing..." : "Import Tweet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
