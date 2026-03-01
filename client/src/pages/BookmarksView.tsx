import { useState, useMemo } from "react";
import { mockTweets, TweetNote } from "@/lib/mock-data";
import { Search, Filter, ExternalLink, Calendar, Hash, Reply } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BookmarksView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    mockTweets.forEach(tweet => tweet.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).filter(t => t.startsWith('#')); // Only show actual hashtags for filtering
  }, []);

  const filteredTweets = useMemo(() => {
    return mockTweets.filter(tweet => {
      const matchesSearch = searchTerm === "" || 
        tweet.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tweet.author_handle.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesTag = selectedTag === null || tweet.tags.includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [searchTerm, selectedTag]);

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">Bookmarks</h1>
          <p className="text-muted-foreground">All synced tweets, ready for Obsidian.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search content or author..." 
              className="pl-9 bg-card border-border focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
        <Badge 
          variant={selectedTag === null ? "default" : "outline"} 
          className={`cursor-pointer whitespace-nowrap px-4 py-2 text-xs ${selectedTag === null ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'}`}
          onClick={() => setSelectedTag(null)}
        >
          All Topics
        </Badge>
        {allTags.map(tag => (
          <Badge 
            key={tag}
            variant={selectedTag === tag ? "default" : "outline"} 
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-xs ${selectedTag === tag ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'}`}
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
        {filteredTweets.map(tweet => (
          <TweetCard key={tweet.id} tweet={tweet} />
        ))}
        {filteredTweets.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No bookmarks found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}

function TweetCard({ tweet }: { tweet: TweetNote }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
            {tweet.author_name[0]}
          </div>
          <div>
            <div className="text-sm font-semibold">{tweet.author_name}</div>
            <div className="text-xs text-muted-foreground">{tweet.author_handle}</div>
          </div>
        </div>
        <a href={tweet.tweet_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-colors bg-muted p-1.5 rounded-md">
          <ExternalLink size={14} />
        </a>
      </div>
      
      {tweet.thread_position && (
        <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2 flex items-center gap-1.5">
          <Reply size={10} className="rotate-180" />
          Thread {tweet.thread_position}
        </div>
      )}
      
      <p className="text-sm text-foreground/90 mb-4 flex-1 whitespace-pre-wrap">
        {tweet.content}
      </p>
      
      <div className="mt-auto">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tweet.tags.map(tag => (
            <span key={tag} className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-border/50">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/50">
          <div className="font-mono truncate max-w-[150px]">
            Twitter - {tweet.author_handle} - {tweet.tweet_id.substring(0, 6)}...
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={10} />
            <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}