import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  return (
    <div className="h-full p-6 max-w-4xl mx-auto overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">Settings</h1>
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
                  id="vault-path" 
                  defaultValue="~/Documents/Obsidian/SecondBrain/Twitter" 
                  className="font-mono text-sm bg-muted/50" 
                />
                <Button variant="secondary">Browse...</Button>
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
              <Select defaultValue="10">
                <SelectTrigger id="poll-interval" className="w-[200px]">
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
                    <div className="font-medium">@persiansean</div>
                    <div className="text-xs text-green-500">Connected & Authenticated</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  Disconnect
                </Button>
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
                defaultValue="Twitter - {author_handle} - {content_trunc_40} ({date})" 
                className="font-mono text-sm bg-muted/50" 
              />
            </div>
            
            <div className="space-y-2 mt-4">
              <Label>Helper Notes</Label>
              <div className="flex items-center space-x-2 mt-2">
                <input type="checkbox" id="author-hubs" defaultChecked className="rounded border-border bg-card text-primary focus:ring-primary h-4 w-4" />
                <Label htmlFor="author-hubs" className="font-normal text-sm">Automatically generate Author Hubs (`Twitter - @handle.md`)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="dashboard-note" defaultChecked className="rounded border-border bg-card text-primary focus:ring-primary h-4 w-4" />
                <Label htmlFor="dashboard-note" className="font-normal text-sm">Update `Twitter Dashboard.md` on every sync</Label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost">Cancel</Button>
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}