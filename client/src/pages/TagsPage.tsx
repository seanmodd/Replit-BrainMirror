import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hash, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function TagsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const tags: { tag: string; count: number }[] = stats?.tags || [];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-tags">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 data-testid="text-tags-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Tags</h1>
          <p className="text-muted-foreground">{tags.length} unique tags across your vault</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-9 w-24" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Hash className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>No tags found yet. Import tweets with hashtags to see them here.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map(({ tag, count }) => (
            <Link key={tag} href={`/tweets?tag=${encodeURIComponent(tag)}`}>
              <Card data-testid={`card-tag-${tag}`} className="hover:bg-foreground/[0.03] transition-colors cursor-pointer">
                <CardContent className="px-4 py-2.5 flex items-center gap-2">
                  <Hash size={14} className="text-[#10B981]" />
                  <span className="text-sm font-medium text-foreground">{tag}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
