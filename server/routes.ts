import type { Express } from "express";
import { createServer, type Server } from "http";
import archiver from "archiver";
import { storage } from "./storage";
import { insertTweetNoteSchema, insertSettingsSchema, type TweetNote } from "@shared/schema";

function generateMarkdown(tweet: TweetNote, filenameTemplate: string) {
  const date = new Date(tweet.createdAt).toISOString().split("T")[0];
  const contentTrunc = tweet.content.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const filename = filenameTemplate
    .replace("{author_handle}", tweet.authorHandle)
    .replace("{content_trunc_40}", contentTrunc)
    .replace("{date}", date)
    + ".md";
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, "-");

  const frontmatter = [
    "---",
    `tweet_url: ${tweet.tweetUrl}`,
    `author_handle: ${tweet.authorHandle}`,
    `created_at: ${tweet.createdAt}`,
    tweet.threadPosition ? `thread_position: ${tweet.threadPosition}` : null,
    `conversation_id: ${tweet.conversationId}`,
    `tweet_id: ${tweet.tweetId}`,
    `tags: [${(tweet.tags || []).join(", ")}]`,
    tweet.quotedTweetId ? `quoted_tweet_id: ${tweet.quotedTweetId}` : null,
    tweet.inReplyToTweetId ? `in_reply_to_tweet_id: ${tweet.inReplyToTweetId}` : null,
    "---",
  ].filter(Boolean).join("\n");

  const body = tweet.content
    .replace(/@(\w+)/g, "[[@$1]]")
    .replace(/#(\w+)/g, "[[#$1]]");

  const content = `${frontmatter}\n\n${body}\n`;

  return { filename: safeName, content };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Tweet Notes ───────────────────────────────────────────

  app.get("/api/tweets", async (req, res) => {
    try {
      const { search, tag } = req.query;
      let tweets;
      if (search && typeof search === "string") {
        tweets = await storage.searchTweetNotes(search);
      } else if (tag && typeof tag === "string") {
        tweets = await storage.filterTweetNotesByTag(tag);
      } else {
        tweets = await storage.getAllTweetNotes();
      }
      res.json(tweets);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/tweets/:id", async (req, res) => {
    try {
      const tweet = await storage.getTweetNote(req.params.id);
      if (!tweet) return res.status(404).json({ message: "Tweet note not found" });
      res.json(tweet);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tweets", async (req, res) => {
    try {
      const parsed = insertTweetNoteSchema.parse(req.body);
      const existing = await storage.getTweetNoteByTweetId(parsed.tweetId);
      if (existing) {
        return res.status(409).json({ message: "Tweet already imported", existing });
      }
      const created = await storage.createTweetNote(parsed);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/tweets/bulk", async (req, res) => {
    try {
      const { tweets } = req.body;
      if (!Array.isArray(tweets)) {
        return res.status(400).json({ message: "Expected { tweets: [...] }" });
      }
      const results = [];
      let imported = 0;
      let skipped = 0;
      for (const raw of tweets) {
        try {
          const parsed = insertTweetNoteSchema.parse(raw);
          const existing = await storage.getTweetNoteByTweetId(parsed.tweetId);
          if (existing) {
            skipped++;
            continue;
          }
          const created = await storage.createTweetNote(parsed);
          results.push(created);
          imported++;
        } catch {
          skipped++;
        }
      }
      res.status(201).json({ imported, skipped, tweets: results });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/tweets/:id", async (req, res) => {
    try {
      await storage.deleteTweetNote(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Stats ─────────────────────────────────────────────────

  app.get("/api/stats", async (_req, res) => {
    try {
      const [count, tags, authors, recentSyncs] = await Promise.all([
        storage.getTweetNoteCount(),
        storage.getUniqueTags(),
        storage.getUniqueAuthors(),
        storage.getRecentSyncLogs(5),
      ]);
      res.json({
        totalTweets: count,
        totalAuthors: authors.length,
        totalTags: tags.length,
        totalFiles: count + authors.length,
        tags,
        authors,
        recentSyncs,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Graph ─────────────────────────────────────────────────

  app.get("/api/graph", async (_req, res) => {
    try {
      const tweets = await storage.getAllTweetNotes();
      const authors = await storage.getUniqueAuthors();

      const nodes: any[] = [];
      const links: any[] = [];

      tweets.forEach(tweet => {
        nodes.push({
          id: tweet.id,
          name: `${tweet.authorHandle} - ${tweet.content.substring(0, 30)}...`,
          val: (tweet.links?.length || 0) + 2,
          group: "Tweet",
          color: "#A78BFA",
        });

        (tweet.links || []).forEach(targetId => {
          if (
            tweets.some(t => t.id === targetId) &&
            !links.some(l => (l.source === tweet.id && l.target === targetId) || (l.source === targetId && l.target === tweet.id))
          ) {
            links.push({ source: tweet.id, target: targetId });
          }
        });
      });

      authors.forEach(author => {
        const hubId = `hub-${author.handle}`;
        nodes.push({
          id: hubId,
          name: `Twitter - ${author.handle}.md`,
          val: author.count * 2 + 5,
          group: "Author",
          color: "#7C3AED",
        });
        tweets.filter(t => t.authorHandle === author.handle).forEach(t => {
          links.push({ source: hubId, target: t.id });
        });
      });

      res.json({ nodes, links });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Sync Logs ─────────────────────────────────────────────

  app.get("/api/sync-logs", async (_req, res) => {
    try {
      const logs = await storage.getRecentSyncLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── X Account ──────────────────────────────────────────

  async function fetchXUserByUsername(token: string, username: string) {
    const cleanUsername = username.replace(/^@/, "").trim();
    const response = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(cleanUsername)}?user.fields=profile_image_url,description,public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response;
  }

  app.get("/api/x-account/status", async (_req, res) => {
    try {
      const token = process.env.X_BEARER_TOKEN;
      const username = process.env.X_USERNAME;
      if (!token) {
        return res.json({ connected: false, message: "No bearer token configured" });
      }
      if (!username) {
        return res.json({ connected: false, message: "No X username configured" });
      }
      const response = await fetchXUserByUsername(token, username);
      if (!response.ok) {
        const errBody = await response.text();
        console.error(`X API status check failed (${response.status}):`, errBody);
        if (response.status === 401 || response.status === 403) {
          return res.json({ connected: false, message: "Bearer token is invalid or expired. Please reconnect." });
        }
        return res.json({ connected: false, message: "Could not reach X API. Please try again later." });
      }
      const data = await response.json();
      if (!data.data) {
        return res.json({ connected: false, message: `User @${username} not found on X.` });
      }
      res.json({
        connected: true,
        user: {
          id: data.data.id,
          name: data.data.name,
          username: data.data.username,
          profileImageUrl: data.data.profile_image_url,
          description: data.data.description,
          followers: data.data.public_metrics?.followers_count,
          following: data.data.public_metrics?.following_count,
          tweetCount: data.data.public_metrics?.tweet_count,
        },
      });
    } catch (err: any) {
      console.error("X API status error:", err);
      res.json({ connected: false, message: "Could not connect to X API." });
    }
  });

  app.post("/api/x-account/verify", async (req, res) => {
    try {
      const { bearerToken, username } = req.body;
      if (!bearerToken || typeof bearerToken !== "string") {
        return res.status(400).json({ connected: false, message: "Bearer token is required." });
      }
      if (!username || typeof username !== "string") {
        return res.status(400).json({ connected: false, message: "X username is required." });
      }
      const cleanUsername = username.replace(/^@/, "").trim();
      const response = await fetchXUserByUsername(bearerToken.trim(), cleanUsername);
      if (!response.ok) {
        const errBody = await response.text();
        console.error(`X API verify failed (${response.status}):`, errBody);
        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({ connected: false, message: "Invalid bearer token. Please check your token and try again." });
        }
        if (response.status === 402) {
          return res.status(402).json({ connected: false, message: "Your X developer account has no API credits remaining. Please add credits in the X Developer Portal under Billing > Credits." });
        }
        if (response.status === 429) {
          return res.status(429).json({ connected: false, message: "Rate limited by X API. Please wait a minute and try again." });
        }
        return res.status(502).json({ connected: false, message: `X API returned status ${response.status}. Please try again later.` });
      }
      const data = await response.json();
      if (!data.data) {
        return res.status(404).json({ connected: false, message: `User @${cleanUsername} not found on X. Please check the username.` });
      }
      process.env.X_BEARER_TOKEN = bearerToken.trim();
      process.env.X_USERNAME = cleanUsername;
      res.json({
        connected: true,
        user: {
          id: data.data.id,
          name: data.data.name,
          username: data.data.username,
          profileImageUrl: data.data.profile_image_url,
          description: data.data.description,
          followers: data.data.public_metrics?.followers_count,
          following: data.data.public_metrics?.following_count,
          tweetCount: data.data.public_metrics?.tweet_count,
        },
      });
    } catch (err: any) {
      console.error("X API verify error:", err);
      res.status(500).json({ connected: false, message: "Could not connect to X API." });
    }
  });

  // ─── Export / Download ─────────────────────────────────────

  app.get("/api/export/:id", async (req, res) => {
    try {
      const tweet = await storage.getTweetNote(req.params.id);
      if (!tweet) return res.status(404).json({ message: "Tweet note not found" });
      const s = await storage.getSettings();
      const md = generateMarkdown(tweet, s.filenameTemplate);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${md.filename}"`);
      res.send(md.content);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/export", async (_req, res) => {
    try {
      const tweets = await storage.getAllTweetNotes();
      const s = await storage.getSettings();
      const files = tweets.map(t => generateMarkdown(t, s.filenameTemplate));
      res.json(files);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/export/zip/download", async (_req, res) => {
    try {
      const tweets = await storage.getAllTweetNotes();
      if (tweets.length === 0) {
        return res.status(404).json({ message: "No notes to export" });
      }
      const s = await storage.getSettings();
      const files = tweets.map(t => generateMarkdown(t, s.filenameTemplate));

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="BrainMirror-Obsidian-Notes.zip"');

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err: Error) => {
        res.status(500).json({ message: err.message });
      });
      archive.pipe(res);

      for (const file of files) {
        archive.append(file.content, { name: file.filename });
      }

      await archive.finalize();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Settings ──────────────────────────────────────────────

  app.get("/api/settings", async (_req, res) => {
    try {
      const s = await storage.getSettings();
      res.json(s);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const parsed = insertSettingsSchema.parse(req.body);
      const updated = await storage.updateSettings(parsed);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  return httpServer;
}
