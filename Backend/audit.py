import json
from fastapi import Request
from sqlalchemy.orm import Session
import models

def record_audit_log(
    db: Session, 
    request: Request | None, 
    user: models.User, 
    action: str, 
    resource_type: str | None = None,
    resource_id: str | int | None = None,
    description: str | None = None,
    status: str = "Success",
    before_values: dict | None = None,
    after_values: dict | None = None,
    target_name: str | None = None # Backward compatibility
) -> None:
    """Stage an audit event in the caller's current database transaction."""
    
    ip_address = None
    user_agent = None
    
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    # Fallback for old target_name usage
    if target_name and not resource_type:
        resource_type = "Resource"
        description = target_name

    audit_entry = models.AuditLog(
        company_id=user.company_id,
        user_id=user.id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        description=description,
        status=status,
        before_values=json.dumps(before_values) if before_values else None,
        after_values=json.dumps(after_values) if after_values else None,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    db.add(audit_entry)
