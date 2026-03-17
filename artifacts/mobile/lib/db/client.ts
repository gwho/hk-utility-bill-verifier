/**
 * FILE: lib/db/client.ts
 * ROLE: expo-sqlite database client — opens the DB, runs migrations, exports
 *       typed accessor functions.
 * WHY: Centralises all SQLite access so screens never write raw SQL.
 *      This is analogous to SwiftData's ModelContainer — a single configured
 *      container passed to all views via React context.
 *
 * USAGE:
 *   import { getDb } from "@/lib/db/client";
 *   const db = await getDb();
 *   const rows = await db.getAllAsync<LocalDocumentSummaryRow>(
 *     "SELECT * FROM local_document_summaries WHERE status = ?", ["done"]
 *   );
 *
 * WHY singleton pattern: Opening a SQLite connection is expensive. We open
 * once per app lifecycle and reuse the same connection. React Native's
 * architecture means this is safe — all JS runs on one thread.
 */

import * as SQLite from "expo-sqlite";
import {
  CREATE_INDEXES_SQL,
  CREATE_TABLES_SQL,
  LOCAL_DB_NAME,
  LOCAL_DB_VERSION,
  type LocalDbVersionRow,
} from "./schema";

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * getDb — returns the singleton database connection, initialising it on
 * first call by running CREATE TABLE / migration statements.
 *
 * WHY async: expo-sqlite's openDatabaseAsync is async. All DB calls in
 * Expo/RN should be async to avoid blocking the JS thread (which would
 * cause UI jank).
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync(LOCAL_DB_NAME);

  await initializeSchema(_db);
  return _db;
}

/**
 * initializeSchema — creates tables and indexes if they don't exist,
 * then runs any needed version migrations.
 *
 * WHY CREATE TABLE IF NOT EXISTS: Idempotent — safe to call on every
 * startup. Only creates tables that are missing.
 */
async function initializeSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL;");

  await db.withTransactionAsync(async () => {
    for (const sql of CREATE_TABLES_SQL) {
      await db.execAsync(sql);
    }
    for (const sql of CREATE_INDEXES_SQL) {
      await db.execAsync(sql);
    }
  });

  await runMigrations(db);
}

/**
 * runMigrations — checks the stored DB version and applies any pending
 * schema changes.
 *
 * TUTORIAL CONCEPT — Schema migrations:
 * When you ship a new version of the app with a changed SQLite schema
 * (e.g. added a column), existing installs have the old schema. Migrations
 * let you upgrade the existing data without wiping the database.
 *
 * This is analogous to SwiftData's SchemaMigrationPlan:
 *   enum V1toV2: SchemaMigrationPlan { ... }
 *
 * Here we use a version integer and a switch statement.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<LocalDbVersionRow>(
    "SELECT version FROM local_db_version ORDER BY version DESC LIMIT 1"
  );
  const currentVersion = rows[0]?.version ?? 0;

  if (currentVersion >= LOCAL_DB_VERSION) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (let v = currentVersion + 1; v <= LOCAL_DB_VERSION; v++) {
      await applyMigration(db, v);
    }
    await db.runAsync(
      "INSERT INTO local_db_version (version, applied_at) VALUES (?, ?)",
      [LOCAL_DB_VERSION, new Date().toISOString()]
    );
  });
}

/**
 * applyMigration — applies the schema change for a specific version.
 * Add new cases here when the schema changes in future stages.
 */
async function applyMigration(
  db: SQLite.SQLiteDatabase,
  version: number
): Promise<void> {
  switch (version) {
    case 1:
      // Version 1 is the initial schema — tables created above by CREATE TABLE IF NOT EXISTS.
      // No additional migration SQL needed for v1.
      break;
    // case 2:
    //   await db.execAsync("ALTER TABLE local_document_summaries ADD COLUMN notes TEXT");
    //   break;
    default:
      throw new Error(`Unknown migration version: ${version}`);
  }
}

/**
 * clearLocalCache — deletes all synced data from local tables.
 * Used for testing and "reset app" functionality.
 * Does NOT delete the schema itself.
 */
export async function clearLocalCache(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM local_regulation_cache");
    await db.execAsync("DELETE FROM local_report_summaries");
    await db.execAsync("DELETE FROM local_document_summaries");
  });
}
