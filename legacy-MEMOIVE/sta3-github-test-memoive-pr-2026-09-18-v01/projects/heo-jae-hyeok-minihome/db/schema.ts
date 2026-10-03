import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const guestbookEntries = sqliteTable(
  'guestbook_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nickname: text('nickname').notNull(),
    message: text('message').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_guestbook_created_at_id').on(table.createdAt, table.id),
  ],
);

export const diaryEntries = sqliteTable(
  'diary_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    imageKey: text('image_key'),
    imageType: text('image_type'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_diary_created_at_id').on(table.createdAt, table.id)],
);

export const adminCredentials = sqliteTable('admin_credentials', {
  id: integer('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const adminLoginAttempts = sqliteTable('admin_login_attempts', {
  clientKey: text('client_key').primaryKey(),
  failedCount: integer('failed_count').notNull(),
  windowStartedAt: integer('window_started_at').notNull(),
});

export const siteSettings = sqliteTable('site_settings', {
  id: integer('id').primaryKey(),
  interestTitle: text('interest_title').notNull(),
  interestTags: text('interest_tags').notNull(),
  youtubeUrl: text('youtube_url').notNull().default(''),
  updatedAt: integer('updated_at').notNull(),
});

export const dailyVisitors = sqliteTable(
  'daily_visitors',
  {
    dateKey: text('date_key').notNull(),
    visitorKey: text('visitor_key').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.dateKey, table.visitorKey] }),
    index('idx_daily_visitors_date_key').on(table.dateKey),
  ],
);
