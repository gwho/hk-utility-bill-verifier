"""initial_schema_six_tables

Revision ID: 7228fab9d799
Revises:
Create Date: 2026-03-17 11:27:06.995630

Creates the six core tables for the HK Utility Bill Verifier:
  1. documents           — uploaded document metadata + pipeline status
  2. extracted_bills     — structured OCR output from official bills
  3. landlord_sheets     — structured OCR output from landlord charge sheets
  4. corrections         — append-only audit log of user field corrections (ADR-005)
  5. comparison_runs     — tracks a comparison job (pending→running→done)
  6. discrepancy_reports — final output of a completed comparison

WHY explicit migration instead of relying solely on create_all():
  create_all() creates tables once but cannot version them or produce diffs.
  Alembic migrations give us a numbered history so we can:
    - Roll back a bad change (alembic downgrade -1)
    - Apply incremental schema changes in CI/CD
    - Know exactly what revision the current DB is at (alembic current)
  This is Revision 7228fab9d799 — the first migration (down_revision=None).

To apply: cd python-backend && alembic upgrade head
To roll back: cd python-backend && alembic downgrade -1
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


revision: str = "7228fab9d799"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all six tables for Stage 1.

    WHY UUID primary keys: UUIDs are globally unique, safe to generate
    client-side (no need to query DB for next ID), and prevent sequential
    enumeration of resources in URLs.

    WHY JSON columns for extraction_json / report_json:
    The full FieldWithSource-wrapped domain objects are complex nested
    structures. Storing them as JSON lets us preserve the full provenance
    metadata (bbox, confidence, raw_text) without needing a table per field.
    The summary scalar columns (usage_kwh, total_billed, etc.) exist for
    fast SQL queries without parsing JSON.
    """

    # ------------------------------------------------------------------
    # 1. documents — every uploaded file
    # ------------------------------------------------------------------
    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_type", sa.String(32), nullable=False),
        sa.Column("utility_type", sa.String(32), nullable=True),
        sa.Column("original_filename", sa.String(512), nullable=True),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_documents_status", "documents", ["status"])
    op.create_index("ix_documents_document_type", "documents", ["document_type"])

    # ------------------------------------------------------------------
    # 2. extracted_bills — OCR output from official utility bills
    # ------------------------------------------------------------------
    op.create_table(
        "extracted_bills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("documents.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("utility_type", sa.String(32), nullable=True),
        sa.Column("billing_period_start", sa.DateTime(), nullable=True),
        sa.Column("billing_period_end", sa.DateTime(), nullable=True),
        sa.Column("usage_kwh", sa.Float(), nullable=True),
        sa.Column("total_billed", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(8), nullable=False, server_default="HKD"),
        sa.Column("extraction_json", JSON(), nullable=True),
        sa.Column("ocr_confidence_avg", sa.Float(), nullable=True),
        sa.Column("extracted_at", sa.DateTime(), nullable=False),
    )

    # ------------------------------------------------------------------
    # 3. landlord_sheets — OCR output from landlord charge sheets
    # ------------------------------------------------------------------
    op.create_table(
        "landlord_sheets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("documents.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("utility_type", sa.String(32), nullable=True),
        sa.Column("billing_period_start", sa.DateTime(), nullable=True),
        sa.Column("billing_period_end", sa.DateTime(), nullable=True),
        sa.Column("tenant_unit", sa.String(256), nullable=True),
        sa.Column("total_charged", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(8), nullable=False, server_default="HKD"),
        sa.Column("extraction_json", JSON(), nullable=True),
        sa.Column("ocr_confidence_avg", sa.Float(), nullable=True),
        sa.Column("extracted_at", sa.DateTime(), nullable=False),
    )

    # ------------------------------------------------------------------
    # 4. corrections — APPEND-ONLY audit log (ADR-005)
    # WHY no ON DELETE CASCADE: Corrections must outlive their document
    # for evidentiary purposes. Deleting a document does NOT erase history.
    # ------------------------------------------------------------------
    op.create_table(
        "corrections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("documents.id"),
            nullable=False,
        ),
        sa.Column("field_path", sa.String(512), nullable=False),
        sa.Column("old_value", JSON(), nullable=True),
        sa.Column("new_value", JSON(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("corrected_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_corrections_document_id", "corrections", ["document_id"])
    op.create_index("ix_corrections_field_path", "corrections", ["field_path"])

    # ------------------------------------------------------------------
    # 5. comparison_runs — tracks one comparison job
    # ------------------------------------------------------------------
    op.create_table(
        "comparison_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "official_bill_doc_id",
            UUID(as_uuid=True),
            sa.ForeignKey("documents.id"),
            nullable=False,
        ),
        sa.Column(
            "landlord_sheet_doc_id",
            UUID(as_uuid=True),
            sa.ForeignKey("documents.id"),
            nullable=False,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_comparison_runs_status", "comparison_runs", ["status"])

    # ------------------------------------------------------------------
    # 6. discrepancy_reports — output of a completed comparison
    # ------------------------------------------------------------------
    op.create_table(
        "discrepancy_reports",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "comparison_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("comparison_runs.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("total_overcharge", sa.Numeric(12, 2), nullable=True),
        sa.Column("total_undercharge", sa.Numeric(12, 2), nullable=True),
        sa.Column("flag_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("report_json", JSON(), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    """Drop all six tables in reverse dependency order.

    WHY reverse order: Foreign key constraints prevent dropping a referenced
    table before the table that references it. Drop child tables first.
    """
    op.drop_table("discrepancy_reports")
    op.drop_index("ix_comparison_runs_status", "comparison_runs")
    op.drop_table("comparison_runs")
    op.drop_index("ix_corrections_field_path", "corrections")
    op.drop_index("ix_corrections_document_id", "corrections")
    op.drop_table("corrections")
    op.drop_table("landlord_sheets")
    op.drop_table("extracted_bills")
    op.drop_index("ix_documents_document_type", "documents")
    op.drop_index("ix_documents_status", "documents")
    op.drop_table("documents")
