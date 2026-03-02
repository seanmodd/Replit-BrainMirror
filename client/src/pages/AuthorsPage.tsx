import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const authors = stats?.authors || [];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back-authors">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 data-testid="text-authors-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Author Hubs</h1>
          <p className="text-muted-foreground">{authors.length} unique authors in your vault</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : authors.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>No authors found yet. Import some tweets first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {authors.map((author: any) => (
            <Card key={author.handle} data-testid={`card-author-${author.handle}`} className="hover:bg-foreground/[0.03] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(author.name || author.handle)?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-foreground truncate">{author.name || author.handle}</div>
                    <div className="text-muted-foreground text-[13px] truncate">@{author.handle}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{author.count} {author.count === 1 ? "note" : "notes"}</span>
                      <a
                        href={`https://x.com/${author.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`link-author-profile-${author.handle}`}
                        className="text-muted-foreground hover:text-[#1d9bf0] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
