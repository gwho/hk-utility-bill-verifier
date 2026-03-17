# ADR-003: FieldWithSource Provenance Wrapper for All Extracted Values

**Date:** 2025-03-17
**Status:** Accepted

## Context

The core function of this app is to detect discrepancies between official utility bills and landlord charge sheets. If a discrepancy is found, the user may need to present evidence — in a Consumer Council complaint, to a Lands Tribunal, or in negotiation with the landlord.

A bare number like "287.4 kWh" in a database is not evidence. A number with "I extracted this from page 2 of CLP_Bill_Jan2025.pdf, bounding box (120, 340, 250, 365), OCR confidence 94%, and the user confirmed it" IS evidence.

## Decision

Every value extracted from a scanned document is wrapped in **`FieldWithSource<T>`**:

```python
class FieldWithSource(BaseModel, Generic[T]):
    value: T                        # The actual value
    raw_text: str                   # Exact OCR output string
    page: int                       # 0-indexed page number
    bbox: Optional[BoundingBox]     # Pixel bounding box
    confidence: float               # 0.0–1.0 OCR confidence
    corrected_by_user: bool         # True if human overrode OCR
    correction_note: str            # User's explanation
```

This means `OfficialBill.usage` is not a `float` — it is a `FieldWithSource[float]`.

## Consequences

**Good:**
- Every discrepancy flag carries `evidence_refs` pointing back to exact `FieldWithSource` instances — giving the user "tap to see the original field" functionality.
- User corrections are tracked with a note, creating an audit trail.
- Low-confidence fields (< 0.7) can be auto-flagged for mandatory human review.
- The iOS app can draw a highlight overlay on the document image at the exact `bbox` position.

**Bad:**
- Every domain model is more verbose — `total_billed: FieldWithSource[Decimal]` instead of `total_billed: Decimal`.
- More data to store and transmit.
- Generic types (`FieldWithSource<T>`) require careful handling in TypeScript and Python.

**Mitigations:**
- Pydantic's Generic model support handles this cleanly in Python.
- TypeScript's generic interface `FieldWithSource<T>` mirrors the Python model exactly.
- The verbosity is a feature, not a bug — it forces developers to think about provenance at every step.

## Tutorial Note

This pattern is analogous to academic citation. In a research paper, every claim cites its source. In this app, every number cites its source. The pattern is called "provenance tracking" in data lineage systems. This is the most important design decision in the entire project.
