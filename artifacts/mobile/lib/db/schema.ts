/**
 * FILE: lib/db/schema.ts
 * ROLE: Local SQLite persistence schema — the Expo equivalent of SwiftData models.
 * WHY: SwiftData is Apple-native Swift only and cannot be used from Expo/React Native.
 *      expo-sqlite with a typed schema layer is the direct Expo equivalent, providing:
 *      - Type-safe table definitions (mirroring SwiftData @Model classes)
 *      - Local-first persistence that works fully offline
 *      - Migration versioning (analogous to SwiftData's schema migration plan)
 *
 * ARCHITECTURE NOTE (ADR-001 reference):
 * The architecture moved from native SwiftUI (which would use SwiftData) to
 * Expo/React Native (which uses expo-sqlite). The local schema serves the same
 * purpose: caching verified server data for offline viewing and reducing API calls.
 *
 * WHAT IS STORED LOCALLY vs SERVER-SIDE:
 * - LOCAL (this schema): Document summaries, report summaries, cached regulation snippets.
 *   These are read-heavy, read offline, and do NOT need append-only audit log behaviour.
 * - SERVER SIDE (PostgreSQL via Python backend): Full extracted_bills, corrections,
 *   comparison_runs, discrepancy_reports. These need audit trail guarantees.
 *
 * TUTORIAL CONCEPT — Local-first architecture:
 * A local-first app stores data on-device first and syncs to the server.
 * This means the app works without a network connection. The server is the
 * source of truth; the local DB is a cache. Changes to server data (e.g.
 * a new comparison report) are reflected locally via a sync/poll.
 *
 * WHY NOT AsyncStorage or MMKV?
 * AsyncStorage is key-value only — no relational queries. MMKV is fast KV
 * storage, not a database. expo-sqlite supports full SQL queries, which we
 * need to filter documents by status and join summaries.
 */

/**
 * LOCAL_DB_VERSION — increment this when the schema changes.
 * The migration function switches on this version number.
 * WHY explicit versioning: expo-sqlite does not have built-in migration
 * support. We manage it ourselves with a db_version table.
 */
export const LOCAL_DB_VERSION = 1;
export const LOCAL_DB_NAME = "hk_bill_verifier.db";

/**
 * CREATE TABLE SQL statements — these are the local schema definitions.
 *
 * Naming: local tables are prefixed with "local_" to distinguish them from
 * the server-side PostgreSQL tables in python-backend/models/db_models.py.
 * This prevents confusion when reading code that references both.
 *
 * TUTORIAL COMPARISON — SwiftData equivalent:
 *
 *   SwiftData:
 *   @Model class DocumentSummary {
 *     @Attribute(.unique) var id: String
 *     var documentType: String
 *     var status: String
 *     ...
 *   }
 *
 *   expo-sqlite equivalent:
 *   CREATE TABLE local_document_summaries (
 *     id TEXT PRIMARY KEY,
 *     document_type TEXT NOT NULL,
 *     status TEXT NOT NULL,
 *     ...
 *   )
 */
export const CREATE_TABLES_SQL = [
  /**
   * local_document_summaries — lightweight cache of documents list.
   * Full extracted data lives on the server. This table drives the Bills tab list.
   */
  `CREATE TABLE IF NOT EXISTS local_document_summaries (
    id TEXT PRIMARY KEY,
    document_type TEXT NOT NULL,
    utility_type TEXT,
    original_filename TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    uploaded_at TEXT NOT NULL,
    total_amount TEXT,
    billing_period_start TEXT,
    billing_period_end TEXT,
    currency TEXT NOT NULL DEFAULT 'HKD',
    synced_at TEXT NOT NULL
  )`,

  /**
   * local_report_summaries — cached discrepancy report list.
   * Full report JSON lives on the server. This drives the Reports tab list.
   */
  `CREATE TABLE IF NOT EXISTS local_report_summaries (
    id TEXT PRIMARY KEY,
    comparison_run_id TEXT NOT NULL,
    official_bill_doc_id TEXT NOT NULL,
    landlord_sheet_doc_id TEXT NOT NULL,
    total_overcharge TEXT NOT NULL DEFAULT '0',
    total_undercharge TEXT NOT NULL DEFAULT '0',
    flag_count INTEGER NOT NULL DEFAULT 0,
    confidence REAL,
    generated_at TEXT NOT NULL,
    synced_at TEXT NOT NULL
  )`,

  /**
   * local_regulation_cache — cached regulation search results.
   * WHY cache regulations locally: HK government sites are slow and sometimes
   * unreliable. Users should be able to read saved regulation excerpts offline.
   * Cache expires after 48 hours (ADR-007).
   */
  `CREATE TABLE IF NOT EXISTS local_regulation_cache (
    id TEXT PRIMARY KEY,
    query_hash TEXT NOT NULL,
    utility_type TEXT,
    source_agency TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    source_url TEXT,
    cached_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,

  /**
   * local_db_version — tracks schema version for migration management.
   * WHY this table: SQLite's user_version pragma exists but is less visible.
   * An explicit table makes the version inspectable with a normal SELECT.
   */
  `CREATE TABLE IF NOT EXISTS local_db_version (
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL
  )`,
] as const;

/** Index SQL for query performance */
export const CREATE_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS ix_local_doc_summaries_status
     ON local_document_summaries (status)`,
  `CREATE INDEX IF NOT EXISTS ix_local_doc_summaries_type
     ON local_document_summaries (document_type)`,
  `CREATE INDEX IF NOT EXISTS ix_local_regulation_query_hash
     ON local_regulation_cache (query_hash)`,
  `CREATE INDEX IF NOT EXISTS ix_local_regulation_expires
     ON local_regulation_cache (expires_at)`,
] as const;

// ---------------------------------------------------------------------------
// TypeScript row types — match the SQL column definitions above.
// These are the local equivalents of SwiftData @Model types.
// ---------------------------------------------------------------------------

/** Local cache of a document summary (drives Bills tab list). */
export interface LocalDocumentSummaryRow {
  id: string;
  document_type: "official_bill" | "landlord_sheet";
  utility_type: "electricity" | "water" | "gas" | null;
  original_filename: string | null;
  status: "pending" | "extracting" | "review_needed" | "done" | "failed";
  uploaded_at: string;           // ISO datetime string
  total_amount: string | null;   // Decimal as string
  billing_period_start: string | null;
  billing_period_end: string | null;
  currency: string;
  synced_at: string;             // ISO datetime when cached from server
}

/** Local cache of a report summary (drives Reports tab list). */
export interface LocalReportSummaryRow {
  id: string;
  comparison_run_id: string;
  official_bill_doc_id: string;
  landlord_sheet_doc_id: string;
  total_overcharge: string;   // Decimal as string
  total_undercharge: string;  // Decimal as string
  flag_count: number;
  confidence: number | null;
  generated_at: string;
  synced_at: string;
}

/** Cached regulation search result. Expires after 48h. */
export interface LocalRegulationCacheRow {
  id: string;
  query_hash: string;
  utility_type: "electricity" | "water" | "gas" | null;
  source_agency: string;   // "EMSD" | "WSD" | "Lands Tribunal" | "Consumer Council"
  title: string;
  excerpt: string;
  source_url: string | null;
  cached_at: string;
  expires_at: string;
}

/** Schema version record. */
export interface LocalDbVersionRow {
  version: number;
  applied_at: string;
}
