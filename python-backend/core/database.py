"""
FILE: core/database.py
ROLE: SQLAlchemy engine, session factory, and Base class.
      All DB tables are defined in models/db_models.py and inherit from Base.
WHY: Centralising the engine here means every route/service imports from
     one place rather than re-creating connections.

ARCHITECTURE DECISION: We use the same DATABASE_URL as the Node.js Drizzle
backend. Both backends share the same PostgreSQL database. The Python backend
owns the python-managed tables (documents, extractions, etc.) and the
Node.js backend owns any future auth/session tables.

WHY SQLAlchemy: It is the most battle-tested Python ORM, has excellent
async support (AsyncSession), and Alembic (migration tool) is built for it.

ERROR LOG: First attempt used `create_engine` with `echo=True` globally —
this flooded logs with SQL on every request. Fix: `echo=False` in production,
only enable via env var SQLALCHEMY_ECHO=1 for debugging.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Is the PostgreSQL database provisioned?"
    )

echo_sql = os.environ.get("SQLALCHEMY_ECHO", "0") == "1"

engine = create_engine(
    DATABASE_URL,
    echo=echo_sql,
    pool_pre_ping=True,      # WHY: verify connections before use (handles idle timeout)
    pool_recycle=3600,        # WHY: recycle connections after 1h to avoid stale TCP
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    Any class inheriting from Base gets auto-registered with the metadata
    so that `Base.metadata.create_all(engine)` creates all tables at once.
    """
    pass


def get_db():
    """
    FastAPI dependency that provides a database session per request.
    WHY: Using a context manager (finally: db.close()) ensures the session
    is ALWAYS returned to the pool even if an exception is raised mid-request.
    Without this, connections leak and the pool is exhausted under load.

    Usage in a route:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
