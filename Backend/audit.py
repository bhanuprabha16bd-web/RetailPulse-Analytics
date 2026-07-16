from fastapi import Request
from sqlalchemy.orm import Session

import models


def record_audit_log(db: Session, request: Request, user: models.User, action: str) -> None:
    """Stage an audit event in the caller's current database transaction."""
    db.add(
        models.AuditLog(
            company_id=user.company_id,
            user_id=user.id,
            action=action,
            ip_address=request.client.host if request.client else None,
            browser=request.headers.get("user-agent"),
        )
    )
