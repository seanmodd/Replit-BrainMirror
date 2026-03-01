import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Database, Network, Twitter, Search, Menu } from "lucide-react";
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
            <Network size={20} />
          </div>
          <h1 className="font-semibold tracking-tight">Second Brain</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">Views</div>
          
          <Link href="/">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Database size={18} />
              <span className="font-medium">Database</span>
            </div>
          </Link>
          
          <Link href="/graph">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${location === "/graph" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Network size={18} />
              <span className="font-medium">Graph View</span>
            </div>
          </Link>

          <div className="mt-8 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">Integrations</div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors">
            <Twitter size={18} />
            <span className="font-medium">Import Tweets</span>
          </div>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">U</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">User Account</span>
              <span className="text-xs text-muted-foreground">Pro Plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Network size={20} className="text-primary" />
            <span className="font-semibold">Second Brain</span>
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