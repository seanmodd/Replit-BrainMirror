import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tweetNotes = pgTable("tweet_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tweetId: text("tweet_id").notNull().unique(),
  conversationId: text("conversation_id").notNull(),
  tweetUrl: text("tweet_url").notNull(),
  authorHandle: text("author_handle").notNull(),
  authorName: text("author_name").notNull(),
  createdAt: text("created_at").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  threadPosition: text("thread_position"),
  quotedTweetId: text("quoted_tweet_id"),
  inReplyToTweetId: text("in_reply_to_tweet_id"),
  links: text("links").array().notNull().default(sql`'{}'::text[]`),
  source: text("source").notNull().default("manual"),
  quotedTweetContent: text("quoted_tweet_content"),
  quotedTweetAuthorHandle: text("quoted_tweet_author_handle"),
  quotedTweetAuthorName: text("quoted_tweet_author_name"),
  mediaUrls: text("media_urls").array().notNull().default(sql`'{}'::text[]`),
  authorProfileImageUrl: text("author_profile_image_url"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const insertTweetNoteSchema = createInsertSchema(tweetNotes).omit({
  id: true,
  syncedAt: true,
});

export type InsertTweetNote = z.infer<typeof insertTweetNoteSchema>;
export type TweetNote = typeof tweetNotes.$inferSelect;

export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull(),
  tweetsProcessed: integer("tweets_processed").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  startedAt: true,
});

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`'default'`),
  vaultPath: text("vault_path").notNull().default("~/Documents/Obsidian/SecondBrain/Twitter"),
  pollInterval: integer("poll_interval").notNull().default(10),
  filenameTemplate: text("filename_template").notNull().default("Twitter - {author_handle} - {content_trunc_40} ({date})"),
  generateAuthorHubs: boolean("generate_author_hubs").notNull().default(true),
  generateDashboard: boolean("generate_dashboard").notNull().default(true),
  githubRepo: text("github_repo").notNull().default("seanmodd/brainmirror"),
  githubFolder: text("github_folder").notNull().default(""),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
