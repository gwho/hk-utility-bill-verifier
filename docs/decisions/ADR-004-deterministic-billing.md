# ADR-004: Deterministic Billing Math (No ML/Inference in Core Engine)

**Date:** 2025-03-17
**Status:** Accepted

## Context

The billing comparison engine must decide: "Did the landlord charge the correct amount?" This could be approached two ways:

1. **Inferential**: Use statistical models or LLMs to predict the "likely correct" charge.
2. **Deterministic**: Use the published tariff schedules (CLP/HK Electric rate tiers) and the official usage reading to compute the exact correct charge arithmetically.

## Decision

The billing engine is **deterministic**. It computes the expected charge using exact arithmetic (Python `Decimal`) from the published rate schedule and the extracted usage reading. No inference, no prediction, no probability.

## Consequences

**Good:**
- The output is reproducible. Two runs with the same inputs produce identical outputs — essential for court use.
- The explanation for every discrepancy is a precise statement: "At 287.4 kWh, tier 1 covers 0–100 kWh at $0.87 = $87.00, tier 2 covers 100–300 kWh at $1.00 = $187.40. Expected subtotal: $274.40. Landlord charged $312.00. Overcharge: $37.60."
- No need for training data or model maintenance.
- Beginner-friendly: the engine is just arithmetic with a loop over rate tiers.

**Bad:**
- Requires up-to-date rate schedule data. Rate changes (CLP typically revises annually) must be manually updated.
- Cannot handle utility types for which no published rate schedule exists.

**Mitigations:**
- Rate schedules stored in the database with an effective-date range — the engine selects the schedule in effect for the billing period.
- Regulation research module (Stage 6) monitors published rate changes.

## Tutorial Note

This is a deliberate choice to trade flexibility for correctness. "Approximately right" is not good enough when money or legal action is involved. A deterministic engine is also much easier to test — you write a unit test for each rate tier boundary and you know exactly what the output should be.
