// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const supportMessages = sqliteTable("support_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  direction: text("direction").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(),
  telegramId: integer("telegram_id"),
  createdAt: integer("created_at").notNull(),
}, table => [index("support_user_time").on(table.userId, table.createdAt)]);
