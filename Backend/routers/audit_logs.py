from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

import models, schemas
from database import get_db
from dependencies import RoleChecker, get_current_company_user, scope_company_query

router = APIRouter(prefix="/api/audit-logs", tags=["audit logs"])

allow_audit_read = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])


@router.get("/", response_model=List[schemas.AuditLogOut], dependencies=[Depends(allow_audit_read)])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    """Return only this tenant's audit history, newest event first."""
    return scope_company_query(db.query(models.AuditLog), current_user, models.AuditLog).options(
        joinedload(models.AuditLog.company),
        joinedload(models.AuditLog.user),
    ).order_by(models.AuditLog.timestamp.desc()).all()
