# ADR-002: Python/FastAPI Backend for OCR and Billing Logic

**Date:** 2025-03-17
**Status:** Accepted

## Context

The app needs:
1. OCR extraction from scanned utility bills (PDFs and images)
2. Billing math: CLP/HK Electric block-rate calculations
3. Regulation research: fetching and summarising HK government documents

The project already has a Node.js/Express API server (the gateway).

## Options Considered

**Option A: Keep everything in Node.js**
- Pro: One language, one deployment unit.
- Con: OCR libraries (Tesseract, PaddleOCR, cloud APIs) have significantly better Python bindings. The Python scientific ecosystem (Decimal math, PDF processing with PyMuPDF, httpx for async fetching) is mature and well-documented for this use case.

**Option B: Python/FastAPI as a second service, proxied through Express**
- Pro: Python is the dominant language for OCR, PDF processing, and ML pipelines. Pydantic v2 gives fast, validated domain models. FastAPI auto-generates OpenAPI docs browsable at /docs.
- Con: Two services to manage; requires a proxy.

## Decision

Use **Python/FastAPI** as a dedicated backend service for all document processing, billing computation, and regulation research. The Express server acts as a proxy (`/api/py/*` → `http://localhost:8000`) and as the gateway for any future auth/session concerns.

## Consequences

**Good:**
- Python's OCR ecosystem (pytesseract, easyocr, google-cloud-vision) is unmatched.
- Pydantic v2 validated models are faster than manual JSON validation.
- FastAPI's interactive docs (`/docs`) make the API self-documenting — invaluable for tutorial readers.
- Billing math in Python uses Python's `Decimal` type which has exact precision — critical for financial calculations. JavaScript's `number` type would introduce floating point errors.

**Bad:**
- Two services means two health checks, two workflow configurations, two deployment units.
- Type synchronisation: TypeScript types on the iOS side must be kept in sync with Pydantic models on the Python side manually until OpenAPI codegen is added.

**Mitigations:**
- Express proxy transparently routes `/api/py/*` to Python. The iOS app sees one base URL.
- Plan to add OpenAPI codegen (Stage 5) to auto-generate TypeScript types from Python schemas.

## Tutorial Note

The proxy pattern (`Express → Python`) is a fundamental microservice pattern. Even a "two service" system is simpler than it sounds: the iOS app only ever talks to Express, and Express decides where to send each request. This is the same pattern used by large-scale backend systems.
