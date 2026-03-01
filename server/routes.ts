import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTweetNoteSchema, insertSettingsSchema } from "@shared/schema";

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
