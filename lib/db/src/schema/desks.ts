import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const desksTable = pgTable("desks", {
  id: serial("id").primaryKey(),
  deskNumber: integer("desk_number").notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  sector: varchar("sector", { length: 50 }).notNull(), // "protocolo" or "divida_ativa"
  status: varchar("status", { length: 20 }).notNull().default("occupied"), // "free" or "occupied"
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Desk = typeof desksTable.$inferSelect;
export type InsertDesk = typeof desksTable.$inferInsert;
