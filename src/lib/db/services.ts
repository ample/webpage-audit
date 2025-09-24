import { eq, sql, and, desc } from 'drizzle-orm';
import { getDb } from './connection';
import { testResults, aiInsights, a11yReports, userSessions } from './schema';
import type {
  InsertTestResult,
  InsertAiInsight,
  InsertA11yReport,
  InsertUserSession,
  TestResult,
  UserSession
} from './schema';
import type { Metrics } from '@/pages/api/check-status';

// Default TTL for cached data (7 days in seconds)
const DEFAULT_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '604800', 10);

// Helper to calculate expiration timestamp
function getExpiresAt(ttlSeconds: number = DEFAULT_TTL_SECONDS): Date {
  return new Date(Date.now() + ttlSeconds * 1000);
}

// Helper to generate URL hash for A11y reports
function urlHash(url: string): string {
  return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);
}

// Test Results Service
export const testResultsService = {
  async create(data: {
    testId: string;
    url: string;
    title?: string;
    phase: string;
    statusText?: string;
    summaryUrl?: string;
    jsonUrl?: string;
    metrics?: Metrics;
    error?: string;
  }) {
    const db = getDb();
    const insertData: InsertTestResult = {
      ...data,
      runAt: new Date(),
    };

    const [result] = await db.insert(testResults).values(insertData).returning();
    return result;
  },

  async update(testId: string, data: Partial<{
    phase: string;
    statusText?: string;
    metrics?: Metrics;
    error?: string;
    title?: string;
    summaryUrl?: string;
    jsonUrl?: string;
  }>) {
    const db = getDb();
    const [result] = await db
      .update(testResults)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(testResults.testId, testId))
      .returning();
    return result;
  },

  async findById(testId: string): Promise<TestResult | null> {
    const db = getDb();
    const [result] = await db
      .select()
      .from(testResults)
      .where(eq(testResults.testId, testId));
    return result || null;
  },

  async findByUrl(url: string, limit = 10) {
    const db = getDb();
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.url, url))
      .orderBy(desc(testResults.runAt))
      .limit(limit);
  },
};

// AI Insights Service
export const aiInsightsService = {
  async set(testId: string, suggestions: string[], ttlSeconds = DEFAULT_TTL_SECONDS) {
    const db = getDb();
    const data: InsertAiInsight = {
      id: testId,
      testId,
      suggestions,
      expiresAt: getExpiresAt(ttlSeconds),
    };

    // Use upsert (insert or update if exists)
    const [result] = await db
      .insert(aiInsights)
      .values(data)
      .onConflictDoUpdate({
        target: aiInsights.id,
        set: {
          suggestions: sql`excluded.suggestions`,
          expiresAt: sql`excluded.expires_at`,
        },
      })
      .returning();

    return result;
  },

  async get(testId: string): Promise<string[] | null> {
    const db = getDb();
    const [result] = await db
      .select()
      .from(aiInsights)
      .where(and(
        eq(aiInsights.id, testId),
        sql`${aiInsights.expiresAt} > NOW()`
      ));

    if (!result) return null;
    return result.suggestions as string[];
  },

  async cleanup() {
    const db = getDb();
    await db.delete(aiInsights).where(sql`${aiInsights.expiresAt} <= NOW()`);
  },
};

// A11y Reports Service
export const a11yReportsService = {
  async set(url: string, report: unknown, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const db = getDb();
    const id = urlHash(url);
    const data: InsertA11yReport = {
      id,
      url,
      report,
      expiresAt: getExpiresAt(ttlSeconds),
    };

    const [result] = await db
      .insert(a11yReports)
      .values(data)
      .onConflictDoUpdate({
        target: a11yReports.id,
        set: {
          report: sql`excluded.report`,
          expiresAt: sql`excluded.expires_at`,
        },
      })
      .returning();

    return result;
  },

  async get(url: string) {
    const db = getDb();
    const id = urlHash(url);
    const [result] = await db
      .select()
      .from(a11yReports)
      .where(and(
        eq(a11yReports.id, id),
        sql`${a11yReports.expiresAt} > NOW()`
      ));

    return result?.report || null;
  },

  async cleanup() {
    const db = getDb();
    await db.delete(a11yReports).where(sql`${a11yReports.expiresAt} <= NOW()`);
  },
};

// User Sessions Service (replaces localStorage)
export const userSessionsService = {
  async getOrCreate(sessionId: string): Promise<UserSession> {
    const db = getDb();

    // Try to get existing session
    const [existing] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, sessionId));

    if (existing) {
      // Update last access
      const [updated] = await db
        .update(userSessions)
        .set({ lastAccessAt: new Date() })
        .where(eq(userSessions.sessionId, sessionId))
        .returning();
      return updated;
    }

    // Create new session
    const data: InsertUserSession = {
      sessionId,
      recentTests: [],
      aiPreferences: {},
    };

    const [created] = await db
      .insert(userSessions)
      .values(data)
      .returning();

    return created;
  },

  async addRecentTest(sessionId: string, testData: {
    testId: string;
    url?: string;
    title?: string;
    runAt?: string;
  }) {
    const db = getDb();
    const session = await this.getOrCreate(sessionId);

    const recentTests = (session.recentTests as unknown[]) || [];
    const updated = [
      testData,
      ...recentTests.filter((t: unknown) =>
        typeof t === 'object' && t !== null && 'testId' in t &&
        (t as { testId: string }).testId !== testData.testId
      )
    ].slice(0, 6); // Keep only 6 most recent

    await db
      .update(userSessions)
      .set({
        recentTests: updated,
        updatedAt: new Date(),
        lastAccessAt: new Date(),
      })
      .where(eq(userSessions.sessionId, sessionId));
  },

  async getRecentTests(sessionId: string) {
    const session = await this.getOrCreate(sessionId);
    return (session.recentTests as unknown[]) || [];
  },

  async setAiPreference(sessionId: string, testId: string, useAi: boolean) {
    const db = getDb();
    const session = await this.getOrCreate(sessionId);

    const aiPreferences = (session.aiPreferences as Record<string, boolean>) || {};
    aiPreferences[testId] = useAi;

    await db
      .update(userSessions)
      .set({
        aiPreferences,
        updatedAt: new Date(),
        lastAccessAt: new Date(),
      })
      .where(eq(userSessions.sessionId, sessionId));
  },

  async getAiPreference(sessionId: string, testId: string): Promise<boolean | null> {
    const session = await this.getOrCreate(sessionId);
    const aiPreferences = (session.aiPreferences as Record<string, boolean>) || {};
    return aiPreferences[testId] ?? null;
  },

  async cleanup(daysOld = 30) {
    const db = getDb();
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    await db
      .delete(userSessions)
      .where(sql`${userSessions.lastAccessAt} < ${cutoff}`);
  },
};

// Cleanup service to run periodically
export const cleanupService = {
  async runAll() {
    await Promise.allSettled([
      aiInsightsService.cleanup(),
      a11yReportsService.cleanup(),
      userSessionsService.cleanup(),
    ]);
  },
};