# HK Utility Bill Verifier — Workspace

## Overview

A native mobile app (Expo/React Native) + Python/FastAPI backend for Hong Kong utility bill verification.

**Purpose:** Scans official CLP, HK Electric, WSD bills and landlord charge sheets, extracts readings via OCR with provenance tracking, compares charges, detects discrepancies using HK rate schedules, and includes an HK-specific regulation research module.

**Secondary Purpose:** A comprehensive beginner tutorial documenting architecture decisions, errors encountered, and lessons learned. Every file has educational header comments.

---

## Architecture

```
iOS App (Expo/React Native)
    ↓ HTTP
Express API Server (Node.js, port 8080)
    ├── /api/*       → Node.js routes (health, future auth)
    └── /api/py/*    → proxy → Python FastAPI (port 8000)
                         ├── OCR extraction
                         ├── Billing comparison engine
                         └── HK regulation research
    ↓
PostgreSQL Database (shared by both backends via DATABASE_URL)
```

---

## Stack

### Monorepo
- **Tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9

### Mobile App (`artifacts/mobile`)
- **Framework**: Expo SDK 54 + Expo Router 6 (file-system routing)
- **UI**: React Native, `expo-blur`, `expo-linear-gradient`, `expo-symbols`
- **Tab bar**: NativeTabs (iOS 26+ liquid glass) + BlurView fallback
- **Icons**: SF Symbols (iOS), Feather/Ionicons fallback (Android/web)
- **Fonts**: Inter (loaded in `_layout.tsx`)
- **Color palette**: Dark navy (#0A0F1E bg, #3B82F6 primary, #EF4444 flag, #F59E0B warning)

### API Server (`artifacts/api-server`)
- **Framework**: Express 5
- **Proxy**: `http-proxy-middleware` for `/api/py/*` → Python backend
- **Database**: Drizzle ORM + PostgreSQL
- **Port**: `$PORT` env var

### Python Backend (`python-backend/`)
- **Framework**: FastAPI 0.1.x + Uvicorn
- **ORM**: SQLAlchemy (6 tables)
- **Validation**: Pydantic v2 (`ConfigDict`, `model_config`)
- **Port**: `$PYTHON_PORT` env var (default 8000)
- **Key pattern**: `FieldWithSource<T>` wraps every OCR-extracted value with provenance

---

## Key Design Decisions

| ADR | Decision |
|-----|----------|
| ADR-001 | Expo/React Native over native SwiftUI |
| ADR-002 | Python/FastAPI backend for OCR + billing logic |
| ADR-003 | `FieldWithSource<T>` provenance wrapper on all extracted values |
| ADR-004 | Deterministic billing math (Python Decimal, no ML inference) |
| ADR-005 | Append-only corrections table (never UPDATE — audit trail) |
| ADR-006 | Polling for OCR status (not WebSockets) |
| ADR-007 | HK-only regulations for MVP (curated accuracy > broad coverage) |

Full ADR documents: `docs/decisions/`

---

## Structure

```
workspace/
├── artifacts/
│   ├── mobile/                     # Expo React Native app
│   │   ├── app/
│   │   │   ├── _layout.tsx         # Root layout with fonts + providers
│   │   │   └── (tabs)/
│   │   │       ├── _layout.tsx     # 5-tab navigation (NativeTabs / BlurView)
│   │   │       ├── index.tsx       # Dashboard tab
│   │   │       ├── bills.tsx       # Bills management tab
│   │   │       ├── reports.tsx     # Discrepancy reports tab
│   │   │       ├── regulations.tsx # HK regulation research tab
│   │   │       └── learn.tsx       # In-app tutorial tab
│   │   ├── constants/colors.ts     # Design tokens (dark navy palette)
│   │   └── types/domain.ts         # TypeScript mirror of Python domain models
│   ├── api-server/                 # Express server + proxy
│   │   └── src/app.ts              # CORS, /api/py proxy, routes
│   └── mockup-sandbox/             # Canvas component preview server
├── python-backend/                 # FastAPI backend
│   ├── main.py                     # App entry, lifespan, routers
│   ├── models/
│   │   ├── domain.py               # Pydantic domain models (FieldWithSource, OfficialBill, etc.)
│   │   └── db_models.py            # SQLAlchemy ORM (6 tables)
│   ├── core/database.py            # SQLAlchemy engine + get_db dependency
│   └── routers/health.py           # GET /healthz
├── lib/
│   ├── api-spec/                   # OpenAPI spec + Orval codegen
│   ├── api-client-react/           # Generated React Query hooks
│   ├── api-zod/                    # Generated Zod schemas
│   └── db/                        # Drizzle ORM schema + connection
├── docs/
│   └── decisions/                  # Architecture Decision Records (ADR-001–007)
└── replit.md                       # This file
```

---

## Database Schema (Python Backend — SQLAlchemy)

| Table | Purpose |
|-------|---------|
| `documents` | Uploaded document metadata (type, status, filename) |
| `extracted_bills` | OCR-extracted official bill data (JSON with FieldWithSource) |
| `landlord_sheets` | OCR-extracted landlord charge sheet data |
| `corrections` | Append-only audit log of user corrections (never UPDATE) |
| `comparison_runs` | Links an official bill + landlord sheet; tracks run status |
| `discrepancy_reports` | Generated comparison outputs with flags and totals |

---

## Important Rules

- **HK only**: Currency HKD, no GST on electricity, CLP/HK Electric/WSD rate schedules only
- **No auth in MVP**: `user_id` column planned but not implemented
- **Corrections are append-only**: Never UPDATE the corrections table — it is an audit trail
- **Never use `uuid` npm package in Expo**: Use `expo-crypto` or `Date.now() + random`
- **Pydantic v2**: Use `ConfigDict` not `model_config` import; `from pydantic import BaseModel, Field, ConfigDict`
- **Express proxy**: Register `/api/py` BEFORE body parsers so multipart uploads forward correctly

---

## Project Status (Stages)

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | iOS App Foundation + Backend Scaffold |
| 2 | Pending | Document Ingestion + OCR Pipeline |
| 3 | Pending | Extraction Review + Manual Correction |
| 4 | Pending | Billing Comparison Engine |
| 5 | Pending | Reports UI + Dashboard + PDF Export |
| 6 | Pending | HK Regulation Research Module |
| 7 | Pending | Tutorial System & Documentation |

---

## Root Scripts

- `pnpm run build` — typecheck then build all packages
- `pnpm run typecheck` — tsc --build --emitDeclarationOnly
- `pnpm --filter @workspace/db run push` — apply Drizzle schema to DB

## Development Ports

| Service | Port |
|---------|------|
| Express API Server | `$PORT` (8080 in dev) |
| Python FastAPI backend | `$PYTHON_PORT` (8000) |
| Expo web | 18115 |
