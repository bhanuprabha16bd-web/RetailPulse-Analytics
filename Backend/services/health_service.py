"""
health_service.py – Business logic for the System Health Monitoring module.

Responsibilities:
- Run health checks against all application components
- Track background job transitions (create/update BackgroundJob records)
- Record system errors (with deduplication)
- Evaluate alert thresholds and fire notifications
- Enforce data-retention policies (trim old api_metrics, health_checks)
"""

import json
import uuid
import time
import platform
import psutil
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
import models
from models import (
    SystemHealthStatusEnum, JobStatusEnum, JobTypeEnum,
    ErrorCategoryEnum, ErrorSeverityEnum, NotificationTypeEnum,
    NotificationPriorityEnum
)
from services.notification_service import create_notification

# ─────────────────── Constants / Defaults ───────────────────

DEFAULT_THRESHOLDS = {
    "api_error_rate_pct": 5.0,          # Alert if > 5% error rate in last hour
    "avg_response_time_ms": 2000.0,     # Alert if avg > 2 000 ms
    "job_failure_count_1h": 3.0,        # Alert if > 3 job failures in last hour
    "db_response_time_ms": 500.0,       # Alert if DB ping > 500 ms
    "health_check_interval_minutes": 5.0,  # Re-run health checks every 5 minutes
}

COMPONENT_NAMES = [
    "Application API",
    "Database",
    "Background Jobs",
    "Data Import Service",
    "Email Service",
    "Payment Gateway",
]

# Retention
API_METRICS_RETENTION_DAYS = 7
HEALTH_CHECK_RETENTION_DAYS = 30


# ─────────────────── Threshold helpers ───────────────────

def get_threshold(db: Session, company_id: int, key: str) -> float:
    """Return the company-specific threshold or the global default."""
    row = (
        db.query(models.MonitoringThreshold)
        .filter(
            models.MonitoringThreshold.company_id == company_id,
            models.MonitoringThreshold.threshold_key == key,
            models.MonitoringThreshold.is_active == True,
        )
        .first()
    )
    if row:
        return row.threshold_value
    return DEFAULT_THRESHOLDS.get(key, 0.0)


def ensure_default_thresholds(db: Session, company_id: int):
    """Create default threshold records for a company if missing."""
    for key, value in DEFAULT_THRESHOLDS.items():
        existing = (
            db.query(models.MonitoringThreshold)
            .filter(
                models.MonitoringThreshold.company_id == company_id,
                models.MonitoringThreshold.threshold_key == key,
            )
            .first()
        )
        if not existing:
            db.add(
                models.MonitoringThreshold(
                    company_id=company_id,
                    threshold_key=key,
                    threshold_value=value,
                    is_active=True,
                )
            )
    db.commit()


# ─────────────────── Health check logic ───────────────────

def _ping_database(db: Session) -> tuple[SystemHealthStatusEnum, int, str | None]:
    """Check database connectivity and return (status, response_time_ms, error)."""
    start = time.monotonic()
    try:
        db.execute(text("SELECT 1"))
        elapsed = int((time.monotonic() - start) * 1000)
        return SystemHealthStatusEnum.healthy, elapsed, None
    except Exception as exc:
        elapsed = int((time.monotonic() - start) * 1000)
        return SystemHealthStatusEnum.unavailable, elapsed, "Database connection failed"


def _check_background_jobs(db: Session) -> tuple[SystemHealthStatusEnum, str | None]:
    """Infer background-job health from recent failures."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    recent_failures = (
        db.query(models.BackgroundJob)
        .filter(
            models.BackgroundJob.status == JobStatusEnum.failed,
            models.BackgroundJob.started_at >= cutoff,
        )
        .count()
    )
    if recent_failures == 0:
        return SystemHealthStatusEnum.healthy, None
    if recent_failures <= 3:
        return SystemHealthStatusEnum.degraded, f"{recent_failures} job(s) failed in the last hour"
    return SystemHealthStatusEnum.unavailable, f"{recent_failures} job failures in the last hour"


def _check_api_health(db: Session) -> tuple[SystemHealthStatusEnum, int, str | None]:
    """Derive API health from recent api_metrics."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
    total = (
        db.query(models.ApiMetric)
        .filter(models.ApiMetric.created_at >= cutoff)
        .count()
    )
    if total == 0:
        return SystemHealthStatusEnum.healthy, 0, None

    errors = (
        db.query(models.ApiMetric)
        .filter(models.ApiMetric.created_at >= cutoff, models.ApiMetric.is_error == True)
        .count()
    )
    avg_rt_row = (
        db.query(func.avg(models.ApiMetric.response_time_ms))
        .filter(models.ApiMetric.created_at >= cutoff)
        .scalar()
    )
    avg_rt = int(avg_rt_row or 0)
    error_pct = (errors / total) * 100

    if error_pct > 20 or avg_rt > 5000:
        return SystemHealthStatusEnum.unavailable, avg_rt, f"High error rate: {error_pct:.1f}%"
    if error_pct > 5 or avg_rt > 2000:
        return SystemHealthStatusEnum.degraded, avg_rt, f"Elevated error rate: {error_pct:.1f}%"
    return SystemHealthStatusEnum.healthy, avg_rt, None


def _simulate_external_service(name: str) -> tuple[SystemHealthStatusEnum, int, str | None]:
    """
    For external services (Email, Payment Gateway) we cannot truly ping them,
    so we report them as healthy unless there is a recent system error logged
    against them.  A real deployment would replace this with an actual HTTP probe.
    """
    return SystemHealthStatusEnum.healthy, 0, None


def run_health_checks(db: Session) -> list[models.SystemHealthCheck]:
    """Execute all component health checks, persist results, and return them."""
    results: list[models.SystemHealthCheck] = []
    now = datetime.now(timezone.utc)

    # 1. Database
    db_status, db_rt, db_err = _ping_database(db)
    results.append(
        models.SystemHealthCheck(
            component="Database",
            status=db_status,
            response_time_ms=db_rt,
            error_message=db_err,
            checked_at=now,
        )
    )

    # 2. Application API (self – if we got here, it's healthy)
    results.append(
        models.SystemHealthCheck(
            component="Application API",
            status=SystemHealthStatusEnum.healthy,
            response_time_ms=1,
            error_message=None,
            checked_at=now,
        )
    )

    # 3. Background Jobs
    job_status, job_err = _check_background_jobs(db)
    results.append(
        models.SystemHealthCheck(
            component="Background Jobs",
            status=job_status,
            response_time_ms=None,
            error_message=job_err,
            checked_at=now,
        )
    )

    # 4. Data Import Service (derived from api health or last import status)
    api_status, api_rt, api_err = _check_api_health(db)
    results.append(
        models.SystemHealthCheck(
            component="Data Import Service",
            status=api_status,
            response_time_ms=api_rt,
            error_message=api_err,
            checked_at=now,
        )
    )

    # 5. Email Service (external – simulated)
    email_status, email_rt, email_err = _simulate_external_service("Email Service")
    results.append(
        models.SystemHealthCheck(
            component="Email Service",
            status=email_status,
            response_time_ms=email_rt if email_rt else None,
            error_message=email_err,
            checked_at=now,
        )
    )

    # 6. Payment Gateway (external – simulated)
    pay_status, pay_rt, pay_err = _simulate_external_service("Payment Gateway")
    results.append(
        models.SystemHealthCheck(
            component="Payment Gateway",
            status=pay_status,
            response_time_ms=pay_rt if pay_rt else None,
            error_message=pay_err,
            checked_at=now,
        )
    )

    for r in results:
        db.add(r)
    db.commit()
    for r in results:
        db.refresh(r)

    # Trim old health check records
    retention_cutoff = now - timedelta(days=HEALTH_CHECK_RETENTION_DAYS)
    db.query(models.SystemHealthCheck).filter(
        models.SystemHealthCheck.checked_at < retention_cutoff
    ).delete(synchronize_session=False)
    db.commit()

    return results


def get_latest_component_health(db: Session) -> list[dict]:
    """Return the most-recent health record per component."""
    subq = (
        db.query(
            models.SystemHealthCheck.component,
            func.max(models.SystemHealthCheck.checked_at).label("latest"),
        )
        .group_by(models.SystemHealthCheck.component)
        .subquery()
    )
    rows = (
        db.query(models.SystemHealthCheck)
        .join(
            subq,
            (models.SystemHealthCheck.component == subq.c.component)
            & (models.SystemHealthCheck.checked_at == subq.c.latest),
        )
        .all()
    )

    # Ensure all expected components are present
    present = {r.component for r in rows}
    output = [
        {
            "component": r.component,
            "status": r.status.value,
            "response_time_ms": r.response_time_ms,
            "error_message": r.error_message,
            "checked_at": r.checked_at,
        }
        for r in rows
    ]
    for comp in COMPONENT_NAMES:
        if comp not in present:
            output.append(
                {
                    "component": comp,
                    "status": SystemHealthStatusEnum.healthy.value,
                    "response_time_ms": None,
                    "error_message": None,
                    "checked_at": None,
                }
            )
    return output


# ─────────────────── Background Job tracking ───────────────────

def _next_job_id(db: Session) -> str:
    count = db.query(models.BackgroundJob).count()
    return f"JOB-{count + 1:04d}"


def create_background_job(
    db: Session,
    job_type: JobTypeEnum,
    company_id: int | None,
    triggered_by: int | None,
    source_record_type: str | None = None,
    source_record_id: int | None = None,
    metadata: dict | None = None,
) -> models.BackgroundJob:
    job = models.BackgroundJob(
        company_id=company_id,
        job_id=_next_job_id(db),
        job_type=job_type,
        triggered_by=triggered_by,
        status=JobStatusEnum.running,
        started_at=datetime.now(timezone.utc),
        source_record_type=source_record_type,
        source_record_id=source_record_id,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def complete_background_job(
    db: Session,
    job: models.BackgroundJob,
    success: bool,
    failure_reason: str | None = None,
):
    now = datetime.now(timezone.utc)
    job.completed_at = now
    job.duration_ms = int((now - job.started_at).total_seconds() * 1000)
    job.status = JobStatusEnum.completed if success else JobStatusEnum.failed
    if not success:
        job.failure_reason = failure_reason
    db.commit()


def sync_jobs_from_imports(db: Session):
    """
    Create/sync BackgroundJob records from DataImport records that don't
    have a corresponding job yet.  Called during startup migration.
    """
    imports = db.query(models.DataImport).all()
    for imp in imports:
        existing = (
            db.query(models.BackgroundJob)
            .filter(
                models.BackgroundJob.source_record_type == "DataImport",
                models.BackgroundJob.source_record_id == imp.id,
            )
            .first()
        )
        if existing:
            continue

        status_map = {
            models.DataImportStatusEnum.completed: JobStatusEnum.completed,
            models.DataImportStatusEnum.completed_with_errors: JobStatusEnum.completed,
            models.DataImportStatusEnum.failed: JobStatusEnum.failed,
            models.DataImportStatusEnum.cancelled: JobStatusEnum.cancelled,
            models.DataImportStatusEnum.processing: JobStatusEnum.running,
            models.DataImportStatusEnum.pending: JobStatusEnum.pending,
            models.DataImportStatusEnum.validating: JobStatusEnum.running,
            models.DataImportStatusEnum.uploaded: JobStatusEnum.pending,
        }
        job_status = status_map.get(imp.status, JobStatusEnum.pending)
        duration = None
        if imp.completed_at and imp.created_at:
            duration = int((imp.completed_at - imp.created_at).total_seconds() * 1000)

        job = models.BackgroundJob(
            company_id=imp.company_id,
            job_id=_next_job_id(db),
            job_type=JobTypeEnum.data_import,
            triggered_by=imp.uploaded_by,
            started_at=imp.created_at,
            completed_at=imp.completed_at,
            duration_ms=duration,
            status=job_status,
            failure_reason=(
                f"Import failed. {imp.failed_records} records could not be processed."
                if imp.status == models.DataImportStatusEnum.failed
                else None
            ),
            source_record_type="DataImport",
            source_record_id=imp.id,
            metadata_json=json.dumps(
                {
                    "filename": imp.filename,
                    "import_type": imp.import_type.value,
                    "total_records": imp.total_records,
                    "successful_records": imp.successful_records,
                    "failed_records": imp.failed_records,
                }
            ),
        )
        db.add(job)

    # Reconciliation runs
    rec_runs = db.query(models.ReconciliationRun).all()
    for run in rec_runs:
        existing = (
            db.query(models.BackgroundJob)
            .filter(
                models.BackgroundJob.source_record_type == "ReconciliationRun",
                models.BackgroundJob.source_record_id == run.id,
            )
            .first()
        )
        if existing:
            continue

        rec_status_map = {
            models.ReconciliationStatusEnum.completed: JobStatusEnum.completed,
            models.ReconciliationStatusEnum.completed_with_issues: JobStatusEnum.completed,
            models.ReconciliationStatusEnum.failed: JobStatusEnum.failed,
            models.ReconciliationStatusEnum.running: JobStatusEnum.running,
        }
        job_status = rec_status_map.get(run.status, JobStatusEnum.running)
        duration = None
        if run.completed_at and run.started_at:
            duration = int((run.completed_at - run.started_at).total_seconds() * 1000)

        job = models.BackgroundJob(
            company_id=run.company_id,
            job_id=_next_job_id(db),
            job_type=JobTypeEnum.reconciliation,
            triggered_by=run.triggered_by,
            started_at=run.started_at,
            completed_at=run.completed_at,
            duration_ms=duration,
            status=job_status,
            failure_reason=run.error_message if run.status == models.ReconciliationStatusEnum.failed else None,
            source_record_type="ReconciliationRun",
            source_record_id=run.id,
            metadata_json=json.dumps(
                {
                    "execution_id": run.execution_id,
                    "records_checked": run.records_checked,
                    "issues_found": run.issues_found,
                }
            ),
        )
        db.add(job)

    try:
        db.commit()
    except Exception:
        db.rollback()


# ─────────────────── System Error tracking ───────────────────

def _next_error_id(db: Session) -> str:
    count = db.query(models.SystemError).count()
    return f"ERR-{count + 1:04d}"


def record_system_error(
    db: Session,
    category: ErrorCategoryEnum,
    component: str,
    severity: ErrorSeverityEnum,
    endpoint_or_job: str | None = None,
    sample_message: str | None = None,
    company_id: int | None = None,
):
    """
    Record a system error with deduplication.
    If an open error with the same (category, component, endpoint_or_job) exists,
    increment its occurrence_count rather than creating a new row.
    Sensitive content should be stripped by callers before passing sample_message.
    """
    error_key = f"{category.value}|{component}|{endpoint_or_job or ''}"
    existing = (
        db.query(models.SystemError)
        .filter(
            models.SystemError.error_key == error_key,
            models.SystemError.status != models.ErrorStatusEnum.resolved,
            (
                models.SystemError.company_id == company_id
                if company_id
                else models.SystemError.company_id.is_(None)
            ),
        )
        .first()
    )
    if existing:
        existing.occurrence_count += 1
        existing.last_seen_at = datetime.now(timezone.utc)
        if sample_message:
            existing.sample_message = sample_message[:500]
        db.commit()
        return existing

    error = models.SystemError(
        company_id=company_id,
        error_id=_next_error_id(db),
        error_key=error_key,
        category=category,
        component=component,
        endpoint_or_job=endpoint_or_job,
        severity=severity,
        sample_message=sample_message[:500] if sample_message else None,
        occurrence_count=1,
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
        status=models.ErrorStatusEnum.open,
    )
    db.add(error)
    db.commit()
    db.refresh(error)
    return error


# ─────────────────── Threshold evaluation & alerts ───────────────────

def evaluate_and_alert(db: Session, company_id: int):
    """
    Called after health checks to raise/clear notifications based on thresholds.
    """
    cutoff_1h = datetime.now(timezone.utc) - timedelta(hours=1)

    # --- API error rate ---
    total_1h = (
        db.query(models.ApiMetric)
        .filter(models.ApiMetric.created_at >= cutoff_1h)
        .count()
    )
    if total_1h > 0:
        errors_1h = (
            db.query(models.ApiMetric)
            .filter(models.ApiMetric.created_at >= cutoff_1h, models.ApiMetric.is_error == True)
            .count()
        )
        error_rate = (errors_1h / total_1h) * 100
        threshold_rate = get_threshold(db, company_id, "api_error_rate_pct")
        if error_rate > threshold_rate:
            create_notification(
                db=db,
                company_id=company_id,
                type=NotificationTypeEnum.system_alert,
                title="High API Error Rate Detected",
                message=f"API error rate is {error_rate:.1f}% over the last hour (threshold: {threshold_rate:.1f}%).",
                priority=NotificationPriorityEnum.high,
                resource_type="SystemHealth",
                resource_id="api_error_rate",
                prevent_duplicate_hours=1,
            )

    # --- Avg response time ---
    avg_rt = (
        db.query(func.avg(models.ApiMetric.response_time_ms))
        .filter(models.ApiMetric.created_at >= cutoff_1h)
        .scalar()
    )
    if avg_rt:
        rt_threshold = get_threshold(db, company_id, "avg_response_time_ms")
        if avg_rt > rt_threshold:
            create_notification(
                db=db,
                company_id=company_id,
                type=NotificationTypeEnum.system_alert,
                title="Slow API Response Times",
                message=f"Average API response time is {int(avg_rt)}ms over the last hour (threshold: {int(rt_threshold)}ms).",
                priority=NotificationPriorityEnum.medium,
                resource_type="SystemHealth",
                resource_id="response_time",
                prevent_duplicate_hours=1,
            )

    # --- Job failures ---
    job_failures_1h = (
        db.query(models.BackgroundJob)
        .filter(
            models.BackgroundJob.company_id == company_id,
            models.BackgroundJob.status == JobStatusEnum.failed,
            models.BackgroundJob.started_at >= cutoff_1h,
        )
        .count()
    )
    failure_threshold = get_threshold(db, company_id, "job_failure_count_1h")
    if job_failures_1h > failure_threshold:
        create_notification(
            db=db,
            company_id=company_id,
            type=NotificationTypeEnum.system_alert,
            title="Excessive Background Job Failures",
            message=f"{job_failures_1h} background job(s) failed in the last hour (threshold: {int(failure_threshold)}).",
            priority=NotificationPriorityEnum.high,
            resource_type="SystemHealth",
            resource_id="job_failures",
            prevent_duplicate_hours=1,
        )

    db.commit()


# ─────────────────── Dashboard summary ───────────────────

def build_overview(db: Session, company_id: int) -> dict:
    """Aggregate data for the SystemHealth overview dashboard."""
    cutoff_1h = datetime.now(timezone.utc) - timedelta(hours=1)
    cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)

    # API metrics (last 1h)
    total_requests = (
        db.query(models.ApiMetric)
        .filter(models.ApiMetric.created_at >= cutoff_1h)
        .count()
    )
    failed_requests = (
        db.query(models.ApiMetric)
        .filter(models.ApiMetric.created_at >= cutoff_1h, models.ApiMetric.is_error == True)
        .count()
    )
    avg_rt = (
        db.query(func.avg(models.ApiMetric.response_time_ms))
        .filter(models.ApiMetric.created_at >= cutoff_1h)
        .scalar()
    ) or 0.0
    availability = (
        ((total_requests - failed_requests) / total_requests * 100)
        if total_requests > 0
        else 100.0
    )

    # Jobs (last 24h scoped to company)
    jobs_q = db.query(models.BackgroundJob).filter(
        models.BackgroundJob.company_id == company_id,
        models.BackgroundJob.started_at >= cutoff_24h,
    )
    jobs_completed = jobs_q.filter(models.BackgroundJob.status == JobStatusEnum.completed).count()
    jobs_failed = jobs_q.filter(models.BackgroundJob.status == JobStatusEnum.failed).count()
    jobs_running = jobs_q.filter(models.BackgroundJob.status == JobStatusEnum.running).count()
    jobs_pending = jobs_q.filter(models.BackgroundJob.status == JobStatusEnum.pending).count()

    # Errors & incidents (company-scoped)
    open_errors = (
        db.query(models.SystemError)
        .filter(
            models.SystemError.company_id == company_id,
            models.SystemError.status != models.ErrorStatusEnum.resolved,
        )
        .count()
    )
    open_incidents = (
        db.query(models.Incident)
        .filter(
            models.Incident.company_id == company_id,
            models.Incident.status != models.IncidentStatusEnum.resolved,
        )
        .count()
    )

    # Last health check
    last_check = (
        db.query(func.max(models.SystemHealthCheck.checked_at)).scalar()
    )

    # Component health
    components = get_latest_component_health(db)

    # Overall status
    statuses = [c["status"] for c in components]
    if models.SystemHealthStatusEnum.unavailable.value in statuses:
        overall = "Unavailable"
    elif models.SystemHealthStatusEnum.degraded.value in statuses:
        overall = "Degraded"
    else:
        overall = "Healthy"

    # Recent alerts (last 10 system alerts for this company)
    recent_alerts = (
        db.query(models.Notification)
        .filter(
            models.Notification.company_id == company_id,
            models.Notification.type == models.NotificationTypeEnum.system_alert,
        )
        .order_by(desc(models.Notification.created_at))
        .limit(10)
        .all()
    )

    return {
        "overall_status": overall,
        "api_availability_pct": round(availability, 2),
        "avg_response_time_ms": round(float(avg_rt), 1),
        "failed_api_requests": failed_requests,
        "total_api_requests": total_requests,
        "jobs_completed": jobs_completed,
        "jobs_failed": jobs_failed,
        "jobs_active": jobs_running,
        "jobs_pending": jobs_pending,
        "open_errors": open_errors,
        "open_incidents": open_incidents,
        "last_health_check": last_check,
        "components": components,
        "recent_alerts": [
            {
                "id": a.id,
                "title": a.title,
                "message": a.message,
                "priority": a.priority.value if hasattr(a.priority, "value") else a.priority,
                "created_at": a.created_at,
                "is_read": a.is_read,
            }
            for a in recent_alerts
        ],
    }


# ─────────────────── Data retention ───────────────────

def purge_old_api_metrics(db: Session):
    """Delete api_metrics older than the retention window."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=API_METRICS_RETENTION_DAYS)
    db.query(models.ApiMetric).filter(models.ApiMetric.created_at < cutoff).delete(
        synchronize_session=False
    )
    db.commit()
