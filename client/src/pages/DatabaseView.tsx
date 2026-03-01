import { useState, useMemo } from "react";
import { mockNotes, Note } from "@/lib/mock-data";
import { Search, Filter, Folder, Tag, ExternalLink, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DatabaseView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    mockNotes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, []);

  // Filter notes based on search and tags
  const filteredNotes = useMemo(() => {
    return mockNotes.filter(note => {
      const matchesSearch = searchTerm === "" || 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        note.content.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesTag = selectedTag === null || note.tags.includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [searchTerm, selectedTag]);

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">Database</h1>
          <p className="text-muted-foreground">Browse and search your imported knowledge.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search notes..." 
              className="pl-9 bg-card border-border focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="border-border">
            <Filter size={16} />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
        <Badge 
          variant={selectedTag === null ? "default" : "outline"} 
          className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm ${selectedTag === null ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'}`}
          onClick={() => setSelectedTag(null)}
        >
          All Notes
        </Badge>
        {allTags.map(tag => (
          <Badge 
            key={tag}
            variant={selectedTag === tag ? "default" : "outline"} 
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm ${selectedTag === tag ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'}`}
            onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
          >
            #{tag}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
        {filteredNotes.map(note => (
          <NoteCard key={note.id} note={note} />
        ))}
        {filteredNotes.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No notes found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-1.5 text-xs text-primary font-mono bg-primary/10 px-2 py-1 rounded">
          <Folder size={12} />
          <span>{note.folder}</span>
        </div>
        <a href={note.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
          <ExternalLink size={14} />
        </a>
      </div>
      
      <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{note.title}</h3>
      
      <p className="text-sm text-muted-foreground line-clamp-4 mb-4 flex-1">
        {note.content}
      </p>
      
      <div className="mt-auto">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {note.tags.map(tag => (
            <span key={tag} className="text-xs text-accent-foreground bg-accent/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-medium">
              {note.author[0]}
            </div>
            <span>{note.authorHandle}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{new Date(note.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}</span>
          </div>
        </div>
      </div>
    </div>
  );
}