import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, BookmarkCheck, Network, Settings, Twitter, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
            <Twitter size={20} />
          </div>
          <h1 className="font-semibold tracking-tight">BrainMirror</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-3">Views</div>
          
          <Link href="/">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${location === "/" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <LayoutDashboard size={18} />
              <span className="text-sm">Dashboard</span>
            </div>
          </Link>
          
          <Link href="/bookmarks">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${location === "/bookmarks" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <BookmarkCheck size={18} />
              <span className="text-sm">Bookmarks</span>
            </div>
          </Link>
          
          <Link href="/graph">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${location === "/graph" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Network size={18} />
              <span className="text-sm">Obsidian Graph</span>
            </div>
          </Link>

          <div className="mt-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-3">System</div>
          
          <Link href="/settings">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${location === "/settings" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Settings size={18} />
              <span className="text-sm">Settings</span>
            </div>
          </Link>
        </nav>
        
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Sync Status</span>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-muted-foreground">Last sync: 2 mins ago</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Twitter size={20} className="text-primary" />
            <span className="font-semibold">BrainMirror</span>
          </div>
          <Button variant="ghost" size="icon">
            <Menu size={20} />
          </Button>
        </header>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}