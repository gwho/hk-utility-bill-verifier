/**
 * FILE: lib/db/src/schema/index.ts
 * ROLE: Drizzle ORM schema definitions for the Node.js/Express side of the database.
 * WHY: The Express API server uses Drizzle ORM for any tables it manages directly
 *      (e.g. sessions, preferences). The Python backend uses SQLAlchemy for the
 *      core domain tables (documents, extracted_bills, etc.) — see python-backend/models/db_models.py.
 *
 * ARCHITECTURE NOTE (ADR-002 reference):
 * We have two ORM layers pointing at the same PostgreSQL database:
 *   - Node.js Drizzle: owns session/preferences tables (future Stage 3+)
 *   - Python SQLAlchemy: owns documents, extracted_bills, landlord_sheets,
 *     corrections, comparison_runs, discrepancy_reports
 *
 * This file will be populated with Node.js-specific tables as they are needed.
 * For now it exports an empty object (no Node.js-owned tables in Stage 1).
 *
 * TUTORIAL CONCEPT — Why two ORMs?
 * Each service owns its data. The Python backend is the authoritative source
 * for all document processing and billing domain tables. The Node.js server
 * would own session/auth tables if auth were added. This is the same principle
 * as microservices: each service has its own schema and does not share ORM
 * models with other services.
 */

// No Node.js-owned tables yet. Populated in Stage 3 (user corrections UI)
// if server-side session management is added.
//
// Template for future tables:
//
//   import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const userPreferencesTable = pgTable("user_preferences", {
//     id: serial("id").primaryKey(),
//     device_id: text("device_id").notNull().unique(),
//     theme: text("theme").notNull().default("dark"),
//     created_at: timestamp("created_at").defaultNow().notNull(),
//   });
//
//   export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable).omit({ id: true });
//   export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
//   export type UserPreferences = typeof userPreferencesTable.$inferSelect;

export {};
