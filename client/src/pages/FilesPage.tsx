import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Download, Users } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function FilesPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.stats,
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/export"],
    queryFn: api.exportAll,
  });

  const isLoading = statsLoading || filesLoading;
  const authors = stats?.authors || [];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto gap-6 overflow-y-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-files">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 data-testid="text-files-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Markdown Files</h1>
            <p className="text-muted-foreground">{stats?.totalFiles ?? 0} files ({stats?.totalTweets ?? 0} tweets + {stats?.totalAuthors ?? 0} author hubs)</p>
          </div>
        </div>
        <a href="/api/export/zip/download" download>
          <Button data-testid="button-download-zip" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download ZIP
          </Button>
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (files?.length ?? 0) === 0 && authors.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p>No markdown files generated yet. Import some tweets first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {authors.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} />
                Author Hub Files ({authors.length})
              </h2>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {authors.map((author: any) => (
                      <div key={author.handle} data-testid={`file-author-${author.handle}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition-colors">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Users size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">@{author.handle}.md</div>
                          <div className="text-xs text-muted-foreground">Author hub · {author.count} linked notes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {(files?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} />
                Tweet Note Files ({files!.length})
              </h2>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {files!.map((file: any, idx: number) => (
                      <div key={idx} data-testid={`file-tweet-${idx}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition-colors">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-foreground">
                          <FileText size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{file.filename}</div>
                          <div className="text-xs text-muted-foreground truncate">{file.content?.substring(0, 80)}...</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
