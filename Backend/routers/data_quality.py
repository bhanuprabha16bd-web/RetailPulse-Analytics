from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional
from datetime import datetime
import json
import models
import schemas
from database import get_db
from dependencies import get_current_company_user, RoleChecker, scope_company_query
from services.data_quality_service import run_reconciliation
from audit import record_audit_log

router = APIRouter(prefix="/api/data-quality", tags=["Data Quality"])

allow_admin = RoleChecker([
    models.RoleEnum.super_admin,
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
])

@router.get("/summary", response_model=schemas.ReconciliationSummaryOut)
def get_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    query = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue)
    
    total_issues = query.count()
    warnings = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue).filter(models.DataQualityIssue.severity.in_([models.DQSeverityEnum.low, models.DQSeverityEnum.medium])).count()
    errors = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue).filter(models.DataQualityIssue.severity.in_([models.DQSeverityEnum.high, models.DQSeverityEnum.critical])).count()
    unresolved = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue).filter(models.DataQualityIssue.status.in_([models.DQIssueStatusEnum.open, models.DQIssueStatusEnum.investigating])).count()
    
    last_run = scope_company_query(db.query(models.ReconciliationRun), current_user, models.ReconciliationRun)\
        .order_by(desc(models.ReconciliationRun.started_at)).first()
        
    return {
        "total_records_checked": last_run.records_checked if last_run else 0,
        "valid_records": (last_run.records_checked - total_issues) if last_run else 0,
        "warnings_count": warnings,
        "errors_count": errors,
        "unresolved_issues": unresolved,
        "last_reconciliation_time": last_run.started_at if last_run else None
    }

@router.get("/issues", response_model=schemas.PaginatedIssuesOut)
def get_issues(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    issue_type: Optional[models.DQIssueTypeEnum] = None,
    severity: Optional[models.DQSeverityEnum] = None,
    module: Optional[models.DQModuleEnum] = None,
    status: Optional[models.DQIssueStatusEnum] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = Query("detected_at_desc", pattern="^(detected_at_desc|detected_at_asc|severity_desc|severity_asc)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    query = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue)
    
    if search:
        query = query.filter(
            (models.DataQualityIssue.issue_id.ilike(f"%{search}%")) |
            (models.DataQualityIssue.description.ilike(f"%{search}%")) |
            (models.DataQualityIssue.affected_record.ilike(f"%{search}%"))
        )
    if issue_type:
        query = query.filter(models.DataQualityIssue.issue_type == issue_type)
    if severity:
        query = query.filter(models.DataQualityIssue.severity == severity)
    if module:
        query = query.filter(models.DataQualityIssue.module == module)
    if status:
        query = query.filter(models.DataQualityIssue.status == status)
    if start_date:
        query = query.filter(models.DataQualityIssue.detected_at >= start_date)
    if end_date:
        query = query.filter(models.DataQualityIssue.detected_at <= end_date)
        
    if sort_by == "detected_at_desc":
        query = query.order_by(desc(models.DataQualityIssue.detected_at))
    elif sort_by == "detected_at_asc":
        query = query.order_by(models.DataQualityIssue.detected_at)
    elif sort_by == "severity_desc":
        query = query.order_by(desc(models.DataQualityIssue.severity))
    elif sort_by == "severity_asc":
        query = query.order_by(models.DataQualityIssue.severity)
        
    total = query.count()
    issues = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "issues": issues,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/issues/stats", response_model=schemas.IssuesStatsOut)
def get_issues_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    type_stats = db.query(
        models.DataQualityIssue.issue_type.label("issue_type"),
        func.count(models.DataQualityIssue.id).label("count")
    ).filter(
        models.DataQualityIssue.company_id == current_user.company_id
    ).group_by(models.DataQualityIssue.issue_type).all()
    
    severity_stats = db.query(
        models.DataQualityIssue.severity.label("severity"),
        func.count(models.DataQualityIssue.id).label("count")
    ).filter(
        models.DataQualityIssue.company_id == current_user.company_id
    ).group_by(models.DataQualityIssue.severity).all()
    
    return {
        "by_type": [{"issue_type": str(stat.issue_type.value if hasattr(stat.issue_type, 'value') else stat.issue_type), "count": stat.count} for stat in type_stats],
        "by_severity": [{"severity": str(stat.severity.value if hasattr(stat.severity, 'value') else stat.severity), "count": stat.count} for stat in severity_stats]
    }

@router.get("/issues/{issue_id}", response_model=schemas.DataQualityIssueDetailOut)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    issue = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue)\
        .filter(models.DataQualityIssue.id == issue_id).first()
        
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    history = db.query(models.IssueStatusHistory).filter(models.IssueStatusHistory.issue_id == issue.id).order_by(desc(models.IssueStatusHistory.changed_at)).all()
    
    data = schemas.DataQualityIssueDetailOut.model_validate(issue)
    data.related_data = json.loads(issue.related_data) if issue.related_data else None
    data.status_history = history
    return data

@router.put("/issues/{issue_id}/status", response_model=schemas.DataQualityIssueDetailOut)
def update_issue_status(
    issue_id: int,
    request: schemas.IssueStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    issue = scope_company_query(db.query(models.DataQualityIssue), current_user, models.DataQualityIssue)\
        .filter(models.DataQualityIssue.id == issue_id).first()
        
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    old_status = issue.status
    
    if old_status != request.new_status:
        issue.status = request.new_status
        if request.new_status == models.DQIssueStatusEnum.resolved:
            issue.resolved_at = datetime.utcnow()
            issue.resolved_by = current_user.id
            issue.resolution_note = request.resolution_note
            
        history = models.IssueStatusHistory(
            issue_id=issue.id,
            previous_status=old_status.value if hasattr(old_status, 'value') else old_status,
            new_status=request.new_status.value if hasattr(request.new_status, 'value') else request.new_status,
            changed_by=current_user.id,
            note=request.resolution_note
        )
        db.add(history)
        
        record_audit_log(
            db=db,
            request=None,
            user=current_user,
            action="Data Quality Issue Updated",
            resource_type="DataQualityIssue",
            resource_id=str(issue.id),
            description=f"Status changed from {old_status} to {request.new_status}",
            before_values={"status": str(old_status)},
            after_values={"status": str(request.new_status)}
        )
        
        db.commit()
        db.refresh(issue)
        
    history = db.query(models.IssueStatusHistory).filter(models.IssueStatusHistory.issue_id == issue.id).order_by(desc(models.IssueStatusHistory.changed_at)).all()
    
    data = schemas.DataQualityIssueDetailOut.model_validate(issue)
    data.related_data = json.loads(issue.related_data) if issue.related_data else None
    data.status_history = history
    return data

@router.post("/reconciliation/run", response_model=schemas.ReconciliationRunOut)
def run_manual_reconciliation(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    run = run_reconciliation(db, current_user.company_id, current_user.id)
    
    record_audit_log(
        db=db,
        request=None,
        user=current_user,
        action="Manual Reconciliation Triggered",
        resource_type="ReconciliationRun",
        resource_id=str(run.id),
        description=f"Reconciliation run {run.execution_id} triggered manually",
    )
    
    return run

@router.get("/reconciliation/history")
def get_reconciliation_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
    _role: models.User = Depends(allow_admin),
):
    query = scope_company_query(db.query(models.ReconciliationRun), current_user, models.ReconciliationRun)\
        .order_by(desc(models.ReconciliationRun.started_at))
        
    total = query.count()
    runs = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "runs": runs,
        "total": total,
        "page": page,
        "limit": limit
    }
