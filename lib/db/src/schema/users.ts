import { pgTable, serial, varchar, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // "recepcao" or "mesa"
  deskId: integer("desk_id"),           // null for recepcao
  deskNumber: integer("desk_number"),   // null for recepcao
  sector: varchar("sector", { length: 50 }), // null for recepcao
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
