import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import BookmarksView from "@/pages/BookmarksView";
import GraphView from "@/pages/GraphView";
import Settings from "@/pages/Settings";
import TweetsPage from "@/pages/TweetsPage";
import AuthorsPage from "@/pages/AuthorsPage";
import FilesPage from "@/pages/FilesPage";
import TagsPage from "@/pages/TagsPage";
import TimelinePage from "@/pages/TimelinePage";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tweets" component={TweetsPage} />
        <Route path="/authors" component={AuthorsPage} />
        <Route path="/files" component={FilesPage} />
        <Route path="/tags" component={TagsPage} />
        <Route path="/timeline" component={TimelinePage} />
        <Route path="/bookmarks" component={BookmarksView} />
        <Route path="/graph" component={GraphView} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
