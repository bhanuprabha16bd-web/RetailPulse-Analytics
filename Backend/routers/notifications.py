from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from dependencies import get_current_company_user, scope_company_query
from database import get_db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/", response_model=List[schemas.NotificationOut])
def get_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    return scope_company_query(db.query(models.Notification), current_user, models.Notification).order_by(models.Notification.created_at.desc()).limit(20).all()

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    notification = scope_company_query(db.query(models.Notification), current_user, models.Notification).filter(models.Notification.id == notification_id).first()
    if notification:
        notification.is_read = True
        db.commit()
    return {"status": "success"}

@router.put("/read-all")
def mark_all_as_read(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    notifications = scope_company_query(db.query(models.Notification), current_user, models.Notification).filter(models.Notification.is_read == False).all()
    for n in notifications:
        n.is_read = True
    db.commit()
    return {"status": "success"}
