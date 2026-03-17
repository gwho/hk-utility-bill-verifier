# ADR-005: Append-Only Corrections Table (Never UPDATE)

**Date:** 2025-03-17
**Status:** Accepted

## Context

When a user corrects an OCR-extracted value (e.g., the meter reading was misread as 287.4 but should be 278.4), we need to update the stored value. The naive approach is `UPDATE extracted_bills SET meter_reading_end = 278.4 WHERE id = ...`.

However: if this bill is later used in a dispute, the landlord's solicitor could ask "how do we know this number wasn't changed?" If we have only the final value, we cannot prove the history.

## Decision

Corrections are stored in an **append-only `corrections` table**. The original extracted value is never mutated. Each correction row contains:

- `document_id`: which document was corrected
- `field_path`: which field (e.g. `"meter_reading_end.value"`)
- `old_value`: the value before this correction (JSON)
- `new_value`: the corrected value (JSON)
- `note`: the user's reason for correcting
- `created_at`: timestamp

When reading a document's extracted data, the system applies corrections in chronological order on top of the original OCR output. This is analogous to event sourcing.

**The `corrections` table has NO `UPDATE` or `DELETE` routes in the API.** Period.

## Consequences

**Good:**
- Complete audit trail: "This value was originally read as X, corrected to Y on date Z with note N."
- If a user makes an error in their correction, they create a new correction (another append), not an overwrite.
- The original OCR output is always preserved — useful for diagnosing systematic OCR errors.
- Legally defensible: the chain of custody for every value is provable.

**Bad:**
- Reading the current value of a field requires replaying corrections. More complex than a simple SELECT.
- More storage (all correction history kept forever).
- Must enforce the no-UPDATE rule at the API layer — database constraints alone cannot prevent it.

**Mitigations:**
- Apply corrections in a utility function (`apply_corrections(extracted_bill, corrections)`) so the complexity is encapsulated.
- Integration tests verify that the API endpoints for corrections only do INSERTs.

## Tutorial Note

This pattern is called **event sourcing** in software architecture. Instead of storing the current state, you store the events that led to it. The current state is always derived by replaying events. Git is a famous example: you don't store "the current version of the file" — you store the commits that produced it.
