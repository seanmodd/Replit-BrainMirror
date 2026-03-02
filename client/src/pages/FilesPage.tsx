import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Download, Users, Folder, FolderOpen, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";

interface DateFolder {
  year: string;
  months: {
    month: string;
    days: {
      day: string;
      files: any[];
    }[];
  }[];
}

function buildDateTree(files: any[]): DateFolder[] {
  const tree = new Map<string, Map<string, Map<string, any[]>>>();

  for (const file of files) {
    const folder = file.folderPath || "unknown/00-Unknown/00";
    const parts = folder.split("/");
    const year = parts[0] || "unknown";
    const month = parts[1] || "00-Unknown";
    const day = parts[2] || "00";

    if (!tree.has(year)) tree.set(year, new Map());
    const yearMap = tree.get(year)!;
    if (!yearMap.has(month)) yearMap.set(month, new Map());
    const monthMap = yearMap.get(month)!;
    if (!monthMap.has(day)) monthMap.set(day, []);
    monthMap.get(day)!.push(file);
  }

  const result: DateFolder[] = [];
  const sortedYears = Array.from(tree.keys()).sort((a, b) => b.localeCompare(a));

  for (const year of sortedYears) {
    const yearMap = tree.get(year)!;
    const months = Array.from(yearMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, dayMap]) => ({
        month,
        days: Array.from(dayMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([day, dayFiles]) => ({ day, files: dayFiles })),
      }));
    result.push({ year, months });
  }

  return result;
}

function FolderTree({ folders }: { folders: DateFolder[] }) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(folders.map(f => f.year)));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {folders.map(({ year, months }) => {
        const yearExpanded = expandedYears.has(year);
        const yearTotal = months.reduce((sum, m) => sum + m.days.reduce((s, d) => s + d.files.length, 0), 0);
        return (
          <div key={year}>
            <button
              data-testid={`folder-year-${year}`}
              onClick={() => toggleYear(year)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              {yearExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
              {yearExpanded ? <FolderOpen size={16} className="text-primary" /> : <Folder size={16} className="text-primary" />}
              <span className="font-semibold text-foreground">{year}</span>
              <span className="text-xs text-muted-foreground ml-auto">{yearTotal} files</span>
            </button>

            {yearExpanded && (
              <div className="ml-6 space-y-0.5">
                {months.map(({ month, days }) => {
                  const monthKey = `${year}/${month}`;
                  const monthExpanded = expandedMonths.has(monthKey);
                  const monthTotal = days.reduce((s, d) => s + d.files.length, 0);
                  return (
                    <div key={monthKey}>
                      <button
                        data-testid={`folder-month-${monthKey}`}
                        onClick={() => toggleMonth(monthKey)}
                        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-left"
                      >
                        {monthExpanded ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                        {monthExpanded ? <FolderOpen size={14} className="text-amber-500" /> : <Folder size={14} className="text-amber-500" />}
                        <span className="text-sm font-medium text-foreground">{month}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{monthTotal}</span>
                      </button>

                      {monthExpanded && (
                        <div className="ml-6 space-y-0.5">
                          {days.map(({ day, files }) => (
                            <div key={`${monthKey}/${day}`}>
                              <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
                                <Calendar size={10} />
                                <span className="font-medium">Day {day}</span>
                                <span className="ml-auto">{files.length}</span>
                              </div>
                              <div className="ml-4 space-y-0.5">
                                {files.map((file: any, idx: number) => (
                                  <div key={idx} data-testid={`file-tree-${idx}`} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-foreground/[0.03] transition-colors">
                                    <FileText size={12} className="text-muted-foreground shrink-0" />
                                    <span className="text-xs text-foreground truncate">{file.filename}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

  const dateTree = useMemo(() => {
    if (!files || files.length === 0) return [];
    return buildDateTree(files);
  }, [files]);

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
            <h1 data-testid="text-files-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Obsidian Vault</h1>
            <p className="text-muted-foreground">{stats?.totalFiles ?? 0} files organized by date ({stats?.totalTweets ?? 0} tweets + {stats?.totalAuthors ?? 0} author hubs)</p>
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

          {dateTree.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Folder size={14} />
                Tweet Notes by Date ({files!.length})
              </h2>
              <Card>
                <CardContent className="p-2">
                  <FolderTree folders={dateTree} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
