"""
FILE: models/db_models.py
ROLE: SQLAlchemy ORM table definitions — these map Python classes to
      PostgreSQL tables. Run create_all() on startup to create tables.
WHY: Separate from domain.py (Pydantic) because the ORM layer deals with
     persistence concerns (foreign keys, indexes, timestamps) while
     domain.py deals with business logic shapes.

TABLE OVERVIEW:
  documents           — every uploaded image file (official bill or landlord sheet)
  extracted_bills     — structured data extracted from official bill documents
  landlord_sheets     — structured data extracted from landlord charge sheets
  corrections         — IMMUTABLE log of user corrections to extracted fields
  comparison_runs     — tracks a comparison job from trigger to completion
  discrepancy_reports — the output of a completed comparison

WHY immutable corrections: The corrections table only has INSERT, never UPDATE.
Each correction is a new row. This gives a full audit trail — you can always
see every value a field has ever had and who changed it. This is essential
for evidentiary use (e.g. presenting to a tribunal).
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer,
    String, Text, Numeric, Enum as SAEnum, JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from core.database import Base


def now_utc():
    return datetime.utcnow()


class Document(Base):
    """
    Represents one uploaded document (image/PDF).
    status tracks the extraction pipeline state.
    """
    __tablename__ = "documents"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_type = Column(
        String(32), nullable=False
    )  # "official_bill" | "landlord_sheet"
    utility_type = Column(String(32), nullable=True)  # "electricity" | "water" | "gas"
    original_filename = Column(String(512), nullable=True)
    storage_path = Column(String(1024), nullable=False)  # path on disk
    page_count = Column(Integer, nullable=True)
    status = Column(String(32), nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=now_utc)
    updated_at = Column(DateTime, nullable=False, default=now_utc, onupdate=now_utc)

    # Relationships
    extracted_bill = relationship(
        "ExtractedBill", back_populates="document", uselist=False
    )
    landlord_sheet = relationship(
        "LandlordSheet", back_populates="document", uselist=False
    )
    corrections = relationship("Correction", back_populates="document")


class ExtractedBill(Base):
    """
    Structured data extracted from an official utility bill.
    extraction_json stores the full OfficialBill Pydantic model as JSON.
    WHY JSON column: Preserves the full FieldWithSource structure (nested objects)
    without needing a table per field. The billing engine reads from this JSON.
    """
    __tablename__ = "extracted_bills"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        PGUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, unique=True
    )
    utility_type = Column(String(32), nullable=True)
    billing_period_start = Column(DateTime, nullable=True)
    billing_period_end = Column(DateTime, nullable=True)
    # Summary fields for quick querying
    usage_kwh = Column(Float, nullable=True)
    total_billed = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(8), nullable=False, default="HKD")
    # Full structured extraction (OfficialBill JSON)
    extraction_json = Column(JSON, nullable=True)
    ocr_confidence_avg = Column(Float, nullable=True)
    extracted_at = Column(DateTime, nullable=False, default=now_utc)

    document = relationship("Document", back_populates="extracted_bill")


class LandlordSheet(Base):
    """
    Structured data extracted from a landlord charge sheet.
    """
    __tablename__ = "landlord_sheets"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        PGUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, unique=True
    )
    utility_type = Column(String(32), nullable=True)
    billing_period_start = Column(DateTime, nullable=True)
    billing_period_end = Column(DateTime, nullable=True)
    tenant_unit = Column(String(256), nullable=True)
    total_charged = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(8), nullable=False, default="HKD")
    extraction_json = Column(JSON, nullable=True)
    ocr_confidence_avg = Column(Float, nullable=True)
    extracted_at = Column(DateTime, nullable=False, default=now_utc)

    document = relationship("Document", back_populates="landlord_sheet")


class Correction(Base):
    """
    APPEND-ONLY table. Every user correction is a new row — never an UPDATE.

    WHY immutable: If a user later claims the landlord's bill was $500 not $450,
    we must show EVERY value this field has ever had, with timestamps. You
    cannot prove a chain of custody if records can be modified in place.

    field_path uses dot notation: e.g. "meter_reading_start.value"
    """
    __tablename__ = "corrections"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        PGUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False
    )
    field_path = Column(String(512), nullable=False)
    old_value = Column(JSON, nullable=True)   # value before this correction
    new_value = Column(JSON, nullable=False)  # value after this correction
    note = Column(Text, nullable=True)
    corrected_at = Column(DateTime, nullable=False, default=now_utc)
    # WHY no user_id: no auth in MVP. Will be added when Replit Auth is integrated.

    document = relationship("Document", back_populates="corrections")


class ComparisonRun(Base):
    """
    Tracks one comparison job: which official bill vs which landlord sheet,
    and what the job status is.
    """
    __tablename__ = "comparison_runs"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    official_bill_doc_id = Column(
        PGUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False
    )
    landlord_sheet_doc_id = Column(
        PGUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False
    )
    status = Column(String(32), nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=now_utc)

    report = relationship(
        "DiscrepancyReport", back_populates="comparison_run", uselist=False
    )


class DiscrepancyReport(Base):
    """
    The stored output of a completed comparison run.
    report_json stores the full DiscrepancyReport Pydantic model.
    """
    __tablename__ = "discrepancy_reports"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comparison_run_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("comparison_runs.id"),
        nullable=False,
        unique=True,
    )
    total_overcharge = Column(Numeric(12, 2), nullable=True)
    total_undercharge = Column(Numeric(12, 2), nullable=True)
    flag_count = Column(Integer, nullable=False, default=0)
    confidence = Column(Float, nullable=True)
    report_json = Column(JSON, nullable=True)
    generated_at = Column(DateTime, nullable=False, default=now_utc)

    comparison_run = relationship("ComparisonRun", back_populates="report")
