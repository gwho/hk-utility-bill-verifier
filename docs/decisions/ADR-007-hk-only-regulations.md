# ADR-007: Hong Kong Only for Regulation Research (MVP)

**Date:** 2025-03-17
**Status:** Accepted

## Context

Should the regulation research module support multiple jurisdictions (Singapore, UK, Australia, etc.) or be HK-only?

## Decision

**HK only** for MVP. The regulation search is hard-coded to Hong Kong sources:
- EMSD (Electrical and Mechanical Services Department)
- WSD (Water Supplies Department)
- Lands Tribunal / Department of Justice (Cap. 7)
- Consumer Council HK

No jurisdiction picker. No multi-region data.

## Consequences

**Good:**
- Curated, verified sources → high accuracy. A generic multi-jurisdiction system would surface wrong information for a HK user.
- The billing engine's rate schedule data is HK-specific (CLP, HK Electric, Towngas, WSD) — the regulation module should match.
- Simpler code: no jurisdiction routing, no locale-specific parsing rules.
- The tutorial is coherent: it's a HK utility verifier, not a generic multi-country system.

**Bad:**
- Zero reuse for users outside HK.
- If the project is forked for another jurisdiction, the HK-specific code must be extracted and abstracted.

**Mitigations:**
- Regulation sources are defined as a typed list of `RegulationSource` objects, making it straightforward to add more sources later without changing the fetch/parse/cache logic.
- The API parameter `jurisdiction` is accepted but defaults to and validates as `"hk"` — the scaffolding for future expansion is there.

## Tutorial Note

The lesson here is "do one thing well" — the Unix philosophy applied to features. A HK utility verifier that works accurately for HK is infinitely more valuable than a global utility verifier that works unreliably everywhere. Scope constraints produce focused, high-quality tools.
