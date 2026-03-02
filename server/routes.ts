import type { Express } from "express";
import { createServer, type Server } from "http";
import archiver from "archiver";
import { storage } from "./storage";
import { insertTweetNoteSchema, insertSettingsSchema, type TweetNote } from "@shared/schema";
import { pushFilesToGitHub, getUncachableGitHubClient } from "./github";
import { getAuthorizationUrl, exchangeCodeForTokens, isOAuthConnected, fetchBookmarks, getRedirectUriForDisplay, getOAuthUserId, fetchUserTweets } from "./xauth";

function getRealAuthor(tweet: TweetNote): { handle: string; name: string } {
  const content = tweet.content || "";
  const isRt = tweet.source === "retweet" || content.startsWith("RT @");
  if (isRt) {
    const rtMatch = content.match(/^RT @([\w]+):\s*/);
    if (rtMatch) {
      return { handle: rtMatch[1], name: rtMatch[1] };
    }
  }
  const urlMatch = tweet.tweetUrl?.match(/x\.com\/(\w+)\/status/);
  const urlAuthor = urlMatch ? urlMatch[1] : null;
  const storedHandle = tweet.authorHandle || "unknown";
  const storedName = tweet.authorName || storedHandle;
  if (urlAuthor && urlAuthor.toLowerCase() !== storedHandle.toLowerCase()) {
    return { handle: urlAuthor, name: urlAuthor };
  }
  return { handle: storedHandle, name: storedName };
}

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
      const { search, tag, source } = req.query;
      let tweets;
      if (search && typeof search === "string") {
        tweets = await storage.searchTweetNotes(search);
      } else if (tag && typeof tag === "string") {
        tweets = await storage.filterTweetNotesByTag(tag);
      } else {
        tweets = await storage.getAllTweetNotes();
      }
      if (source && typeof source === "string") {
        tweets = tweets.filter(t => t.source === source);
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
      const [allTweets, tags, recentSyncs] = await Promise.all([
        storage.getAllTweetNotes(),
        storage.getUniqueTags(),
        storage.getRecentSyncLogs(5),
      ]);
      const ownUsername = (process.env.X_USERNAME || "").toLowerCase();
      const authorMap = new Map<string, { handle: string; name: string; count: number }>();
      for (const tweet of allTweets) {
        const real = getRealAuthor(tweet);
        const key = real.handle.toLowerCase();
        if (key === ownUsername || key === "unknown") continue;
        const existing = authorMap.get(key);
        if (existing) {
          existing.count++;
          if (real.name !== real.handle && existing.name === existing.handle) {
            existing.name = real.name;
          }
        } else {
          authorMap.set(key, { handle: real.handle, name: real.name, count: 1 });
        }
      }
      const authors = Array.from(authorMap.values()).sort((a, b) => b.count - a.count);
      const count = allTweets.length;
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
      const ownUsername = (process.env.X_USERNAME || "").toLowerCase();
      const authorMap = new Map<string, { handle: string; name: string; count: number }>();
      for (const tweet of tweets) {
        const real = getRealAuthor(tweet);
        const key = real.handle.toLowerCase();
        if (key === ownUsername || key === "unknown") continue;
        const existing = authorMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          authorMap.set(key, { handle: real.handle, name: real.name, count: 1 });
        }
      }
      const authors = Array.from(authorMap.values()).sort((a, b) => b.count - a.count);

      const nodes: any[] = [];
      const links: any[] = [];
      const linkSet = new Set<string>();

      const addLink = (source: string, target: string) => {
        const key = [source, target].sort().join("__");
        if (!linkSet.has(key)) {
          linkSet.add(key);
          links.push({ source, target });
        }
      };

      const tagTweetMap = new Map<string, string[]>();
      const conversationMap = new Map<string, string[]>();

      tweets.forEach(tweet => {
        const sourceColorMap: Record<string, string> = { bookmark: "#3B82F6", retweet: "#F59E0B", public: "#A78BFA", manual: "#8B5CF6" };
        const sourceColor = sourceColorMap[tweet.source] || "#A78BFA";
        nodes.push({
          id: tweet.id,
          name: `${getRealAuthor(tweet).handle} - ${tweet.content.substring(0, 30)}...`,
          val: (tweet.links?.length || 0) + 2,
          group: "Tweet",
          subgroup: tweet.source || "manual",
          color: sourceColor,
        });

        (tweet.links || []).forEach(targetId => {
          if (tweets.some(t => t.id === targetId)) {
            addLink(tweet.id, targetId);
          }
        });

        if (tweet.quotedTweetId) {
          const quoted = tweets.find(t => t.tweetId === tweet.quotedTweetId);
          if (quoted) addLink(tweet.id, quoted.id);
        }
        if (tweet.inReplyToTweetId) {
          const parent = tweets.find(t => t.tweetId === tweet.inReplyToTweetId);
          if (parent) addLink(tweet.id, parent.id);
        }

        (tweet.tags || []).forEach(tag => {
          if (!tagTweetMap.has(tag)) tagTweetMap.set(tag, []);
          tagTweetMap.get(tag)!.push(tweet.id);
        });

        const convId = tweet.conversationId;
        if (convId) {
          if (!conversationMap.has(convId)) conversationMap.set(convId, []);
          conversationMap.get(convId)!.push(tweet.id);
        }
      });

      authors.forEach(author => {
        const hubId = `hub-${author.handle}`;
        nodes.push({
          id: hubId,
          name: `@${author.handle}`,
          val: author.count * 2 + 5,
          group: "Author",
          color: "#7C3AED",
        });
        tweets.filter(t => {
          const real = getRealAuthor(t);
          return real.handle.toLowerCase() === author.handle.toLowerCase();
        }).forEach(t => {
          addLink(hubId, t.id);
        });
      });

      tagTweetMap.forEach((tweetIds, tag) => {
        if (tweetIds.length < 1) return;
        const tagId = `tag-${tag}`;
        nodes.push({
          id: tagId,
          name: tag,
          val: tweetIds.length + 3,
          group: "Hashtag",
          color: "#10B981",
        });
        tweetIds.forEach(tid => addLink(tagId, tid));

        const authorHandles = new Set<string>();
        tweetIds.forEach(tid => {
          const tw = tweets.find(t => t.id === tid);
          if (tw) authorHandles.add(getRealAuthor(tw).handle);
        });
        authorHandles.forEach(handle => {
          const key = handle.toLowerCase();
          if (key !== ownUsername && key !== "unknown") {
            addLink(tagId, `hub-${handle}`);
          }
        });
      });

      conversationMap.forEach((tweetIds, convId) => {
        if (tweetIds.length < 2) return;
        const threadId = `thread-${convId}`;
        nodes.push({
          id: threadId,
          name: `Thread`,
          val: tweetIds.length + 2,
          group: "Thread",
          color: "#F97316",
        });
        tweetIds.forEach(tid => addLink(threadId, tid));
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

  // ─── X OAuth & Bookmark Sync ───────────────────────────────

  app.get("/api/x-auth/status", async (_req, res) => {
    try {
      res.json({
        oauthConnected: isOAuthConnected(),
        redirectUri: getRedirectUriForDisplay(),
        hasClientCredentials: !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET),
      });
    } catch (err: any) {
      res.json({ oauthConnected: false, redirectUri: "", hasClientCredentials: false });
    }
  });

  app.get("/api/x-auth/authorize", async (_req, res) => {
    try {
      const url = getAuthorizationUrl();
      res.json({ url });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/x-auth/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.status(400).send("Missing code or state parameter");
      }
      await exchangeCodeForTokens(code as string, state as string);
      res.redirect("/settings?oauth=success");
    } catch (err: any) {
      console.error("OAuth callback error:", err);
      res.redirect("/settings?oauth=error&message=" + encodeURIComponent(err.message));
    }
  });

  app.post("/api/sync/public", async (req, res) => {
    try {
      const bearerToken = process.env.X_BEARER_TOKEN;
      const username = process.env.X_USERNAME;
      if (!bearerToken || !username) {
        return res.status(401).json({ message: "Bearer token and username not configured. Please verify your X account first." });
      }

      const { types } = req.body;
      const syncTypes: string[] = Array.isArray(types) ? types : ["tweets"];

      const userLookup = await fetch(
        `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id`,
        { headers: { Authorization: `Bearer ${bearerToken}` } }
      );
      if (!userLookup.ok) {
        const errText = await userLookup.text();
        console.error(`User lookup failed (${userLookup.status}):`, errText);
        if (userLookup.status === 402) {
          return res.status(402).json({ message: "X API credits depleted. Add credits in the X Developer Portal." });
        }
        return res.status(502).json({ message: "Could not look up user." });
      }
      const userData = await userLookup.json();
      if (!userData.data?.id) {
        return res.status(404).json({ message: `User @${username} not found.` });
      }
      const userId = userData.data.id;

      const syncLog = await storage.createSyncLog({ status: "running", tweetsProcessed: 0 });
      let totalImported = 0;
      let totalSkipped = 0;
      let totalFetched = 0;

      try {
        const importTweets = async (tweetList: any[], authorMap: Map<string, any>, refTweetsMap: Map<string, any>, mediaMap: Map<string, any>) => {
          let imported = 0;
          let skipped = 0;
          for (const tw of tweetList) {
            const isRetweet = tw.referenced_tweets?.some((r: any) => r.type === "retweeted");
            const retweetedRef = tw.referenced_tweets?.find((r: any) => r.type === "retweeted");

            let authorHandle: string;
            let authorName: string;
            let tweetUrl: string;

            if (isRetweet && retweetedRef) {
              const originalTweet = refTweetsMap.get(retweetedRef.id);
              const originalAuthor = originalTweet ? authorMap.get(originalTweet.author_id) : null;
              if (originalAuthor) {
                authorHandle = originalAuthor.username;
                authorName = originalAuthor.name || authorHandle;
                tweetUrl = `https://x.com/${authorHandle}/status/${retweetedRef.id}`;
              } else {
                const rtMatch = tw.text?.match(/^RT @([\w]+):/);
                authorHandle = rtMatch ? rtMatch[1] : (authorMap.get(tw.author_id)?.username || username);
                authorName = authorHandle;
                tweetUrl = `https://x.com/${authorHandle}/status/${retweetedRef.id}`;
              }
            } else {
              const author = authorMap.get(tw.author_id);
              authorHandle = author?.username || username;
              authorName = author?.name || authorHandle;
              tweetUrl = `https://x.com/${authorHandle}/status/${tw.id}`;
            }

            const quotedRef = tw.referenced_tweets?.find((r: any) => r.type === "quoted");
            const quotedId = quotedRef?.id || null;
            let quotedTweetContent: string | null = null;
            let quotedTweetAuthorHandle: string | null = null;
            let quotedTweetAuthorName: string | null = null;

            if (quotedId && refTweetsMap.has(quotedId)) {
              const quotedTw = refTweetsMap.get(quotedId);
              quotedTweetContent = quotedTw.text || null;
              const quotedAuthor = quotedTw.author_id ? authorMap.get(quotedTw.author_id) : null;
              if (quotedAuthor) {
                quotedTweetAuthorHandle = quotedAuthor.username;
                quotedTweetAuthorName = quotedAuthor.name || quotedAuthor.username;
              }
            }

            const mediaUrls: string[] = [];
            if (tw.attachments?.media_keys) {
              for (const key of tw.attachments.media_keys) {
                const m = mediaMap.get(key);
                if (m) mediaUrls.push(m.url || m.preview_image_url || "");
              }
            }
            if (quotedId && refTweetsMap.has(quotedId)) {
              const quotedTw = refTweetsMap.get(quotedId);
              if (quotedTw.attachments?.media_keys) {
                for (const key of quotedTw.attachments.media_keys) {
                  const m = mediaMap.get(key);
                  if (m && !mediaUrls.includes(m.url || m.preview_image_url || "")) {
                    mediaUrls.push(m.url || m.preview_image_url || "");
                  }
                }
              }
            }

            const existing = await storage.getTweetNoteByTweetId(tw.id);
            if (existing) {
              const updates: any = {};
              if (existing.authorHandle !== authorHandle && authorHandle !== "unknown" && authorHandle !== username) {
                updates.authorHandle = authorHandle;
                updates.authorName = authorName;
                updates.tweetUrl = tweetUrl;
              }
              if (quotedTweetContent && !existing.quotedTweetContent) {
                updates.quotedTweetContent = quotedTweetContent;
                updates.quotedTweetAuthorHandle = quotedTweetAuthorHandle;
                updates.quotedTweetAuthorName = quotedTweetAuthorName;
                updates.quotedTweetId = quotedId;
              }
              if (mediaUrls.length > 0 && (!existing.mediaUrls || existing.mediaUrls.length === 0)) {
                updates.mediaUrls = mediaUrls;
              }
              if (Object.keys(updates).length > 0) {
                await storage.updateTweetNote(existing.id, updates);
              }
              skipped++;
              continue;
            }

            const tags: string[] = [];
            if (tw.entities?.hashtags) {
              for (const ht of tw.entities.hashtags) tags.push(`#${ht.tag}`);
            }
            const links: string[] = [];
            if (tw.entities?.urls) {
              for (const url of tw.entities.urls) links.push(url.expanded_url);
            }

            const replyToId = tw.referenced_tweets?.find((r: any) => r.type === "replied_to")?.id;

            await storage.createTweetNote({
              tweetId: tw.id,
              conversationId: tw.conversation_id || tw.id,
              tweetUrl,
              authorHandle,
              authorName,
              createdAt: tw.created_at,
              content: tw.text,
              tags,
              threadPosition: null,
              quotedTweetId: quotedId,
              inReplyToTweetId: replyToId || null,
              links,
              source: isRetweet ? "retweet" : "public",
              quotedTweetContent,
              quotedTweetAuthorHandle,
              quotedTweetAuthorName,
              mediaUrls,
            });
            imported++;
          }
          return { imported, skipped };
        };

        if (syncTypes.includes("tweets")) {
          const { tweets, authors, refTweets, media } = await fetchUserTweets(bearerToken, userId);
          const result = await importTweets(tweets, authors, refTweets, media);
          totalImported += result.imported;
          totalSkipped += result.skipped;
          totalFetched += tweets.length;
        }

        await storage.updateSyncLog(syncLog.id, {
          status: "success",
          tweetsProcessed: totalImported,
          completedAt: new Date(),
        });

        res.json({ imported: totalImported, skipped: totalSkipped, total: totalFetched, types: syncTypes });
      } catch (err: any) {
        await storage.updateSyncLog(syncLog.id, {
          status: "error",
          errorMessage: err.message,
          completedAt: new Date(),
        });
        throw err;
      }
    } catch (err: any) {
      console.error("Public sync error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sync/bookmarks", async (_req, res) => {
    try {
      if (!isOAuthConnected()) {
        return res.status(401).json({ message: "X account not authorized. Please connect via OAuth first." });
      }

      const syncLog = await storage.createSyncLog({ status: "running", tweetsProcessed: 0 });

      try {
        const { tweets: bookmarks, authors, refTweets, media } = await fetchBookmarks();

        let imported = 0;
        let skipped = 0;
        let updated = 0;

        for (const bm of bookmarks) {
          const author = authors.get(bm.author_id);
          const authorHandle = author?.username || "unknown";
          const authorName = author?.name || authorHandle;

          const quotedRef = bm.referenced_tweets?.find(r => r.type === "quoted");
          const replyToId = bm.referenced_tweets?.find(r => r.type === "replied_to")?.id;
          const quotedId = quotedRef?.id || null;

          let quotedTweetContent: string | null = null;
          let quotedTweetAuthorHandle: string | null = null;
          let quotedTweetAuthorName: string | null = null;

          if (quotedId && refTweets.has(quotedId)) {
            const quotedTw = refTweets.get(quotedId);
            quotedTweetContent = quotedTw.text || null;
            const quotedAuthor = quotedTw.author_id ? authors.get(quotedTw.author_id) : null;
            if (quotedAuthor) {
              quotedTweetAuthorHandle = quotedAuthor.username;
              quotedTweetAuthorName = quotedAuthor.name || quotedAuthor.username;
            }
          }

          const mediaUrls: string[] = [];
          if (bm.attachments?.media_keys) {
            for (const key of bm.attachments.media_keys) {
              const m = media.get(key);
              if (m) {
                mediaUrls.push(m.url || m.preview_image_url || "");
              }
            }
          }
          if (quotedId && refTweets.has(quotedId)) {
            const quotedTw = refTweets.get(quotedId);
            if (quotedTw.attachments?.media_keys) {
              for (const key of quotedTw.attachments.media_keys) {
                const m = media.get(key);
                if (m && !mediaUrls.includes(m.url || m.preview_image_url || "")) {
                  mediaUrls.push(m.url || m.preview_image_url || "");
                }
              }
            }
          }

          const existing = await storage.getTweetNoteByTweetId(bm.id);
          if (existing) {
            const updates: any = {};
            if (existing.authorHandle !== authorHandle && authorHandle !== "unknown") {
              updates.authorHandle = authorHandle;
              updates.authorName = authorName;
              updates.tweetUrl = `https://x.com/${authorHandle}/status/${bm.id}`;
            }
            if (existing.source !== "bookmark") {
              updates.source = "bookmark";
            }
            if (quotedTweetContent && !existing.quotedTweetContent) {
              updates.quotedTweetContent = quotedTweetContent;
              updates.quotedTweetAuthorHandle = quotedTweetAuthorHandle;
              updates.quotedTweetAuthorName = quotedTweetAuthorName;
              updates.quotedTweetId = quotedId;
            }
            if (mediaUrls.length > 0 && (!existing.mediaUrls || existing.mediaUrls.length === 0)) {
              updates.mediaUrls = mediaUrls;
            }
            if (Object.keys(updates).length > 0) {
              await storage.updateTweetNote(existing.id, updates);
              updated++;
            }
            skipped++;
            continue;
          }

          const tags: string[] = [];
          if (bm.entities?.hashtags) {
            for (const ht of bm.entities.hashtags) {
              tags.push(`#${ht.tag}`);
            }
          }

          const links: string[] = [];
          if (bm.entities?.urls) {
            for (const url of bm.entities.urls) {
              links.push(url.expanded_url);
            }
          }

          await storage.createTweetNote({
            tweetId: bm.id,
            conversationId: bm.conversation_id || bm.id,
            tweetUrl: `https://x.com/${authorHandle}/status/${bm.id}`,
            authorHandle,
            authorName,
            createdAt: bm.created_at,
            content: bm.text,
            tags,
            threadPosition: null,
            quotedTweetId: quotedId,
            inReplyToTweetId: replyToId || null,
            links,
            source: "bookmark",
            quotedTweetContent,
            quotedTweetAuthorHandle,
            quotedTweetAuthorName,
            mediaUrls,
          });
          imported++;
        }

        await storage.updateSyncLog(syncLog.id, {
          status: "success",
          tweetsProcessed: imported,
          completedAt: new Date(),
        });

        res.json({ imported, skipped, updated, total: bookmarks.length });
      } catch (err: any) {
        await storage.updateSyncLog(syncLog.id, {
          status: "error",
          errorMessage: err.message,
          completedAt: new Date(),
        });
        throw err;
      }
    } catch (err: any) {
      console.error("Bookmark sync error:", err);
      res.status(500).json({ message: err.message });
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

  // ─── GitHub Integration ────────────────────────────────────

  app.get("/api/github/status", async (_req, res) => {
    try {
      const octokit = await getUncachableGitHubClient();
      const { data: user } = await octokit.users.getAuthenticated();
      res.json({ connected: true, username: user.login, avatar: user.avatar_url });
    } catch (err: any) {
      res.json({ connected: false, message: err.message });
    }
  });

  app.post("/api/github/push", async (req, res) => {
    try {
      const { owner, repo, folder } = req.body;
      if (!owner || !repo) {
        return res.status(400).json({ message: "Owner and repo are required." });
      }
      if (folder && (/\.\./.test(folder) || folder.startsWith("/") || folder.startsWith("\\"))) {
        return res.status(400).json({ message: "Invalid folder path." });
      }
      const tweets = await storage.getAllTweetNotes();
      if (tweets.length === 0) {
        return res.status(404).json({ message: "No notes to push." });
      }
      const s = await storage.getSettings();
      const files = tweets.map(t => generateMarkdown(t, s.filenameTemplate));
      const result = await pushFilesToGitHub(owner, repo, files, folder || "");
      res.json(result);
    } catch (err: any) {
      console.error("GitHub push error:", err);
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
