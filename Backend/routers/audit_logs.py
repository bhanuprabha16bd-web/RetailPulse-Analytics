import io
import csv
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, cast, Date

from database import get_db
import models
import schemas
from dependencies import get_current_company_user, RoleChecker
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter(
    prefix="/api/audit-logs",
    tags=["audit logs"],
    dependencies=[Depends(RoleChecker([models.RoleEnum.company_admin, models.RoleEnum.company_owner]))]
)

def build_query(db: Session, current_user: models.User, user_id, action, resource_type, status, start_date, end_date, search):
    query = db.query(models.AuditLog).filter(models.AuditLog.company_id == current_user.company_id)
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if action and action != 'All Actions':
        query = query.filter(models.AuditLog.action == action)
    if resource_type and resource_type != 'All Resources':
        query = query.filter(models.AuditLog.resource_type == resource_type)
    if status and status != 'All Status':
        query = query.filter(models.AuditLog.status == status)
        
    if start_date:
        query = query.filter(cast(models.AuditLog.created_at, Date) >= datetime.strptime(start_date, "%Y-%m-%d").date())
    if end_date:
        query = query.filter(cast(models.AuditLog.created_at, Date) <= datetime.strptime(end_date, "%Y-%m-%d").date())
        
    if search:
        search_filter = f"%{search}%"
        query = query.join(models.User).filter(
            (models.AuditLog.description.ilike(search_filter)) |
            (models.AuditLog.action.ilike(search_filter)) |
            (models.AuditLog.resource_type.ilike(search_filter)) |
            (models.AuditLog.resource_id.ilike(search_filter)) |
            (models.User.name.ilike(search_filter))
        )
    else:
        query = query.outerjoin(models.User)
        
    return query

@router.get("", response_model=schemas.PaginatedAuditLogsOut)
def get_audit_logs(
    page: int = 1,
    limit: int = 25,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "newest",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user)
):
    query = build_query(db, current_user, user_id, action, resource_type, status, start_date, end_date, search)
    
    total = query.count()
    
    if sort_by == "oldest":
        query = query.order_by(asc(models.AuditLog.created_at))
    else:
        query = query.order_by(desc(models.AuditLog.created_at))
        
    logs = query.options(joinedload(models.AuditLog.user), joinedload(models.AuditLog.company)).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/export")
def export_audit_logs(
    format: str = "csv",
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user)
):
    query = build_query(db, current_user, user_id, action, resource_type, status, start_date, end_date, search)
    logs = query.options(joinedload(models.AuditLog.user)).order_by(desc(models.AuditLog.created_at)).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Time", "User", "Action", "Resource", "Resource ID", "Description", "IP Address", "Status"])
        for log in logs:
            user_name = log.user.name if log.user else "Unknown"
            writer.writerow([
                log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
                user_name,
                log.action,
                log.resource_type or "-",
                log.resource_id or "-",
                log.description or "-",
                log.ip_address or "-",
                log.status
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"}
        )
    elif format == "pdf":
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        elements = []
        
        styles = getSampleStyleSheet()
        elements.append(Paragraph("Audit Logs", styles['Title']))
        
        data = [["Time", "User", "Action", "Resource", "Resource ID", "Status"]]
        for log in logs:
            user_name = log.user.name if log.user else "Unknown"
            data.append([
                log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else "",
                user_name[:20],
                log.action,
                log.resource_type or "-",
                str(log.resource_id) or "-",
                log.status
            ])
            
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'csv' or 'pdf'.")

@router.delete("/clear")
def clear_audit_logs(
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user)
):
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required to clear logs")
    
    db.query(models.AuditLog).filter(models.AuditLog.company_id == current_user.company_id).delete()
    db.commit()
    
    from audit import record_audit_log
    record_audit_log(
        db=db,
        request=None,
        user=current_user,
        action="CLEAR_LOGS",
        resource_type="AuditLog",
        description="Admin cleared all audit logs."
    )
    db.commit()
    return {"message": "Audit logs cleared successfully."}

@router.get("/{log_id}", response_model=schemas.AuditLogOut)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user)
):
    log = db.query(models.AuditLog).options(joinedload(models.AuditLog.user), joinedload(models.AuditLog.company)).filter(
        models.AuditLog.id == log_id,
        models.AuditLog.company_id == current_user.company_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log
