from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, cast, String
import models
from models import NotificationTypeEnum, NotificationPriorityEnum
from datetime import datetime, timedelta, timezone

def create_notification(
    db: Session,
    company_id: int,
    type: NotificationTypeEnum,
    title: str,
    message: str,
    priority: NotificationPriorityEnum = NotificationPriorityEnum.medium,
    user_id: int = None,
    resource_type: str = None,
    resource_id: str = None,
    prevent_duplicate_hours: int = 24
):
    """
    Creates a notification if an active (unread) duplicate doesn't exist.
    If an identical notification was created within prevent_duplicate_hours, it is skipped.
    """
    # Duplicate check logic
    if prevent_duplicate_hours > 0:
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=prevent_duplicate_hours)
        query = db.query(models.Notification).filter(
            models.Notification.company_id == company_id,
            models.Notification.type == type,
            models.Notification.resource_type == resource_type,
            models.Notification.resource_id == resource_id,
            models.Notification.created_at >= cutoff_time
        )
        
        # If user_id is specified, scope duplicate check to user
        if user_id:
            query = query.filter(models.Notification.user_id == user_id)
            
        existing = query.first()
        if existing:
            # Duplicate found, skip creation
            return None

    notification = models.Notification(
        company_id=company_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        priority=priority,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None
    )
    db.add(notification)
    return notification

def evaluate_product_stock_alert(db: Session, product: models.Product):
    """
    Evaluates product stock and triggers appropriate alerts.
    Stock = 0 -> Stockout Risk (Critical)
    Stock <= Reorder Point -> Low Stock (Medium/High depending on velocity or just Medium)
    """
    if not product.status:
        return

    available_stock = product.stock_quantity - product.reserved_stock
    
    if available_stock <= 0:
        create_notification(
            db=db,
            company_id=product.company_id,
            type=NotificationTypeEnum.stockout_risk,
            title="Stockout Risk Alert",
            message=f"{product.name} is expected to reach stockout.",
            priority=NotificationPriorityEnum.critical,
            resource_type="Product",
            resource_id=str(product.id),
            prevent_duplicate_hours=12 # Re-alert every 12 hours if still out of stock
        )
    elif available_stock <= product.reorder_level:
        create_notification(
            db=db,
            company_id=product.company_id,
            type=NotificationTypeEnum.low_stock,
            title="Low Stock Alert",
            message=f"{product.name} stock is below reorder point ({available_stock} remaining).",
            priority=NotificationPriorityEnum.medium,
            resource_type="Product",
            resource_id=str(product.id),
            prevent_duplicate_hours=24 # Re-alert daily
        )

def create_system_alert(db: Session, company_id: int, title: str, message: str, priority=NotificationPriorityEnum.low):
    create_notification(
        db=db,
        company_id=company_id,
        type=NotificationTypeEnum.system_alert,
        title=title,
        message=message,
        priority=priority,
        prevent_duplicate_hours=0
    )

def create_import_alert(db: Session, import_record: models.DataImport, is_success: bool, errors_count: int = 0):
    if is_success:
        if errors_count > 0:
            title = "Import Completed with Errors"
            message = f"{import_record.import_type.value} import completed. {import_record.successful_records} records imported, {errors_count} failed."
            priority = NotificationPriorityEnum.medium
            ntype = NotificationTypeEnum.import_completed
        else:
            title = "Import Completed"
            message = f"{import_record.import_type.value} import completed successfully. {import_record.successful_records} records imported."
            priority = NotificationPriorityEnum.low
            ntype = NotificationTypeEnum.import_completed
    else:
        title = "Import Failed"
        message = f"{import_record.import_type.value} import failed."
        priority = NotificationPriorityEnum.high
        ntype = NotificationTypeEnum.import_failed

    create_notification(
        db=db,
        company_id=import_record.company_id,
        user_id=import_record.uploaded_by,
        type=ntype,
        title=title,
        message=message,
        priority=priority,
        resource_type="Import",
        resource_id=str(import_record.id),
        prevent_duplicate_hours=0
    )
