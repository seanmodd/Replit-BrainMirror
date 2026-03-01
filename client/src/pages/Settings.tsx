import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Shield, Github, Upload } from "lucide-react";

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

  const handleExportZip = () => {
    const a = document.createElement("a");
    a.href = "/api/export/zip/download";
    a.download = "BrainMirror-Obsidian-Notes.zip";
    a.click();
  };

  const handleExportAll = async () => {
    try {
      const files = await api.exportAll();
      if (files.length === 0) {
        toast({ title: "No notes to export" });
        return;
      }
      for (const file of files) {
        const blob = new Blob([file.content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 100));
      }
      toast({ title: `Exported ${files.length} notes` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
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
        <p className="text-muted-foreground">Configure BrainMirror and connect your accounts.</p>
      </div>

      <div className="space-y-6 pb-10">
        <XAccountCard />

        <GitHubSyncCard />

        <Card>
          <CardHeader>
            <CardTitle>Manual Export</CardTitle>
            <CardDescription>Download notes directly if you prefer manual file management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button data-testid="button-export-zip" variant="outline" onClick={handleExportZip}>
                <Download className="mr-2 h-4 w-4" />
                Download All as ZIP
              </Button>
              <Button data-testid="button-export-all" variant="outline" onClick={handleExportAll}>
                <Download className="mr-2 h-4 w-4" />
                Download Individual Files
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Notes include YAML frontmatter, wiki-links to authors (<code className="bg-muted px-1 rounded">[[@handle]]</code>), and hashtag links (<code className="bg-muted px-1 rounded">[[#tag]]</code>) for Obsidian's graph view.
            </p>
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
              <p className="text-xs text-muted-foreground">
                Available variables: <code className="bg-muted px-1 rounded">{"{author_handle}"}</code>, <code className="bg-muted px-1 rounded">{"{content_trunc_40}"}</code>, <code className="bg-muted px-1 rounded">{"{date}"}</code>
              </p>
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

function XAccountCard() {
  const { toast } = useToast();
  const [tokenInput, setTokenInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const { data: xStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/x-account/status"],
    queryFn: api.xAccount.status,
  });

  const { data: oauthStatus } = useQuery({
    queryKey: ["/api/x-auth/status"],
    queryFn: api.xAuth.status,
  });

  const verifyMutation = useMutation({
    mutationFn: api.xAccount.verify,
    onSuccess: (data) => {
      if (data.connected) {
        toast({ title: "X account verified!", description: `Connected as @${data.user.username}` });
        setShowConnectForm(false);
        setTokenInput("");
        setUsernameInput("");
        queryClient.invalidateQueries({ queryKey: ["/api/x-account/status"] });
      }
    },
    onError: (err: any) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !usernameInput.trim()) return;
    verifyMutation.mutate({ bearerToken: tokenInput.trim(), username: usernameInput.trim() });
  };

  const handleAuthorize = async () => {
    try {
      const { url } = await api.xAuth.authorize();
      window.open(url, "_blank");
    } catch (err: any) {
      toast({ title: "Authorization failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>X Account Connection</CardTitle>
        <CardDescription>Connect your X (Twitter) account to enable bookmark syncing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : xStatus?.connected ? (
          <div className="flex items-center justify-between p-4 border border-green-500/30 rounded-lg bg-green-500/5">
            <div className="flex items-center gap-4">
              {xStatus.user.profileImageUrl ? (
                <img 
                  src={xStatus.user.profileImageUrl} 
                  alt={xStatus.user.name} 
                  className="w-12 h-12 rounded-full border-2 border-green-500/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center text-[#1DA1F2]">
                  <XIcon />
                </div>
              )}
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {xStatus.user.name}
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-sm text-muted-foreground">@{xStatus.user.username}</div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>{xStatus.user.followers?.toLocaleString()} followers</span>
                  <span>{xStatus.user.following?.toLocaleString()} following</span>
                  <span>{xStatus.user.tweetCount?.toLocaleString()} posts</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <div className="text-green-500 font-medium">Active</div>
              <span>via env secret</span>
            </div>
          </div>
        ) : (
          <>
            {!showConnectForm ? (
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <XIcon />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Not Connected
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground">Add your X API Bearer Token to connect</div>
                  </div>
                </div>
                <Button data-testid="button-connect-x" variant="default" size="sm" onClick={() => setShowConnectForm(true)}>
                  Connect Account
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4 p-4 border border-primary/30 rounded-lg bg-primary/5">
                <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">How to get your Bearer Token</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to the <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noreferrer" className="text-[#A78BFA] underline">X Developer Portal</a></li>
                      <li>Create or select a Project & App</li>
                      <li>Navigate to "Keys and tokens"</li>
                      <li>Generate a Bearer Token under "Authentication Tokens"</li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="x-username">X Username</Label>
                  <Input 
                    data-testid="input-x-username"
                    id="x-username"
                    type="text"
                    placeholder="@persiansean"
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    className="font-mono text-sm bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bearer-token">Bearer Token</Label>
                  <div className="relative">
                    <Input 
                      data-testid="input-bearer-token"
                      id="bearer-token"
                      type={showToken ? "text" : "password"}
                      placeholder="AAAA..."
                      value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      className="pr-10 font-mono text-sm bg-muted/50"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowToken(!showToken)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your token is sent to the X API for verification. To persist it, add it as the <code className="bg-muted px-1 rounded">X_BEARER_TOKEN</code> environment secret.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button data-testid="button-verify-token" type="submit" disabled={verifyMutation.isPending || !tokenInput.trim() || !usernameInput.trim()}>
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : "Verify & Connect"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowConnectForm(false); setTokenInput(""); setUsernameInput(""); }}>
                    Cancel
                  </Button>
                </div>

                {verifyMutation.data?.connected && (
                  <div className="p-4 border border-green-500/30 rounded-lg bg-green-500/5 mt-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Verified as @{verifyMutation.data.user.username}</div>
                        <div className="text-xs text-muted-foreground">{verifyMutation.data.user.name} · {verifyMutation.data.user.followers?.toLocaleString()} followers</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                      <p className="font-medium text-foreground mb-1">Next step: Save your token</p>
                      <p>To persist this connection, add your Bearer Token as the <code className="bg-muted px-1 rounded font-mono">X_BEARER_TOKEN</code> environment secret in the Secrets tab of your Replit project.</p>
                    </div>
                  </div>
                )}
              </form>
            )}
          </>
        )}

        <div className="border-t border-border pt-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                Bookmark Sync Access
                {oauthStatus?.oauthConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {oauthStatus?.oauthConnected
                  ? "OAuth connected — bookmark syncing is active."
                  : "Authorize with X to enable automatic bookmark syncing."}
              </p>
            </div>
            {!oauthStatus?.oauthConnected && (
              <Button
                data-testid="button-authorize-oauth"
                variant="outline"
                size="sm"
                onClick={handleAuthorize}
                disabled={!oauthStatus?.hasClientCredentials}
              >
                Authorize Bookmarks
              </Button>
            )}
          </div>
          {!oauthStatus?.hasClientCredentials && !oauthStatus?.oauthConnected && (
            <div className="mt-3 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md space-y-2">
              <p className="font-medium text-foreground">Setup required for bookmark syncing:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>In the <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noreferrer" className="text-[#A78BFA] underline">X Developer Portal</a>, open your app settings</li>
                <li>Under "User authentication settings", click <strong>Set up</strong></li>
                <li>Set App permissions to <strong>Read</strong></li>
                <li>Set Type of App to <strong>Web App, Automated App or Bot</strong></li>
                <li>Set Callback URL to: <code className="bg-muted px-1 rounded font-mono text-[10px] break-all">{oauthStatus?.redirectUri || "loading..."}</code></li>
                <li>Set Website URL to any valid URL (e.g. https://brainmirror.replit.app)</li>
                <li>Save, then copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                <li>Add them as Replit secrets: <code className="bg-muted px-1 rounded font-mono">X_CLIENT_ID</code> and <code className="bg-muted px-1 rounded font-mono">X_CLIENT_SECRET</code></li>
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GitHubSyncCard() {
  const { toast } = useToast();
  const [repoInput, setRepoInput] = useState("seanmodd/brainmirror");
  const [folderInput, setFolderInput] = useState("");

  const { data: ghStatus, isLoading: ghLoading } = useQuery({
    queryKey: ["/api/github/status"],
    queryFn: api.github.status,
  });

  const pushMutation = useMutation({
    mutationFn: api.github.push,
    onSuccess: (data) => {
      const total = data.created.length + data.updated.length;
      const parts = [];
      if (data.created.length) parts.push(`${data.created.length} created`);
      if (data.updated.length) parts.push(`${data.updated.length} updated`);
      if (data.unchanged.length) parts.push(`${data.unchanged.length} unchanged`);
      if (data.errors.length) parts.push(`${data.errors.length} failed`);
      toast({
        title: `Pushed ${total} notes to GitHub`,
        description: parts.join(", "),
        variant: data.errors.length ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Push failed", description: err.message, variant: "destructive" });
    },
  });

  const handlePush = () => {
    const [owner, repo] = repoInput.split("/");
    if (!owner || !repo) {
      toast({ title: "Invalid repo", description: "Use the format owner/repo", variant: "destructive" });
      return;
    }
    pushMutation.mutate({ owner, repo, folder: folderInput || undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Obsidian via GitHub
        </CardTitle>
        <CardDescription>Push your tweet notes directly to your GitHub repo. Obsidian syncs automatically from GitHub.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ghLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : ghStatus?.connected ? (
          <>
            <div data-testid="status-github-connected" className="flex items-center gap-3 p-3 border border-green-500/30 rounded-lg bg-green-500/5">
              {ghStatus.avatar && (
                <img data-testid="img-github-avatar" src={ghStatus.avatar} alt={ghStatus.username} className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1">
                <div data-testid="text-github-username" className="font-medium flex items-center gap-2">
                  {ghStatus.username}
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xs text-green-500">GitHub connected</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="github-repo">Repository</Label>
                <Input
                  data-testid="input-github-repo"
                  id="github-repo"
                  value={repoInput}
                  onChange={e => setRepoInput(e.target.value)}
                  placeholder="owner/repo"
                  className="font-mono text-sm bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-folder">Folder (optional)</Label>
                <Input
                  data-testid="input-github-folder"
                  id="github-folder"
                  value={folderInput}
                  onChange={e => setFolderInput(e.target.value)}
                  placeholder="e.g. Twitter"
                  className="font-mono text-sm bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to push to the repo root, or specify a subfolder.
                </p>
              </div>
              <Button
                data-testid="button-push-github"
                onClick={handlePush}
                disabled={pushMutation.isPending || !repoInput.trim()}
              >
                {pushMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Pushing to GitHub...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Push Notes to GitHub
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/20">
            <Github className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">GitHub not connected</div>
              <div className="text-xs text-muted-foreground">Connect GitHub via the Replit integrations panel to enable syncing.</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
      <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
    </svg>
  );
}
