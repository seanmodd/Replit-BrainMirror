import { eq, desc, sql, ilike, or } from "drizzle-orm";
import { db } from "./db";
import {
  tweetNotes, insertTweetNoteSchema, type InsertTweetNote, type TweetNote,
  syncLogs, type InsertSyncLog, type SyncLog,
  settings, type InsertSettings, type Settings,
} from "@shared/schema";

export interface IStorage {
  // Tweet Notes
  getAllTweetNotes(): Promise<TweetNote[]>;
  getTweetNote(id: string): Promise<TweetNote | undefined>;
  getTweetNoteByTweetId(tweetId: string): Promise<TweetNote | undefined>;
  searchTweetNotes(query: string): Promise<TweetNote[]>;
  filterTweetNotesByTag(tag: string): Promise<TweetNote[]>;
  createTweetNote(note: InsertTweetNote): Promise<TweetNote>;
  deleteTweetNote(id: string): Promise<void>;
  getTweetNoteCount(): Promise<number>;
  getUniqueTags(): Promise<string[]>;
  getUniqueAuthors(): Promise<{ handle: string; name: string; count: number }[]>;

  // Sync Logs
  getRecentSyncLogs(limit?: number): Promise<SyncLog[]>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  updateSyncLog(id: string, updates: Partial<SyncLog>): Promise<SyncLog | undefined>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: InsertSettings): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // Tweet Notes
  async getAllTweetNotes(): Promise<TweetNote[]> {
    return db.select().from(tweetNotes).orderBy(desc(tweetNotes.syncedAt));
  }

  async getTweetNote(id: string): Promise<TweetNote | undefined> {
    const [note] = await db.select().from(tweetNotes).where(eq(tweetNotes.id, id));
    return note;
  }

  async getTweetNoteByTweetId(tweetId: string): Promise<TweetNote | undefined> {
    const [note] = await db.select().from(tweetNotes).where(eq(tweetNotes.tweetId, tweetId));
    return note;
  }

  async searchTweetNotes(query: string): Promise<TweetNote[]> {
    return db.select().from(tweetNotes).where(
      or(
        ilike(tweetNotes.content, `%${query}%`),
        ilike(tweetNotes.authorHandle, `%${query}%`),
        ilike(tweetNotes.authorName, `%${query}%`)
      )
    ).orderBy(desc(tweetNotes.syncedAt));
  }

  async filterTweetNotesByTag(tag: string): Promise<TweetNote[]> {
    return db.select().from(tweetNotes).where(
      sql`${tag} = ANY(${tweetNotes.tags})`
    ).orderBy(desc(tweetNotes.syncedAt));
  }

  async createTweetNote(note: InsertTweetNote): Promise<TweetNote> {
    const [created] = await db.insert(tweetNotes).values(note).returning();
    return created;
  }

  async deleteTweetNote(id: string): Promise<void> {
    await db.delete(tweetNotes).where(eq(tweetNotes.id, id));
  }

  async getTweetNoteCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(tweetNotes);
    return Number(result.count);
  }

  async getUniqueTags(): Promise<string[]> {
    const result = await db.select({ tag: sql<string>`unnest(${tweetNotes.tags})` }).from(tweetNotes);
    return [...new Set(result.map(r => r.tag))].filter(t => t.startsWith('#'));
  }

  async getUniqueAuthors(): Promise<{ handle: string; name: string; count: number }[]> {
    const result = await db
      .select({
        handle: tweetNotes.authorHandle,
        name: tweetNotes.authorName,
        count: sql<number>`count(*)`,
      })
      .from(tweetNotes)
      .groupBy(tweetNotes.authorHandle, tweetNotes.authorName)
      .orderBy(desc(sql`count(*)`));
    return result.map(r => ({ ...r, count: Number(r.count) }));
  }

  // Sync Logs
  async getRecentSyncLogs(limit = 10): Promise<SyncLog[]> {
    return db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(limit);
  }

  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const [created] = await db.insert(syncLogs).values(log).returning();
    return created;
  }

  async updateSyncLog(id: string, updates: Partial<SyncLog>): Promise<SyncLog | undefined> {
    const [updated] = await db.update(syncLogs).set(updates).where(eq(syncLogs.id, id)).returning();
    return updated;
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const [existing] = await db.select().from(settings).where(eq(settings.id, "default"));
    if (existing) return existing;
    const [created] = await db.insert(settings).values({ id: "default" } as any).returning();
    return created;
  }

  async updateSettings(updates: InsertSettings): Promise<Settings> {
    const [updated] = await db
      .insert(settings)
      .values({ ...updates, id: "default" } as any)
      .onConflictDoUpdate({
        target: settings.id,
        set: updates,
      })
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
