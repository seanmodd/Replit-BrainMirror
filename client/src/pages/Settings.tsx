import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: api.settings.get,
  });

  const [form, setForm] = useState({
    vaultPath: "",
    pollInterval: 10,
    filenameTemplate: "",
    generateAuthorHubs: true,
    generateDashboard: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        vaultPath: settings.vaultPath || "",
        pollInterval: settings.pollInterval || 10,
        filenameTemplate: settings.filenameTemplate || "",
        generateAuthorHubs: settings.generateAuthorHubs ?? true,
        generateDashboard: settings.generateDashboard ?? true,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 max-w-4xl mx-auto overflow-y-auto">
      <div className="mb-8">
        <h1 data-testid="text-settings-title" className="text-3xl font-bold tracking-tight mb-1 text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your SecondBrain behavior and Obsidian integration.</p>
      </div>

      <div className="space-y-6 pb-10">
        <Card>
          <CardHeader>
            <CardTitle>Vault Configuration</CardTitle>
            <CardDescription>Where should we save your markdown files?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vault-path">Local Obsidian Vault Path</Label>
              <div className="flex gap-2">
                <Input 
                  data-testid="input-vault-path"
                  id="vault-path" 
                  value={form.vaultPath}
                  onChange={e => setForm(f => ({ ...f, vaultPath: e.target.value }))}
                  className="font-mono text-sm bg-muted/50" 
                />
              </div>
              <p className="text-xs text-muted-foreground">Notes will be created directly in this folder.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Engine</CardTitle>
            <CardDescription>Control how often we check X for new bookmarks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="poll-interval">Polling Interval</Label>
              <Select value={String(form.pollInterval)} onValueChange={v => setForm(f => ({ ...f, pollInterval: Number(v) }))}>
                <SelectTrigger data-testid="select-poll-interval" id="poll-interval" className="w-[200px]">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="10">Every 10 minutes (Recommended)</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Hourly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Frequent polling consumes your X API rate limit (180 requests/15min).</p>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">X Account Authentication</h3>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center text-[#1DA1F2]">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
                      <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Not Connected</div>
                    <div className="text-xs text-muted-foreground">Add X API credentials to enable auto-sync</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Connect</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note Formatting</CardTitle>
            <CardDescription>Customize the YAML frontmatter and note content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Filename Template</Label>
              <Input 
                data-testid="input-filename-template"
                value={form.filenameTemplate}
                onChange={e => setForm(f => ({ ...f, filenameTemplate: e.target.value }))}
                className="font-mono text-sm bg-muted/50" 
              />
            </div>
            
            <div className="space-y-2 mt-4">
              <Label>Helper Notes</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input 
                  type="checkbox" 
                  id="author-hubs" 
                  checked={form.generateAuthorHubs}
                  onChange={e => setForm(f => ({ ...f, generateAuthorHubs: e.target.checked }))}
                  className="rounded border-border bg-card text-primary focus:ring-primary h-4 w-4" 
                />
                <Label htmlFor="author-hubs" className="font-normal text-sm">Automatically generate Author Hubs</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="dashboard-note" 
                  checked={form.generateDashboard}
                  onChange={e => setForm(f => ({ ...f, generateDashboard: e.target.checked }))}
                  className="rounded border-border bg-card text-primary focus:ring-primary h-4 w-4" 
                />
                <Label htmlFor="dashboard-note" className="font-normal text-sm">Update Twitter Dashboard.md on every sync</Label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button data-testid="button-save-settings" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
