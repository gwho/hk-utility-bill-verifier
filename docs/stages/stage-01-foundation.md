# Stage 1: iOS App Foundation + Backend Scaffold

**Status:** Complete
**Date:** 2025-03-17

## Objective

Stand up the full project skeleton so every subsequent stage has a solid foundation to build on. By the end of Stage 1, all of the following exist and are running:

- 5-tab Expo mobile app with correct screen structure
- Python/FastAPI backend with domain models and database schema
- Express proxy connecting the iOS app to the Python backend
- PostgreSQL database with Alembic migrations configured
- Tutorial documentation (ADRs, stage docs, error journal)

## What Was Built

### Mobile App (`artifacts/mobile/`)

| File | Role |
|------|------|
| `app/_layout.tsx` | Root layout — fonts, safe area, providers |
| `app/(tabs)/_layout.tsx` | 5-tab navigation: NativeTabs (iOS 26+) or BlurView classic |
| `app/(tabs)/index.tsx` | Dashboard tab: stat cards, HK context banner, empty state |
| `app/(tabs)/bills.tsx` | Bills tab: document list, filter chips, scan/import CTA |
| `app/(tabs)/reports.tsx` | Reports tab: comparison results, workflow guide empty state |
| `app/(tabs)/regulations.tsx` | HK Rules tab: search bar, EMSD/WSD/Lands Tribunal source cards |
| `app/(tabs)/learn.tsx` | Learn tab: expandable tutorial sections, ADR quick-reference |
| `constants/colors.ts` | Design tokens — dark navy palette, flag colours, light mode |
| `types/domain.ts` | TypeScript mirror of Python Pydantic domain models |

### Python Backend (`python-backend/`)

| File | Role |
|------|------|
| `main.py` | FastAPI app, CORS, lifespan (creates tables on startup) |
| `models/domain.py` | Pydantic domain models: `FieldWithSource<T>`, `OfficialBill`, `LandlordChargeSheet`, `DiscrepancyReport`, all enums |
| `models/db_models.py` | SQLAlchemy ORM: 6 tables (documents, extracted_bills, landlord_sheets, corrections, comparison_runs, discrepancy_reports) |
| `core/database.py` | SQLAlchemy engine + `get_db` dependency |
| `routers/health.py` | `GET /healthz` — pings DB and returns `{"status":"ok"}` |
| `alembic/` | Alembic migration environment + initial migration for all 6 tables |

### API Server (`artifacts/api-server/`)

| File | Role |
|------|------|
| `src/app.ts` | Express app: CORS, `/api/py/*` proxy to Python, body parsers, routes |

### Documentation (`docs/`)

| File | Content |
|------|---------|
| `docs/decisions/ADR-001-expo-over-swiftui.md` | Why Expo not SwiftUI |
| `docs/decisions/ADR-002-python-backend.md` | Why Python not all-Node.js |
| `docs/decisions/ADR-003-field-with-source.md` | The provenance wrapper pattern |
| `docs/decisions/ADR-004-deterministic-billing.md` | No ML in billing engine |
| `docs/decisions/ADR-005-append-only-corrections.md` | Event sourcing for audit trail |
| `docs/decisions/ADR-006-polling-not-websockets.md` | Why polling for OCR status |
| `docs/decisions/ADR-007-hk-only-regulations.md` | HK-only scope |
| `docs/stages/stage-01-foundation.md` | This file |
| `docs/errors/journal.md` | Error log for all bugs encountered during development |

## Architecture

```
iOS App (Expo, port $PORT_expo)
    ↓ HTTP (all calls go to Express)
Express API Server (:8080)
    ├── GET /api/healthz        → Node.js health route
    └── /api/py/*               → proxy → Python FastAPI (:8000)
                                     ├── GET /healthz
                                     └── (future: /documents, /comparisons, /regulations)
    ↓
PostgreSQL (DATABASE_URL)
    ├── documents
    ├── extracted_bills
    ├── landlord_sheets
    ├── corrections          ← append-only, never UPDATE
    ├── comparison_runs
    └── discrepancy_reports
```

## Key Implementation Notes

### Proxy Registration Order (Critical)
`http-proxy-middleware` for `/api/py` MUST be mounted in Express BEFORE `express.json()` and `express.urlencoded()`. If body parsers run first, they consume the request stream and multipart file uploads cannot be forwarded to Python.

### Pydantic v2 Import Fix
**ERROR ENCOUNTERED:** `ImportError: cannot import name 'model_config' from 'pydantic'`
**CAUSE:** `model_config` is not a direct import in Pydantic v2 — it is accessed as `ConfigDict`.
**FIX:** Change `from pydantic import BaseModel, Field, model_config` to `from pydantic import BaseModel, Field, ConfigDict`.
See also: `docs/errors/journal.md` entry #001.

### Alembic Configuration
`DATABASE_URL` is injected into Alembic via `config.set_main_option()` in `env.py` so that the secret never appears in `alembic.ini`. The initial migration (`alembic/versions/*_initial_schema_six_tables.py`) creates all 6 tables.

To apply migrations: `cd python-backend && alembic upgrade head`
To create a new migration after schema changes: `alembic revision --autogenerate -m "description"`

### iOS 26+ Liquid Glass Tab Bar
`isLiquidGlassAvailable()` from `expo-glass-effect` is checked at runtime. If true, `NativeTabs` from `expo-router/unstable-native-tabs` is used. Otherwise, the classic `Tabs` with `BlurView` background is used. Both branches register the same 5 routes so navigation works identically.

## Running the Stage 1 Stack

1. **Python backend**: `Python Backend` workflow → `cd python-backend && python main.py`
2. **Express server**: `artifacts/api-server: API Server` workflow → auto-starts
3. **Mobile app**: `artifacts/mobile: expo` workflow → auto-starts; open Expo Go to scan QR

**Health verification:**
```bash
curl http://localhost:8000/healthz          # Python direct
curl http://localhost:8080/api/py/healthz   # Through Express proxy
```

Both should return: `{"status":"ok","service":"utility-bill-verifier-python-backend","version":"0.1.0"}`

## On SwiftData (Why It Was Not Used)

The original project architecture sketch referenced SwiftData for local persistence. However, the architecture decision (ADR-001) moved the mobile client to Expo/React Native for broader tutorial accessibility.

**SwiftData is iOS-native Swift-only** — it cannot be used from Expo/React Native JavaScript. The equivalent in the Expo ecosystem is `expo-sqlite` (SQLite) or backend API persistence.

For Stage 1, the app uses no local persistence — all data is server-side in PostgreSQL (managed by Python/SQLAlchemy). When offline caching is added in Stage 5/6, `expo-sqlite` will be used to mirror the relevant API responses for offline viewing. This is documented in the types file (`artifacts/mobile/types/domain.ts`) where the domain types mirror the Python models.

## What Stage 2 Will Build

- iOS camera + photo library document import
- Backend document upload endpoint (`POST /api/py/documents/upload`)
- Async OCR extraction job pipeline
- Status polling: `GET /api/py/documents/:id/status`
- iOS polling hook with exponential back-off (per ADR-006)
