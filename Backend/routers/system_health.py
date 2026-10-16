"""
routers/system_health.py – REST API endpoints for the System Health Monitoring module.

Permission matrix:
  - GET /api/health               – public (no auth required)
  - GET /api/system-health/*      – Company Admin, Company Owner, Super Admin
  - POST retry/cancel/incidents   – Company Admin, Company Owner, Super Admin
  - PUT thresholds                – Company Admin, Company Owner, Super Admin
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, List
import json
import platform

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func, cast, Date, text, case

import models
import schemas
from database import get_db, SessionLocal
from dependencies import get_current_company_user, RoleChecker
import audit

from services.health_service import (
    build_overview,
    run_health_checks,
    get_latest_component_health,
    ensure_default_thresholds,
    evaluate_and_alert,
    purge_old_api_metrics,
    sync_jobs_from_imports,
    DEFAULT_THRESHOLDS,
)

router = APIRouter(prefix="/api/system-health", tags=["system health"])

# Roles allowed to access operational details
_admin_roles = [
    models.RoleEnum.super_admin,
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
]
allow_admin = RoleChecker(_admin_roles)


# ─────────────────── Public health endpoint ───────────────────

@router.get("/health", tags=["health"])
def public_health_check(db: Session = Depends(get_db)):
    """
    GET /api/health – lightweight public health probe.
    Returns overall status without exposing sensitive internal information.
    """
    # Quick DB ping
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
        db_error = None
    except Exception:
        db_status = "unavailable"
        db_error = "Database unreachable"

    return {
        "status": db_status if db_status == "healthy" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "database": {"status": db_status},
            "api": {"status": "healthy"},
        },
    }


# ─────────────────── Overview / Dashboard ───────────────────

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """Return aggregated system health metrics for the dashboard."""
    ensure_default_thresholds(db, current_user.company_id)
    return build_overview(db, current_user.company_id)


# ─────────────────── Component health ───────────────────

@router.get("/components")
def get_component_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    return {"components": get_latest_component_health(db)}


@router.post("/run-health-check")
def trigger_health_check(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """Manually trigger health checks for all components."""
    results = run_health_checks(db)
    evaluate_and_alert(db, current_user.company_id)

    audit.record_audit_log(
        db=db,
        request=request,
        user=current_user,
        action="RUN_HEALTH_CHECK",
        resource_type="SystemHealth",
        description="Manual health check triggered",
    )
    db.commit()

    return {
        "message": "Health check completed",
        "results": [
            {
                "component": r.component,
                "status": r.status.value,
                "response_time_ms": r.response_time_ms,
                "error_message": r.error_message,
                "checked_at": r.checked_at,
            }
            for r in results
        ],
    }


# ─────────────────── API Performance Metrics ───────────────────

@router.get("/api-metrics")
def get_api_metrics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    endpoint: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    status_code: Optional[int] = Query(None),
    is_error: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: str = Query("newest"),
):
    query = db.query(models.ApiMetric)

    if endpoint:
        query = query.filter(models.ApiMetric.endpoint.ilike(f"%{endpoint}%"))
    if method:
        query = query.filter(models.ApiMetric.method == method.upper())
    if status_code:
        query = query.filter(models.ApiMetric.status_code == status_code)
    if is_error is not None:
        query = query.filter(models.ApiMetric.is_error == is_error)
    if start_date:
        query = query.filter(
            cast(models.ApiMetric.created_at, Date) >= datetime.strptime(start_date, "%Y-%m-%d").date()
        )
    if end_date:
        query = query.filter(
            cast(models.ApiMetric.created_at, Date) <= datetime.strptime(end_date, "%Y-%m-%d").date()
        )

    total = query.count()
    if sort_by == "oldest":
        query = query.order_by(asc(models.ApiMetric.created_at))
    else:
        query = query.order_by(desc(models.ApiMetric.created_at))

    metrics = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "metrics": [
            {
                "id": m.id,
                "endpoint": m.endpoint,
                "method": m.method,
                "status_code": m.status_code,
                "response_time_ms": m.response_time_ms,
                "is_error": m.is_error,
                "error_category": m.error_category,
                "created_at": m.created_at,
            }
            for m in metrics
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/api-metrics/trends")
def get_api_trends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
    hours: int = Query(24, ge=1, le=168),
):
    """Return hourly avg response time and error rate for the past N hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = (
        db.query(models.ApiMetric)
        .filter(models.ApiMetric.created_at >= cutoff)
        .order_by(models.ApiMetric.created_at)
        .all()
    )

    # Group by hour
    buckets: dict = {}
    for r in rows:
        hour_key = r.created_at.strftime("%Y-%m-%dT%H:00:00Z") if r.created_at else "unknown"
        if hour_key not in buckets:
            buckets[hour_key] = {"total": 0, "errors": 0, "response_times": []}
        buckets[hour_key]["total"] += 1
        if r.is_error:
            buckets[hour_key]["errors"] += 1
        buckets[hour_key]["response_times"].append(r.response_time_ms)

    trends = []
    for hour_key in sorted(buckets.keys()):
        b = buckets[hour_key]
        avg_rt = sum(b["response_times"]) / len(b["response_times"]) if b["response_times"] else 0
        error_rate = (b["errors"] / b["total"] * 100) if b["total"] > 0 else 0
        trends.append(
            {
                "timestamp": hour_key,
                "avg_response_time_ms": round(avg_rt, 1),
                "error_rate_pct": round(error_rate, 2),
                "total_requests": b["total"],
            }
        )

    return {"trends": trends}


@router.get("/api-metrics/endpoint-summary")
def get_endpoint_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """Aggregate per-endpoint stats over the last 24 hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    rows = (
        db.query(
            models.ApiMetric.endpoint,
            models.ApiMetric.method,
            func.count(models.ApiMetric.id).label("count"),
            func.avg(models.ApiMetric.response_time_ms).label("avg_rt"),
            func.sum(
                case((models.ApiMetric.is_error == True, 1), else_=0)
            ).label("errors"),
        )
        .filter(models.ApiMetric.created_at >= cutoff)
        .group_by(models.ApiMetric.endpoint, models.ApiMetric.method)
        .order_by(desc("count"))
        .limit(20)
        .all()
    )
    return {
        "summary": [
            {
                "endpoint": r.endpoint,
                "method": r.method,
                "count": r.count,
                "avg_response_time_ms": round(float(r.avg_rt or 0), 1),
                "error_count": int(r.errors or 0),
                "error_rate_pct": round((int(r.errors or 0) / r.count * 100) if r.count > 0 else 0, 2),
            }
            for r in rows
        ]
    }


# ─────────────────── Background Jobs ───────────────────

def _job_to_dict(job: models.BackgroundJob) -> dict:
    triggered_name = None
    if job.trigger_user:
        triggered_name = job.trigger_user.name or job.trigger_user.email
    return {
        "id": job.id,
        "job_id": job.job_id,
        "job_type": job.job_type.value,
        "triggered_by_name": triggered_name,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "duration_ms": job.duration_ms,
        "status": job.status.value,
        "retry_count": job.retry_count,
        "failure_reason": job.failure_reason,
        "source_record_type": job.source_record_type,
        "source_record_id": job.source_record_id,
        "metadata": json.loads(job.metadata_json) if job.metadata_json else {},
    }


@router.get("/jobs")
def list_jobs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("newest"),
):
    query = (
        db.query(models.BackgroundJob)
        .filter(models.BackgroundJob.company_id == current_user.company_id)
        .options(joinedload(models.BackgroundJob.trigger_user))
    )

    if status:
        try:
            query = query.filter(models.BackgroundJob.status == models.JobStatusEnum(status))
        except ValueError:
            pass
    if job_type:
        try:
            query = query.filter(models.BackgroundJob.job_type == models.JobTypeEnum(job_type))
        except ValueError:
            pass
    if search:
        query = query.filter(models.BackgroundJob.job_id.ilike(f"%{search}%"))
    if start_date:
        query = query.filter(
            cast(models.BackgroundJob.started_at, Date) >= datetime.strptime(start_date, "%Y-%m-%d").date()
        )
    if end_date:
        query = query.filter(
            cast(models.BackgroundJob.started_at, Date) <= datetime.strptime(end_date, "%Y-%m-%d").date()
        )

    total = query.count()
    if sort_by == "oldest":
        query = query.order_by(asc(models.BackgroundJob.started_at))
    else:
        query = query.order_by(desc(models.BackgroundJob.started_at))

    jobs = query.offset((page - 1) * limit).limit(limit).all()
    return {"jobs": [_job_to_dict(j) for j in jobs], "total": total, "page": page, "limit": limit}


@router.get("/jobs/{job_id}")
def get_job_detail(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    job = (
        db.query(models.BackgroundJob)
        .options(joinedload(models.BackgroundJob.trigger_user))
        .filter(
            models.BackgroundJob.job_id == job_id,
            models.BackgroundJob.company_id == current_user.company_id,
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job)


@router.post("/jobs/{job_id}/retry")
def retry_job(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """
    Retry a failed job.  For Data Import jobs we re-queue the associated
    DataImport record.  For other job types the status is reset to pending
    for the background scheduler to pick up.
    A retry is safe: it increments retry_count and does not create duplicate
    business records because the DataImport service handles idempotency.
    """
    job = (
        db.query(models.BackgroundJob)
        .filter(
            models.BackgroundJob.job_id == job_id,
            models.BackgroundJob.company_id == current_user.company_id,
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != models.JobStatusEnum.failed:
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")
    if job.retry_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum retry count (3) reached")

    # Update job
    job.status = models.JobStatusEnum.pending
    job.retry_count += 1
    job.failure_reason = None
    job.completed_at = None

    # If it is a DataImport job, reset the import status so the background worker picks it up
    if job.source_record_type == "DataImport" and job.source_record_id:
        di = db.query(models.DataImport).filter(models.DataImport.id == job.source_record_id).first()
        if di:
            di.status = models.DataImportStatusEnum.pending

    db.commit()

    audit.record_audit_log(
        db=db,
        request=request,
        user=current_user,
        action="RETRY_JOB",
        resource_type="BackgroundJob",
        resource_id=job.job_id,
        description=f"Retried failed job {job.job_id} (type: {job.job_type.value})",
    )
    db.commit()

    return {"message": "Job queued for retry", "job_id": job.job_id, "retry_count": job.retry_count}


@router.post("/jobs/{job_id}/cancel")
def cancel_job(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """Cancel a pending or running job."""
    job = (
        db.query(models.BackgroundJob)
        .filter(
            models.BackgroundJob.job_id == job_id,
            models.BackgroundJob.company_id == current_user.company_id,
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in (models.JobStatusEnum.pending, models.JobStatusEnum.running):
        raise HTTPException(status_code=400, detail="Only pending or running jobs can be cancelled")

    job.status = models.JobStatusEnum.cancelled
    job.completed_at = datetime.now(timezone.utc)

    # Cancel associated DataImport if applicable
    if job.source_record_type == "DataImport" and job.source_record_id:
        di = db.query(models.DataImport).filter(models.DataImport.id == job.source_record_id).first()
        if di and di.status in (models.DataImportStatusEnum.pending, models.DataImportStatusEnum.processing):
            di.status = models.DataImportStatusEnum.cancelled

    db.commit()

    audit.record_audit_log(
        db=db,
        request=request,
        user=current_user,
        action="CANCEL_JOB",
        resource_type="BackgroundJob",
        resource_id=job.job_id,
        description=f"Cancelled job {job.job_id} (type: {job.job_type.value})",
    )
    db.commit()

    return {"message": "Job cancelled", "job_id": job.job_id}


# ─────────────────── System Errors ───────────────────

@router.get("/errors")
def list_errors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: str = Query("newest"),
):
    query = db.query(models.SystemError).filter(
        models.SystemError.company_id == current_user.company_id
    )

    if severity:
        try:
            query = query.filter(models.SystemError.severity == models.ErrorSeverityEnum(severity))
        except ValueError:
            pass
    if category:
        try:
            query = query.filter(models.SystemError.category == models.ErrorCategoryEnum(category))
        except ValueError:
            pass
    if status:
        try:
            query = query.filter(models.SystemError.status == models.ErrorStatusEnum(status))
        except ValueError:
            pass
    if component:
        query = query.filter(models.SystemError.component.ilike(f"%{component}%"))
    if start_date:
        query = query.filter(
            cast(models.SystemError.first_seen_at, Date) >= datetime.strptime(start_date, "%Y-%m-%d").date()
        )
    if end_date:
        query = query.filter(
            cast(models.SystemError.first_seen_at, Date) <= datetime.strptime(end_date, "%Y-%m-%d").date()
        )

    total = query.count()
    if sort_by == "oldest":
        query = query.order_by(asc(models.SystemError.last_seen_at))
    elif sort_by == "severity":
        query = query.order_by(desc(models.SystemError.occurrence_count))
    else:
        query = query.order_by(desc(models.SystemError.last_seen_at))

    errors = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "errors": [
            {
                "id": e.id,
                "error_id": e.error_id,
                "category": e.category.value,
                "component": e.component,
                "endpoint_or_job": e.endpoint_or_job,
                "severity": e.severity.value,
                "occurrence_count": e.occurrence_count,
                "first_seen_at": e.first_seen_at,
                "last_seen_at": e.last_seen_at,
                "status": e.status.value,
                "resolution_notes": e.resolution_notes,
                "sample_message": e.sample_message,
            }
            for e in errors
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.patch("/errors/{error_id}")
def update_error(
    error_id: int,
    request: Request,
    status: Optional[str] = None,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    error = (
        db.query(models.SystemError)
        .filter(
            models.SystemError.id == error_id,
            models.SystemError.company_id == current_user.company_id,
        )
        .first()
    )
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    if status:
        try:
            error.status = models.ErrorStatusEnum(status)
            if error.status == models.ErrorStatusEnum.resolved:
                error.resolved_by = current_user.id
                error.resolved_at = datetime.now(timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    if resolution_notes is not None:
        error.resolution_notes = resolution_notes

    db.commit()
    return {"message": "Error updated", "error_id": error.error_id}


@router.get("/errors/distribution")
def get_error_distribution(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """Error count grouped by category for pie chart."""
    from sqlalchemy import case
    rows = (
        db.query(
            models.SystemError.category,
            func.sum(models.SystemError.occurrence_count).label("total"),
        )
        .filter(
            models.SystemError.company_id == current_user.company_id,
            models.SystemError.status != models.ErrorStatusEnum.resolved,
        )
        .group_by(models.SystemError.category)
        .all()
    )
    return {
        "distribution": [
            {"category": r.category.value, "count": int(r.total or 0)}
            for r in rows
        ]
    }


# ─────────────────── Incidents ───────────────────

def _incident_to_dict(inc: models.Incident, include_timeline: bool = True) -> dict:
    result = {
        "id": inc.id,
        "incident_id": inc.incident_id,
        "title": inc.title,
        "description": inc.description,
        "severity": inc.severity.value,
        "status": inc.status.value,
        "affected_components": json.loads(inc.affected_components) if inc.affected_components else [],
        "detected_at": inc.detected_at,
        "resolved_at": inc.resolved_at,
        "resolution_notes": inc.resolution_notes,
    }
    if include_timeline:
        result["timeline"] = [
            {
                "id": t.id,
                "action": t.action,
                "status_from": t.status_from,
                "status_to": t.status_to,
                "performed_by_name": (t.user.name if t.user else None),
                "notes": t.notes,
                "created_at": t.created_at,
            }
            for t in (inc.timeline or [])
        ]
    return result


@router.get("/incidents")
def list_incidents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    sort_by: str = Query("newest"),
):
    query = (
        db.query(models.Incident)
        .filter(models.Incident.company_id == current_user.company_id)
    )

    if status:
        try:
            query = query.filter(models.Incident.status == models.IncidentStatusEnum(status))
        except ValueError:
            pass
    if severity:
        try:
            query = query.filter(models.Incident.severity == models.ErrorSeverityEnum(severity))
        except ValueError:
            pass

    total = query.count()
    if sort_by == "oldest":
        query = query.order_by(asc(models.Incident.detected_at))
    else:
        query = query.order_by(desc(models.Incident.detected_at))

    incidents = (
        query.options(joinedload(models.Incident.timeline).joinedload(models.IncidentTimeline.user))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "incidents": [_incident_to_dict(i, include_timeline=False) for i in incidents],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/incidents")
def create_incident(
    request: Request,
    title: str,
    description: Optional[str] = None,
    severity: str = "Medium",
    affected_components: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    count = db.query(models.Incident).count()
    incident_id = f"INC-{count + 1:03d}"

    try:
        sev = models.ErrorSeverityEnum(severity)
    except ValueError:
        sev = models.ErrorSeverityEnum.medium

    inc = models.Incident(
        company_id=current_user.company_id,
        incident_id=incident_id,
        title=title,
        description=description,
        severity=sev,
        status=models.IncidentStatusEnum.open,
        affected_components=json.dumps(affected_components or []),
        detected_at=datetime.now(timezone.utc),
    )
    db.add(inc)
    db.flush()

    timeline_entry = models.IncidentTimeline(
        incident_id=inc.id,
        action="Incident Created",
        status_from=None,
        status_to=models.IncidentStatusEnum.open.value,
        performed_by=current_user.id,
        notes=f"Incident created by {current_user.name}",
    )
    db.add(timeline_entry)
    db.commit()
    db.refresh(inc)

    audit.record_audit_log(
        db=db,
        request=request,
        user=current_user,
        action="CREATE_INCIDENT",
        resource_type="Incident",
        resource_id=inc.incident_id,
        description=f"Created incident: {title}",
    )
    db.commit()

    return _incident_to_dict(inc)


@router.get("/incidents/{incident_id}")
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    inc = (
        db.query(models.Incident)
        .options(
            joinedload(models.Incident.timeline).joinedload(models.IncidentTimeline.user),
            joinedload(models.Incident.errors),
        )
        .filter(
            models.Incident.incident_id == incident_id,
            models.Incident.company_id == current_user.company_id,
        )
        .first()
    )
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _incident_to_dict(inc)


@router.patch("/incidents/{incident_id}")
def update_incident(
    incident_id: str,
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """Update incident status and/or notes.  Appends to timeline."""
    inc = (
        db.query(models.Incident)
        .options(joinedload(models.Incident.timeline).joinedload(models.IncidentTimeline.user))
        .filter(
            models.Incident.incident_id == incident_id,
            models.Incident.company_id == current_user.company_id,
        )
        .first()
    )
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = inc.status.value
    new_status_str = body.get("status")
    notes = body.get("notes")
    resolution_notes = body.get("resolution_notes")

    if new_status_str and new_status_str != old_status:
        try:
            inc.status = models.IncidentStatusEnum(new_status_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
        if inc.status == models.IncidentStatusEnum.resolved:
            inc.resolved_at = datetime.now(timezone.utc)
            inc.resolved_by = current_user.id
            if resolution_notes:
                inc.resolution_notes = resolution_notes

        timeline_entry = models.IncidentTimeline(
            incident_id=inc.id,
            action=f"Status changed to {inc.status.value}",
            status_from=old_status,
            status_to=inc.status.value,
            performed_by=current_user.id,
            notes=notes,
        )
        db.add(timeline_entry)

    elif notes:
        timeline_entry = models.IncidentTimeline(
            incident_id=inc.id,
            action="Note added",
            status_from=None,
            status_to=None,
            performed_by=current_user.id,
            notes=notes,
        )
        db.add(timeline_entry)

    if resolution_notes and not new_status_str:
        inc.resolution_notes = resolution_notes

    db.commit()

    audit.record_audit_log(
        db=db,
        request=request,
        user=current_user,
        action="UPDATE_INCIDENT",
        resource_type="Incident",
        resource_id=inc.incident_id,
        description=f"Updated incident {inc.incident_id}: status={inc.status.value}",
    )
    db.commit()
    db.refresh(inc)

    return _incident_to_dict(inc)


# ─────────────────── Monitoring Thresholds ───────────────────

@router.get("/thresholds")
def get_thresholds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    ensure_default_thresholds(db, current_user.company_id)
    rows = (
        db.query(models.MonitoringThreshold)
        .filter(models.MonitoringThreshold.company_id == current_user.company_id)
        .all()
    )
    return {
        "thresholds": [
            {
                "id": r.id,
                "threshold_key": r.threshold_key,
                "threshold_value": r.threshold_value,
                "is_active": r.is_active,
                "description": _threshold_description(r.threshold_key),
            }
            for r in rows
        ]
    }


def _threshold_description(key: str) -> str:
    descriptions = {
        "api_error_rate_pct": "Alert when API error rate exceeds this percentage (last hour)",
        "avg_response_time_ms": "Alert when average response time exceeds this value in ms (last hour)",
        "job_failure_count_1h": "Alert when background job failures exceed this count (last hour)",
        "db_response_time_ms": "Alert when database response time exceeds this value in ms",
        "health_check_interval_minutes": "How often (minutes) the system runs automatic health checks",
    }
    return descriptions.get(key, key)


@router.put("/thresholds")
def update_thresholds(
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin),
):
    """
    Update monitoring thresholds.
    Body: { thresholds: { key: value, ... } }
    """
    thresholds_data = body.get("thresholds", {})
    for key, value in thresholds_data.items():
        if key not in DEFAULT_THRESHOLDS:
            continue  # Ignore unknown keys
        try:
            float_value = float(value)
        except (TypeError, ValueError):
            continue

        existing = (
            db.query(models.MonitoringThreshold)
            .filter(
                models.MonitoringThreshold.company_id == current_user.company_id,
                models.MonitoringThreshold.threshold_key == key,
            )
            .first()
        )
        if existing:
            existing.threshold_value = float_value
        else:
            db.add(
                models.MonitoringThreshold(
                    company_id=current_user.company_id,
                    threshold_key=key,
                    threshold_value=float_value,
                    is_active=True,
                )
            )

    db.commit()

    audit.record_audit_log(
        db=db,
        request=request,
        user=current_user,
        action="UPDATE_THRESHOLDS",
        resource_type="MonitoringThreshold",
        description="Updated monitoring thresholds",
        after_values=thresholds_data,
    )
    db.commit()

    return {"message": "Thresholds updated successfully"}


# ─────────────────── System info ───────────────────

@router.get("/system-info")
def get_system_info(
    current_user: models.User = Depends(allow_admin),
):
    """Return safe system information (no sensitive data)."""
    import sys
    return {
        "app_version": "v1.8.0",
        "environment": "Production",
        "python_version": sys.version.split()[0],
        "platform": platform.system(),
    }
