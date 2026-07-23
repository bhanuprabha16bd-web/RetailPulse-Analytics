from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

import models, schemas
from routers import audit_logs as audit
from database import get_db
from dependencies import get_current_company_user, scope_company_query, RoleChecker

allow_admin = RoleChecker([
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
    models.RoleEnum.analyst,
])

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("/", response_model=List[schemas.ProductOut], dependencies=[Depends(allow_admin)])
def get_inventory(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    # Inventory view is essentially the products view but we might compute available_stock and status on frontend
    products = scope_company_query(db.query(models.Product), current_user, models.Product).order_by(models.Product.name).all()
    return products


@router.get("/movements", response_model=List[schemas.StockMovementOut], dependencies=[Depends(allow_admin)])
def get_stock_movements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    movements = scope_company_query(db.query(models.StockMovement), current_user, models.StockMovement)\
        .order_by(desc(models.StockMovement.timestamp)).all()
    return movements

@router.post("/adjust", response_model=schemas.StockMovementOut, dependencies=[Depends(allow_admin)])
def adjust_stock(
    adjustment: schemas.StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == adjustment.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_stock = product.stock_quantity
    if adjustment.adjustment_type == "Stock Addition":
        new_stock = old_stock + adjustment.quantity
        movement_type = models.StockMovementEnum.stock_addition
        qty_changed = adjustment.quantity
    elif adjustment.adjustment_type == "Stock Removal":
        new_stock = old_stock - adjustment.quantity
        movement_type = models.StockMovementEnum.stock_removal
        qty_changed = -adjustment.quantity
    else: # Manual Adjustment
        new_stock = adjustment.quantity
        movement_type = models.StockMovementEnum.manual_adjustment
        qty_changed = new_stock - old_stock

    if new_stock < 0:
        raise HTTPException(status_code=422, detail="Stock cannot be negative")

    product.stock_quantity = new_stock
    
    movement = models.StockMovement(
        company_id=current_user.company_id,
        product_id=product.id,
        movement_type=movement_type,
        previous_quantity=old_stock,
        updated_quantity=new_stock,
        quantity_changed=qty_changed,
        reason=adjustment.reason,
        remarks=adjustment.remarks,
        user_id=current_user.id
    )
    db.add(movement)
    
    # Audit Log
    audit_log = models.AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="Stock Adjusted",
        target_name=product.name
    )
    db.add(audit_log)
    
    # Notifications and additional audits
    available = new_stock - product.reserved_stock
    old_available = old_stock - product.reserved_stock
    
    if available == 0 and old_available > 0:
        product.status = False
        db.add(models.AuditLog(company_id=current_user.company_id, user_id=current_user.id, action="Product Became Out of Stock", target_name=product.name))
        db.add(models.Notification(company_id=current_user.company_id, message=f"Product '{product.name}' is out of stock."))
    elif available <= product.reorder_level and old_available > product.reorder_level:
        db.add(models.AuditLog(company_id=current_user.company_id, user_id=current_user.id, action="Product Reached Low Stock", target_name=product.name))
        db.add(models.Notification(company_id=current_user.company_id, message=f"Low stock alert: '{product.name}' has only {available} available."))
    db.commit()
    db.refresh(movement)
    return movement
