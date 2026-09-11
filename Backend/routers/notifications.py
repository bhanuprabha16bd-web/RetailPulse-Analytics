from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from dependencies import get_current_company_user, scope_company_query
from database import get_db
from datetime import datetime, timezone

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def get_user_notifications_query(db: Session, current_user: models.User):
    # Only return notifications for the company, and either global to the company (user_id=None) or specific to the user
    query = scope_company_query(db.query(models.Notification), current_user, models.Notification)
    # Role based logic can go here. For now, analysts see global + their own, viewers maybe only theirs? 
    # The requirement says Admin gets all, Analyst gets analytics/inventory. 
    # We will enforce user_id matching if the notification is user-specific. 
    # If user_id is null, it's a company-wide alert (like stockout), so admins/analysts can see it.
    
    if current_user.role == models.RoleEnum.viewer:
        query = query.filter(models.Notification.user_id == current_user.id)
    else:
        query = query.filter(
            (models.Notification.user_id == current_user.id) | (models.Notification.user_id == None)
        )
    return query

@router.get("", response_model=schemas.PaginatedNotificationsOut)
@router.get("/", response_model=schemas.PaginatedNotificationsOut)
def get_notifications(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_company_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = Query(None),
    type: Optional[models.NotificationTypeEnum] = Query(None),
    priority: Optional[models.NotificationPriorityEnum] = Query(None),
):
    query = get_user_notifications_query(db, current_user)
    
    if is_read is not None:
        query = query.filter(models.Notification.is_read == is_read)
    if type is not None:
        query = query.filter(models.Notification.type == type)
    if priority is not None:
        query = query.filter(models.Notification.priority == priority)
        
    total = query.count()
    notifications = query.order_by(models.Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "notifications": notifications,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    query = get_user_notifications_query(db, current_user)
    count = query.filter(models.Notification.is_read == False).count()
    return {"count": count}

@router.patch("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    notification = get_user_notifications_query(db, current_user).filter(models.Notification.id == notification_id).first()
    if notification and not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"status": "success"}

@router.patch("/read-all")
def mark_all_as_read(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    notifications = get_user_notifications_query(db, current_user).filter(models.Notification.is_read == False).all()
    now = datetime.now(timezone.utc)
    for n in notifications:
        n.is_read = True
        n.read_at = now
    db.commit()
    return {"status": "success"}
