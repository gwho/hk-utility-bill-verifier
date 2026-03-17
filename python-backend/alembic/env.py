"""
FILE: alembic/env.py
ROLE: Alembic migration environment configuration.
WHY: Alembic needs to know two things: what database to connect to, and
     what SQLAlchemy metadata to diff against. We wire in DATABASE_URL
     from the environment and our SQLAlchemy Base.metadata so that
     autogenerate (alembic revision --autogenerate) can detect schema drift.

WHY Alembic over create_all():
  create_all() is fine for initial dev but cannot generate incremental
  migrations. Alembic produces versioned SQL files that can be reviewed,
  rolled back, and applied in CI/CD. This is the production-grade approach.

TUTORIAL CONCEPT — Migration workflow:
  1. Make schema changes in models/db_models.py
  2. Run: alembic revision --autogenerate -m "description"
  3. Review the generated file in alembic/versions/
  4. Run: alembic upgrade head
  The alembic_version table in the DB tracks which revision is current.
"""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# ---------------------------------------------------------------------------
# Put the python-backend directory on sys.path so we can import our models.
# WHY: alembic runs from python-backend/, but imports need to resolve from
#      the same directory as if main.py were running.
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import ORM models so SQLAlchemy registers them with Base.metadata BEFORE
# autogenerate inspects the metadata.
import models.db_models  # noqa: F401 — side-effect import registers tables

from core.database import Base  # noqa: E402

# ---------------------------------------------------------------------------
# Alembic config
# ---------------------------------------------------------------------------
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Use DATABASE_URL environment variable instead of alembic.ini sqlalchemy.url
# WHY: Secrets should not live in config files. Replit provides DATABASE_URL
#      automatically. Overriding here means alembic.ini stays secret-free.
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode — generates SQL without a DB connection.
    WHY this matters: offline mode lets you preview migration SQL before running
    it. Useful in CI to produce a SQL diff for DBA review.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,    # detect column type changes
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode — connects to the DB and applies changes.
    WHY NullPool: Alembic creates a single connection for the migration run
    and discards it. NullPool prevents leftover connections in the pool.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
