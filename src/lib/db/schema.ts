// Database schema for Webpage Audit
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// Test results table - stores WebPageTest results and metadata
export const testResults = pgTable('test_results', {
  testId: text('test_id').primaryKey(),
  url: text('url').notNull(),
  title: text('title'),
  runAt: timestamp('run_at', { withTimezone: true }).notNull(),
  phase: text('phase').notNull(), // 'queued', 'running', 'finished', 'error'
  statusText: text('status_text'),
  summaryUrl: text('summary_url'),
  jsonUrl: text('json_url'),

  // WebPageTest metrics as JSON
  metrics: jsonb('metrics'),

  // Error information
  error: text('error'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  urlIdx: index('test_results_url_idx').on(table.url),
  runAtIdx: index('test_results_run_at_idx').on(table.runAt),
  phaseIdx: index('test_results_phase_idx').on(table.phase),
}));

// AI insights cache - stores AI-generated suggestions with TTL
export const aiInsights = pgTable('ai_insights', {
  id: text('id').primaryKey(), // format: testId
  testId: text('test_id').notNull().references(() => testResults.testId, { onDelete: 'cascade' }),
  suggestions: jsonb('suggestions').notNull(), // Array of suggestion strings

  // Timestamps for TTL management
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  testIdIdx: index('ai_insights_test_id_idx').on(table.testId),
  expiresAtIdx: index('ai_insights_expires_at_idx').on(table.expiresAt),
}));

// Accessibility scan results
export const a11yReports = pgTable('a11y_reports', {
  id: text('id').primaryKey(), // format: hash of URL
  url: text('url').notNull(),
  report: jsonb('report').notNull(), // Full A11yReport object

  // Timestamps for TTL management
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  urlIdx: index('a11y_reports_url_idx').on(table.url),
  expiresAtIdx: index('a11y_reports_expires_at_idx').on(table.expiresAt),
}));

// User sessions/preferences (replaces localStorage for user-specific data)
export const userSessions = pgTable('user_sessions', {
  sessionId: text('session_id').primaryKey(), // client-generated UUID or browser fingerprint

  // Recent tests viewed by this session
  recentTests: jsonb('recent_tests').default([]), // Array of {testId, url, title, runAt}

  // AI preference selections per test
  aiPreferences: jsonb('ai_preferences').default({}), // {testId: boolean}

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastAccessAt: timestamp('last_access_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  lastAccessIdx: index('user_sessions_last_access_idx').on(table.lastAccessAt),
}));

// Export types for TypeScript
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = typeof aiInsights.$inferInsert;

export type A11yReport = typeof a11yReports.$inferSelect;
export type InsertA11yReport = typeof a11yReports.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;