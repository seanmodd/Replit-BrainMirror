// GitHub integration via Replit connector
import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export interface PushResult {
  created: string[];
  updated: string[];
  unchanged: string[];
  errors: string[];
}

export async function pushFilesToGitHub(
  owner: string,
  repo: string,
  files: { filename: string; content: string }[],
  folder: string = ""
): Promise<PushResult> {
  const octokit = await getUncachableGitHubClient();
  const result: PushResult = { created: [], updated: [], unchanged: [], errors: [] };

  for (const file of files) {
    const path = folder ? `${folder}/${file.filename}` : file.filename;
    try {
      let sha: string | undefined;
      try {
        const existing = await octokit.repos.getContent({ owner, repo, path });
        if (!Array.isArray(existing.data) && existing.data.type === "file") {
          sha = existing.data.sha;
          const existingContent = Buffer.from(existing.data.content, "base64").toString("utf-8");
          if (existingContent === file.content) {
            result.unchanged.push(path);
            continue;
          }
        }
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: sha ? `Update ${file.filename}` : `Add ${file.filename}`,
        content: Buffer.from(file.content).toString("base64"),
        ...(sha ? { sha } : {}),
      });

      if (sha) {
        result.updated.push(path);
      } else {
        result.created.push(path);
      }
    } catch (err: any) {
      console.error(`Failed to push ${path}:`, err.message);
      result.errors.push(`${path}: ${err.message}`);
    }
  }

  return result;
}
