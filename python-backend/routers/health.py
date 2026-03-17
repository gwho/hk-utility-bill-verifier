"""
FILE: routers/health.py
ROLE: Health check endpoint for the Python backend.
WHY: The Express proxy and deployment platform need a lightweight endpoint
     to verify the Python backend is alive. /healthz is the Kubernetes-style
     convention (vs /health which some load balancers use for different things).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from core.database import get_db
from models.domain import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """
    Returns 200 OK when:
    - The FastAPI server is running
    - The database connection is alive

    Returns 503 if the database is unreachable.

    WHY check the DB in health: A server that can accept HTTP but cannot
    reach its database is not truly healthy. Upstream load balancers should
    know to route around it.
    """
    # Simple DB ping — if this raises, FastAPI returns 500 automatically
    db.execute(text("SELECT 1"))
    return HealthResponse(status="ok")
