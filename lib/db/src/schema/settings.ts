import { pgTable, integer, timestamp } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  reminderMinutes: integer("reminder_minutes").notNull().default(10),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppSettings = typeof settingsTable.$inferSelect;
