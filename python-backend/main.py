"""
FILE: main.py
ROLE: FastAPI application entry point — creates the app, mounts routers,
      and handles startup/shutdown lifecycle.
WHY FastAPI over Flask: FastAPI generates an OpenAPI schema automatically
(browse /docs in browser), has native async support, and uses Pydantic for
request/response validation — the same library used for domain models.

ARCHITECTURE DECISION (ADR-002 reference):
Python handles all document processing, OCR, billing logic, and regulation
research. The Node.js/Express server handles the proxy layer and any future
auth/session concerns. This separation means each service can be scaled and
updated independently.

STARTUP SEQUENCE:
1. Import all ORM models so SQLAlchemy registers them with Base.metadata
2. Call Base.metadata.create_all() — safety net for any tables that
   Alembic missed (idempotent: skips existing tables)
3. Start accepting requests

NOTE ON create_all() + Alembic coexistence:
Alembic (alembic/versions/) is now the authoritative migration mechanism.
create_all() is kept here as a development-safety fallback only — it
will not re-create tables Alembic already owns. In production, the
recommended workflow is: alembic upgrade head (before starting the server),
not relying on create_all(). A future hardening pass will gate create_all()
behind an ALLOW_CREATE_ALL=true env var and remove it from the default path.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import ORM models so they register with Base before create_all()
import models.db_models  # noqa: F401

from core.database import Base, engine
from routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager (replaces @app.on_event("startup")).
    WHY lifespan over on_event: on_event is deprecated in FastAPI 0.93+.
    The lifespan pattern is cleaner — startup code runs before `yield`,
    shutdown code runs after.
    """
    # Create all tables that don't yet exist
    # WHY checkfirst is implicit: create_all skips existing tables by design
    Base.metadata.create_all(bind=engine)
    print("[startup] Database tables created/verified.")
    yield
    # Shutdown: nothing special needed — SQLAlchemy connection pool cleans up
    print("[shutdown] Python backend shutting down.")


app = FastAPI(
    title="Utility Bill Verifier — Python Backend",
    description=(
        "Handles OCR extraction, billing logic, discrepancy detection, "
        "and HK regulation research."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# WHY: The Expo app and Express proxy make requests from different origins
# during development. Allowing all origins here is safe because the Python
# backend is not public-facing — it sits behind the Express proxy.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# WHY: Split business domains into separate router files so each file has
# one clear responsibility. This mirrors the Express routes/ pattern.
# ---------------------------------------------------------------------------
app.include_router(health.router)

# Future routers (added in later stages):
# app.include_router(documents.router)
# app.include_router(comparisons.router)
# app.include_router(regulations.router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PYTHON_PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,   # WHY False: workflow manager restarts on code change; reload causes double-process
        log_level="info",
    )
