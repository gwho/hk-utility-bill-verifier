"""
FILE: models/domain.py
ROLE: Canonical domain model for the Utility Bill Verifier.
      Every business entity in the system is defined here.
WHY: A single authoritative model file makes it easy for a beginner
     to understand the whole data model in one place. The iOS app has
     a TypeScript mirror of these models (see artifacts/mobile/types/domain.ts)
     and a local SQLite schema (see artifacts/mobile/lib/db/schema.ts).

ARCHITECTURE DECISION (ADR-003 reference): Every extracted value is wrapped
in FieldWithSource. This means we never store a bare float or string that came
from OCR — we always store WHERE it came from (page, bbox, confidence). This is
what makes the app's evidence usable in a dispute.

WHY Pydantic v2: FastAPI uses Pydantic for request/response serialisation.
Pydantic v2 is significantly faster than v1 and has stricter type checking
that catches bugs earlier. The `model_config` dict replaces the v1 `Config` class.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Generic, List, Optional, TypeVar
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, ConfigDict

# ---------------------------------------------------------------------------
# Generic value wrapper — the heart of the provenance system
# ---------------------------------------------------------------------------

T = TypeVar("T")


class BoundingBox(BaseModel):
    """
    Pixel-level bounding box for an extracted field on a document page.
    WHY: Storing the bbox lets the iOS app draw a highlight box on the
    original document image so the user can see exactly which number was read.
    """
    x: float
    y: float
    width: float
    height: float


class FieldWithSource(BaseModel, Generic[T]):
    """
    Wraps any extracted value with its provenance metadata.

    TUTORIAL CONCEPT: Think of this as a citation in an academic paper.
    A bare number like 287.4 kWh means nothing without knowing it came from
    page 2, top-right corner, read with 94% confidence.

    Fields:
    - value:              The actual extracted value (number, string, date, etc.)
    - raw_text:           The exact OCR string before parsing (e.g. "287.4 kWh")
    - page:               0-indexed page number in the source document
    - bbox:               Pixel bounding box (may be None if OCR doesn't support it)
    - confidence:         OCR confidence 0.0–1.0 (< 0.7 = red, < 0.85 = amber)
    - corrected_by_user:  True if the user overrode the OCR value
    - correction_note:    The user's explanation for the correction
    """
    value: T
    raw_text: str = ""
    page: int = 0
    bbox: Optional[BoundingBox] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    corrected_by_user: bool = False
    correction_note: str = ""


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class UtilityType(str, Enum):
    ELECTRICITY = "electricity"
    WATER = "water"
    GAS = "gas"


class DocumentType(str, Enum):
    OFFICIAL_BILL = "official_bill"
    LANDLORD_SHEET = "landlord_sheet"


class DocumentStatus(str, Enum):
    """
    State machine for a document from upload to extraction-complete.
    WHY state machine: The iOS app uses this to drive its UI transitions
    (upload bar → spinning spinner → review screen) without any guessing.
    """
    PENDING = "pending"
    EXTRACTING = "extracting"
    REVIEW_NEEDED = "review_needed"
    DONE = "done"
    FAILED = "failed"


class AllocationMethodType(str, Enum):
    """
    Methods a landlord can use to split a shared utility bill.
    TUTORIAL: In HK multi-unit buildings the utility is often on one meter.
    The landlord must allocate the total cost somehow — these are the options.
    """
    EQUAL_SPLIT = "equal_split"
    FLOOR_AREA = "floor_area"
    OCCUPANCY = "occupancy"
    SUB_METER = "sub_meter"
    UNKNOWN = "unknown"


class DiscrepancyFlagType(str, Enum):
    OVERCHARGE = "overcharge"
    UNDERCHARGE = "undercharge"
    WRONG_RATE = "wrong_rate"
    USAGE_MISMATCH = "usage_mismatch"
    MISSING_LINE_ITEM = "missing_line_item"
    PERIOD_MISMATCH = "period_mismatch"


class FlagSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ComparisonStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# Core domain models
# ---------------------------------------------------------------------------

class DateRange(BaseModel):
    start: date
    end: date

    @property
    def days(self) -> int:
        return (self.end - self.start).days + 1


class RateTier(BaseModel):
    """
    A single pricing tier in a block rate schedule.
    Example: 0–100 kWh at $0.87, next 200 kWh at $1.00, above 300 kWh at $1.20.
    WHY: HK utilities (CLP, HK Electric) use block rates. The allocation
    engine needs the full tier schedule to reproduce the landlord's math.
    """
    unit_min: float
    unit_max: Optional[float] = None    # None = unlimited (last tier)
    rate: FieldWithSource[Decimal]
    description: str = ""


class OfficialBill(BaseModel):
    """
    A single official utility bill from CLP, HK Electric, or WSD.
    All numeric fields use FieldWithSource so they carry OCR provenance.
    """
    id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    utility_type: UtilityType
    billing_period: DateRange
    meter_reading_start: FieldWithSource[float]
    meter_reading_end: FieldWithSource[float]
    usage: FieldWithSource[float]
    rate_tiers: List[RateTier] = Field(default_factory=list)
    supply_charge: Optional[FieldWithSource[Decimal]] = None
    fuel_adjustment: Optional[FieldWithSource[Decimal]] = None
    gst_rate: float = 0.0             # WHY: HK does NOT have GST on electricity
    total_billed: FieldWithSource[Decimal]
    currency: str = "HKD"


class LandlordLineItem(BaseModel):
    """One line on the landlord's charge sheet (e.g. 'Electricity Jan 2025')."""
    description: FieldWithSource[str]
    amount: FieldWithSource[Decimal]
    period: Optional[DateRange] = None
    unit_count: Optional[FieldWithSource[float]] = None


class LandlordChargeSheet(BaseModel):
    """The landlord's billing document for a given period and unit."""
    id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    billing_period: DateRange
    tenant_unit: str
    utility_type: UtilityType
    charges: List[LandlordLineItem] = Field(default_factory=list)
    total_charged: FieldWithSource[Decimal]
    currency: str = "HKD"


class AllocationMethod(BaseModel):
    """
    How the landlord split the shared bill across tenants.
    reconstructed=True means the engine INFERRED the method from the numbers —
    the landlord did not state it explicitly. This is common in HK.
    """
    method: AllocationMethodType
    parameters: dict = Field(default_factory=dict)
    reconstructed: bool = False
    reconstruction_confidence: float = 1.0
    notes: str = ""


class EvidenceRef(BaseModel):
    """Points back to the exact field on an exact page of a document."""
    document_id: UUID
    field_path: str      # e.g. "meter_reading_start.value"
    page: int
    bbox: Optional[BoundingBox] = None
    excerpt: str = ""    # short quoted text for context


class DiscrepancyFlag(BaseModel):
    """
    A single detected problem in the landlord's billing.
    Every flag carries evidence_refs so the user can tap to see the
    exact document page where the discrepancy originates.
    """
    flag_type: DiscrepancyFlagType
    severity: FlagSeverity
    official_value: Any
    landlord_value: Any
    delta: Decimal
    delta_currency: str = "HKD"
    explanation: str
    evidence_refs: List[EvidenceRef] = Field(default_factory=list)


class DiscrepancyReport(BaseModel):
    """
    The output of one comparison run.
    TUTORIAL: This is what the app user reads. It answers the question:
    'Did my landlord charge me correctly, and if not, by how much?'
    """
    id: UUID = Field(default_factory=uuid4)
    official_bill_id: UUID
    landlord_sheet_id: UUID
    allocation_method: AllocationMethod
    flags: List[DiscrepancyFlag] = Field(default_factory=list)
    total_overcharge: Decimal = Decimal("0")
    total_undercharge: Decimal = Decimal("0")
    net_discrepancy: Decimal = Decimal("0")  # positive = landlord overcharged
    confidence: float = 1.0
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# API response / request models
# ---------------------------------------------------------------------------

class DocumentUploadResponse(BaseModel):
    document_id: UUID
    status: DocumentStatus
    message: str = ""


class DocumentStatusResponse(BaseModel):
    document_id: UUID
    status: DocumentStatus
    extracted_bill: Optional[OfficialBill] = None
    extracted_sheet: Optional[LandlordChargeSheet] = None
    error_message: Optional[str] = None


class CorrectionPayload(BaseModel):
    field_path: str
    new_value: Any
    note: str = ""


class HealthResponse(BaseModel):
    status: str
    service: str = "utility-bill-verifier-python-backend"
    version: str = "0.1.0"
