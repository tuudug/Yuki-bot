import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").unique().notNull(),
  discordUsername: text("discord_username"),
  gdAccountId: integer("gd_account_id"),
  gdUsername: text("gd_username"),
  authToken: text("auth_token").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  levelId: integer("level_id").notNull(),
  percentage: integer("percentage").notNull(),
  attempts: integer("attempts"),
  passed: boolean("passed").notNull(),
  isPractice: boolean("is_practice").default(false),
  coins: jsonb("coins").$type<boolean[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const levelCache = pgTable("level_cache", {
  levelId: integer("level_id").primaryKey(),
  name: text("name").notNull(),
  creator: text("creator"),
  description: text("description"),
  difficulty: text("difficulty"),
  stars: integer("stars"),
  isDemon: boolean("is_demon"),
  demonDifficulty: text("demon_difficulty"),
  songName: text("song_name"),
  songAuthor: text("song_author"),
  duration: integer("duration"),
  downloads: integer("downloads"),
  likes: integer("likes"),
  cachedAt: timestamp("cached_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
export type LevelCache = typeof levelCache.$inferSelect;
export type NewLevelCache = typeof levelCache.$inferInsert;
