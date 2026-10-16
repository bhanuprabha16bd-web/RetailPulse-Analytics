import json, enum
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import models, schemas, audit
from database import get_db
from dependencies import RoleChecker, get_current_active_user
from services.notification_service import create_notification
from models import NotificationTypeEnum, NotificationPriorityEnum, RoleEnum, WorkflowStatusEnum

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

def generate_request_id(db, company_id):
    count = db.query(func.count(models.WorkflowRequest.id)).filter_by(company_id=company_id).scalar() or 0
    return f"REQ-{str(count+1).zfill(4)}"

def add_history(db, request_id, action, from_status, to_status, performed_by, note=None):
    h = models.WorkflowHistory(
        request_id=request_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        performed_by=performed_by,
        note=note
    )
    db.add(h)

def serialize_request(req: models.WorkflowRequest) -> dict:
    current_values = None
    requested_values = None
    try:
        if req.current_values:
            current_values = json.loads(req.current_values)
        if req.requested_values:
            requested_values = json.loads(req.requested_values)
    except Exception:
        pass

    history = []
    for h in (req.history or []):
        performer_name = h.user.name if h.user else None
        history.append(schemas.WorkflowHistoryOut(
            id=h.id,
            action=h.action,
            from_status=h.from_status,
            to_status=h.to_status,
            performed_by=h.performed_by,
            performer_name=performer_name,
            note=h.note,
            created_at=h.created_at,
        ))

    comments = []
    for c in (req.comments or []):
        author_name = c.author.name if c.author else None
        comments.append(schemas.WorkflowCommentOut(
            id=c.id,
            comment=c.comment,
            commented_by=c.commented_by,
            author_name=author_name,
            created_at=c.created_at,
        ))

    return schemas.WorkflowRequestOut(
        id=req.id,
        request_id=req.request_id,
        company_id=req.company_id,
        request_type=req.request_type.value,
        requested_by=req.requested_by,
        requester_name=req.requester.name if req.requester else None,
        requester_email=req.requester.email if req.requester else None,
        related_record_type=req.related_record_type,
        related_record_id=req.related_record_id,
        related_record_label=req.related_record_label,
        current_values=current_values,
        requested_values=requested_values,
        reason=req.reason,
        priority=req.priority.value,
        status=req.status.value,
        reviewed_by=req.reviewed_by,
        reviewer_name=req.reviewer.name if req.reviewer else None,
        reviewed_at=req.reviewed_at,
        rejection_reason=req.rejection_reason,
        created_at=req.created_at,
        updated_at=req.updated_at,
        history=history,
        comments=comments,
    )

def apply_workflow_change(db, req, current_user):
    """Apply the underlying business change when a request is approved."""
    rv = json.loads(req.requested_values) if req.requested_values else {}
    
    if req.request_type == models.WorkflowRequestTypeEnum.product_price_change:
        product = db.query(models.Product).filter_by(
            id=req.related_record_id, company_id=req.company_id
        ).first()
        if product:
            product.unit_price = float(rv.get("price", product.unit_price))
            
    elif req.request_type == models.WorkflowRequestTypeEnum.stock_adjustment:
        product = db.query(models.Product).filter_by(
            id=req.related_record_id, company_id=req.company_id
        ).first()
        if product:
            new_qty = int(rv.get("stock", product.stock_quantity))
            prev_qty = product.stock_quantity
            product.stock_quantity = new_qty
            movement = models.StockMovement(
                company_id=req.company_id,
                product_id=product.id,
                movement_type=models.StockMovementEnum.manual_adjustment,
                previous_quantity=prev_qty,
                updated_quantity=new_qty,
                quantity_changed=new_qty - prev_qty,
                reason=f"Workflow approval: {req.request_id}",
                user_id=current_user.id
            )
            db.add(movement)
            
    elif req.request_type == models.WorkflowRequestTypeEnum.product_deactivation:
        product = db.query(models.Product).filter_by(
            id=req.related_record_id, company_id=req.company_id
        ).first()
        if product:
            product.status = False
            
    elif req.request_type == models.WorkflowRequestTypeEnum.customer_info_change:
        customer = db.query(models.Customer).filter_by(
            id=req.related_record_id, company_id=req.company_id
        ).first()
        if customer:
            for field, value in rv.items():
                if hasattr(customer, field) and field not in ('id', 'company_id', 'customer_id'):
                    setattr(customer, field, value)
                    
    elif req.request_type == models.WorkflowRequestTypeEnum.inventory_import_approval:
        imp = db.query(models.DataImport).filter_by(
            id=req.related_record_id, company_id=req.company_id
        ).first()
        if imp:
            imp.status = models.DataImportStatusEnum.pending


# Endpoints

@router.get("/stats", response_model=schemas.WorkflowStatsOut)
def get_workflow_stats(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    q = db.query(models.WorkflowRequest).filter_by(company_id=current_user.company_id)
    total = q.count()
    pending = q.filter_by(status=WorkflowStatusEnum.pending_approval).count()
    approved = q.filter_by(status=WorkflowStatusEnum.approved).count()
    rejected = q.filter_by(status=WorkflowStatusEnum.rejected).count()
    cancelled = q.filter_by(status=WorkflowStatusEnum.cancelled).count()
    return schemas.WorkflowStatsOut(
        total_requests=total,
        pending_approval=pending,
        approved=approved,
        rejected=rejected,
        cancelled=cancelled
    )

@router.get("/pending-count")
def get_pending_count(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    count = db.query(models.WorkflowRequest).filter_by(
        company_id=current_user.company_id,
        status=WorkflowStatusEnum.pending_approval
    ).count()
    return {"count": count}

@router.post("/", response_model=schemas.WorkflowRequestOut)
def create_workflow_request(req_in: schemas.WorkflowRequestCreate, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    req_type_enum = models.WorkflowRequestTypeEnum(req_in.request_type)
    priority_enum = models.WorkflowPriorityEnum(req_in.priority)
    
    cv_str = json.dumps(req_in.current_values) if req_in.current_values else None
    rv_str = json.dumps(req_in.requested_values) if req_in.requested_values else None

    req = models.WorkflowRequest(
        request_id=generate_request_id(db, current_user.company_id),
        company_id=current_user.company_id,
        request_type=req_type_enum,
        requested_by=current_user.id,
        related_record_type=req_in.related_record_type,
        related_record_id=req_in.related_record_id,
        related_record_label=req_in.related_record_label,
        current_values=cv_str,
        requested_values=rv_str,
        reason=req_in.reason,
        priority=priority_enum,
        status=WorkflowStatusEnum.pending_approval
    )
    db.add(req)
    db.flush()

    add_history(db, req.id, "Request Created", None, WorkflowStatusEnum.pending_approval.value, current_user.id)
    
    approvers = db.query(models.User).filter(
        models.User.company_id == current_user.company_id,
        models.User.role.in_([RoleEnum.company_admin, RoleEnum.company_owner])
    ).all()
    for approver in approvers:
        create_notification(
            db, 
            company_id=current_user.company_id,
            user_id=approver.id,
            type=NotificationTypeEnum.system_alert,
            title="New Approval Request",
            message=f"{req_in.request_type} request {req.request_id} submitted by {current_user.name} requires your review.",
            priority=NotificationPriorityEnum.medium,
            prevent_duplicate_hours=0
        )
        
    audit.record_audit_log(
        db,
        request,
        current_user, 
        action="WORKFLOW_REQUEST_CREATED",
        resource_type="Workflow",
        resource_id=req.request_id,
        description=f"Created {req_in.request_type} request",
        before_values=None,
        after_values=cv_str
    )
    
    db.commit()
    db.refresh(req)
    return serialize_request(req)

@router.get("/", response_model=List[schemas.WorkflowRequestOut])
def list_workflow_requests(
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    my_requests: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_active_user)
):
    q = db.query(models.WorkflowRequest).filter_by(company_id=current_user.company_id)
    
    if my_requests or current_user.role not in (RoleEnum.company_admin, RoleEnum.company_owner):
        q = q.filter_by(requested_by=current_user.id)
        
    if status:
        q = q.filter_by(status=status)
    if request_type:
        q = q.filter_by(request_type=request_type)
    if search:
        s = f"%{search}%"
        q = q.filter(
            (models.WorkflowRequest.request_id.ilike(s)) |
            (models.WorkflowRequest.related_record_label.ilike(s)) |
            (models.WorkflowRequest.reason.ilike(s))
        )
        
    q = q.order_by(desc(models.WorkflowRequest.created_at))
    offset = (page - 1) * limit
    reqs = q.offset(offset).limit(limit).all()
    
    out = []
    for r in reqs:
        s_obj = serialize_request(r)
        s_obj.history = []
        s_obj.comments = []
        out.append(s_obj)
    return out

@router.get("/{request_id_str}", response_model=schemas.WorkflowRequestOut)
def get_workflow_request(request_id_str: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    req = db.query(models.WorkflowRequest).filter_by(
        company_id=current_user.company_id, request_id=request_id_str
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return serialize_request(req)

@router.post("/{request_id_str}/approve", response_model=schemas.WorkflowRequestOut)
def approve_workflow_request(request_id_str: str, body: schemas.WorkflowApproveRequest, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(RoleChecker([RoleEnum.company_admin, RoleEnum.company_owner]))):
    req = db.query(models.WorkflowRequest).filter_by(
        company_id=current_user.company_id, request_id=request_id_str
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.status != WorkflowStatusEnum.pending_approval:
        raise HTTPException(status_code=400, detail="Request is not in pending state")
        
    config = db.query(models.WorkflowConfig).filter_by(
        company_id=current_user.company_id, request_type=req.request_type
    ).first()
    allow_self = config.allow_self_approve if config else False
    
    if req.requested_by == current_user.id and not allow_self:
        raise HTTPException(status_code=403, detail="Cannot approve own request")
        
    if body.comment:
        c = models.WorkflowComment(
            request_id=req.id,
            company_id=current_user.company_id,
            comment=body.comment,
            commented_by=current_user.id
        )
        db.add(c)
        
    apply_workflow_change(db, req, current_user)
    
    req.status = WorkflowStatusEnum.approved
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)
    
    add_history(db, req.id, "Approved", WorkflowStatusEnum.pending_approval.value, WorkflowStatusEnum.approved.value, current_user.id)
    
    create_notification(
        db,
        company_id=current_user.company_id,
        user_id=req.requested_by,
        type=NotificationTypeEnum.system_alert,
        title="Request Approved",
        message=f"Your {req.request_type.value} request {req.request_id} has been approved.",
        priority=NotificationPriorityEnum.medium,
        prevent_duplicate_hours=0
    )
    
    audit.record_audit_log(
        db,
        request,
        current_user,
        action="WORKFLOW_APPROVED",
        resource_type="Workflow",
        resource_id=req.request_id,
        description=f"Approved {req.request_type.value} request"
    )
    
    db.commit()
    db.refresh(req)
    return serialize_request(req)

@router.post("/{request_id_str}/reject", response_model=schemas.WorkflowRequestOut)
def reject_workflow_request(request_id_str: str, body: schemas.WorkflowRejectRequest, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(RoleChecker([RoleEnum.company_admin, RoleEnum.company_owner]))):
    req = db.query(models.WorkflowRequest).filter_by(
        company_id=current_user.company_id, request_id=request_id_str
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.status != WorkflowStatusEnum.pending_approval:
        raise HTTPException(status_code=400, detail="Request is not in pending state")
        
    if body.comment:
        c = models.WorkflowComment(
            request_id=req.id,
            company_id=current_user.company_id,
            comment=body.comment,
            commented_by=current_user.id
        )
        db.add(c)
        
    req.status = WorkflowStatusEnum.rejected
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)
    req.rejection_reason = body.rejection_reason
    
    add_history(db, req.id, "Rejected", WorkflowStatusEnum.pending_approval.value, WorkflowStatusEnum.rejected.value, current_user.id, note=body.rejection_reason)
    
    create_notification(
        db,
        company_id=current_user.company_id,
        user_id=req.requested_by,
        type=NotificationTypeEnum.system_alert,
        title="Request Rejected",
        message=f"Your {req.request_type.value} request {req.request_id} has been rejected. Reason: {body.rejection_reason}",
        priority=NotificationPriorityEnum.medium,
        prevent_duplicate_hours=0
    )
    
    audit.record_audit_log(
        db,
        request,
        current_user,
        action="WORKFLOW_REJECTED",
        resource_type="Workflow",
        resource_id=req.request_id,
        description=f"Rejected {req.request_type.value} request"
    )
    
    db.commit()
    db.refresh(req)
    return serialize_request(req)

@router.post("/{request_id_str}/cancel", response_model=schemas.WorkflowRequestOut)
def cancel_workflow_request(request_id_str: str, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    req = db.query(models.WorkflowRequest).filter_by(
        company_id=current_user.company_id, request_id=request_id_str
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.requested_by != current_user.id and current_user.role not in (RoleEnum.company_admin, RoleEnum.company_owner):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this request")
        
    if req.status not in (WorkflowStatusEnum.pending_approval, WorkflowStatusEnum.submitted):
        raise HTTPException(status_code=400, detail="Cannot cancel request in current state")
        
    old_status = req.status.value
    req.status = WorkflowStatusEnum.cancelled
    
    add_history(db, req.id, "Cancelled", old_status, WorkflowStatusEnum.cancelled.value, current_user.id)
    
    create_notification(
        db,
        company_id=current_user.company_id,
        user_id=req.requested_by,
        type=NotificationTypeEnum.system_alert,
        title="Request Cancelled",
        message=f"Your {req.request_type.value} request {req.request_id} has been cancelled.",
        priority=NotificationPriorityEnum.medium,
        prevent_duplicate_hours=0
    )
    
    audit.record_audit_log(
        db,
        request,
        current_user,
        action="WORKFLOW_CANCELLED",
        resource_type="Workflow",
        resource_id=req.request_id,
        description=f"Cancelled {req.request_type.value} request"
    )
    
    db.commit()
    db.refresh(req)
    return serialize_request(req)

@router.post("/{request_id_str}/comments", response_model=schemas.WorkflowCommentOut)
def add_workflow_comment(request_id_str: str, body: schemas.WorkflowAddComment, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    req = db.query(models.WorkflowRequest).filter_by(
        company_id=current_user.company_id, request_id=request_id_str
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    c = models.WorkflowComment(
        request_id=req.id,
        company_id=current_user.company_id,
        comment=body.comment,
        commented_by=current_user.id
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    
    return schemas.WorkflowCommentOut(
        id=c.id,
        comment=c.comment,
        commented_by=c.commented_by,
        author_name=current_user.name,
        created_at=c.created_at
    )

@router.get("/config", response_model=List[schemas.WorkflowConfigOut])
def get_workflow_config(db: Session = Depends(get_db), current_user: models.User = Depends(RoleChecker([RoleEnum.company_admin, RoleEnum.company_owner]))):
    configs = db.query(models.WorkflowConfig).filter_by(company_id=current_user.company_id).all()
    existing_types = {c.request_type.value for c in configs}
    
    added = False
    for req_type in models.WorkflowRequestTypeEnum:
        if req_type.value not in existing_types:
            c = models.WorkflowConfig(
                company_id=current_user.company_id,
                request_type=req_type
            )
            db.add(c)
            configs.append(c)
            added = True
            
    if added:
        db.commit()
        for c in configs:
            db.refresh(c)
            
    out = []
    for c in configs:
        out.append(schemas.WorkflowConfigOut(
            id=c.id,
            company_id=c.company_id,
            request_type=c.request_type.value,
            approver_role=c.approver_role.value,
            require_reason=c.require_reason,
            allow_self_approve=c.allow_self_approve,
            is_active=c.is_active,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))
    return out

@router.put("/config/{config_id}", response_model=schemas.WorkflowConfigOut)
def update_workflow_config(config_id: int, body: schemas.WorkflowConfigUpdate, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(RoleChecker([RoleEnum.company_admin, RoleEnum.company_owner]))):
    c = db.query(models.WorkflowConfig).filter_by(
        id=config_id, company_id=current_user.company_id
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Config not found")
        
    if body.approver_role is not None:
        c.approver_role = models.RoleEnum(body.approver_role)
    if body.require_reason is not None:
        c.require_reason = body.require_reason
    if body.allow_self_approve is not None:
        c.allow_self_approve = body.allow_self_approve
    if body.is_active is not None:
        c.is_active = body.is_active
        
    c.updated_at = datetime.now(timezone.utc)
    
    audit.record_audit_log(
        db,
        request,
        current_user,
        action="WORKFLOW_CONFIG_UPDATED",
        resource_type="WorkflowConfig",
        resource_id=str(c.id),
        description=f"Updated config for {c.request_type.value}"
    )
    
    db.commit()
    db.refresh(c)
    
    return schemas.WorkflowConfigOut(
        id=c.id,
        company_id=c.company_id,
        request_type=c.request_type.value,
        approver_role=c.approver_role.value,
        require_reason=c.require_reason,
        allow_self_approve=c.allow_self_approve,
        is_active=c.is_active,
        created_at=c.created_at,
        updated_at=c.updated_at
    )
