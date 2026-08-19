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

from datetime import datetime, timedelta
from sqlalchemy import func
import math

# Forecasting uses the most recent 30 days of sales.  Reorder point is
# average daily demand × (lead time + safety-stock days); recommended stock
# covers that point plus the next 30-day demand cycle.
ANALYSIS_DAYS = 30
LEAD_TIME_DAYS = 7
SAFETY_STOCK_DAYS = 14


def build_recommendation(product, category_name: str, sales_map: dict[int, float]) -> schemas.InventoryRecommendationOut:
    total_sales = float(sales_map.get(product.id, 0) or 0)
    average_daily_sales = total_sales / ANALYSIS_DAYS
    forecasted_demand = average_daily_sales * ANALYSIS_DAYS
    current_stock = max(0, product.stock_quantity - product.reserved_stock)
    safety_stock = math.ceil(average_daily_sales * SAFETY_STOCK_DAYS)
    reorder_point = math.ceil(average_daily_sales * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS))
    days_remaining = round(current_stock / average_daily_sales, 1) if average_daily_sales > 0 else None

    if current_stock <= 0:
        risk = "Out of Stock"
    elif average_daily_sales == 0:
        risk = "Overstock" if current_stock > 0 else "Out of Stock"
    elif days_remaining < LEAD_TIME_DAYS:
        risk = "Stockout Risk"
    elif days_remaining < LEAD_TIME_DAYS + SAFETY_STOCK_DAYS:
        risk = "Low Stock"
    elif current_stock > max(reorder_point + forecasted_demand, 1) * 2:
        risk = "Overstock"
    else:
        risk = "Healthy"

    recommended_quantity = 0
    if average_daily_sales > 0 and current_stock <= reorder_point:
        target_stock = math.ceil(reorder_point + forecasted_demand)
        recommended_quantity = max(0, target_stock - current_stock)
        action = "Reorder Required"
    elif average_daily_sales == 0:
        action = "No demand history — review stock"
    elif risk == "Overstock":
        action = "Overstock Detected"
    else:
        action = "No Action Required"

    return schemas.InventoryRecommendationOut(
        product_id=product.id, category_id=product.category_id, product_name=product.name, sku=product.sku,
        category_name=category_name, supplier=product.brand,
        current_stock=current_stock, average_daily_sales=round(average_daily_sales, 2),
        forecasted_demand=round(forecasted_demand, 2), days_remaining=days_remaining,
        safety_stock=safety_stock, reorder_point=reorder_point,
        recommended_quantity=recommended_quantity, stock_risk=risk,
        recommendation_action=action,
    )

@router.get("/recommendations", response_model=schemas.InventoryRecommendationsResponse, dependencies=[Depends(allow_admin)])
def get_inventory_recommendations(
    category_id: int | None = Query(None),
    brand: str | None = Query(None),
    product_id: int | None = Query(None),
    stock_risk: str | None = Query(None),
    reorder_required: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    since = datetime.utcnow() - timedelta(days=ANALYSIS_DAYS)
    
    # Include zero-stock products even if a stock adjustment marked them inactive:
    # they are the most important products for replenishment analysis.
    products_query = scope_company_query(db.query(models.Product), current_user, models.Product)
    if category_id:
        products_query = products_query.filter(models.Product.category_id == category_id)
    if brand:
        products_query = products_query.filter(models.Product.brand == brand)
    if product_id:
        products_query = products_query.filter(models.Product.id == product_id)
        
    products = products_query.all()
    
    # Pre-fetch categories for fast lookup
    category_ids = {p.category_id for p in products}
    categories = db.query(models.Category).filter(models.Category.id.in_(category_ids)).all()
    category_map = {c.id: c.name for c in categories}
    
    # Pre-fetch 30-day sales data for these products
    sales_data = db.query(
        models.SaleItem.product_id,
        func.sum(models.SaleItem.quantity).label('total_sold')
    ).join(models.Sale).filter(
        models.Sale.company_id == current_user.company_id,
        models.Sale.created_at >= since
    ).group_by(models.SaleItem.product_id).all()
    
    sales_map = {row.product_id: row.total_sold for row in sales_data}
    
    recommendations: list[schemas.InventoryRecommendationOut] = []
    
    summary = {
        "reorder_count": 0,
        "stockout_risk_count": 0,
        "overstocked_count": 0,
        "healthy_count": 0
    }
    
    for p in products:
        recommendation = build_recommendation(p, category_map.get(p.category_id, "Unknown"), sales_map)
        if stock_risk and stock_risk.lower() != recommendation.stock_risk.lower():
            continue
            
        if reorder_required is not None:
            if reorder_required and recommendation.recommendation_action != "Reorder Required":
                continue
            if not reorder_required and recommendation.recommendation_action == "Reorder Required":
                continue
                
        # Update summary counts (before filters to show global status, or after? Usually summary is global, but filtering might want filtered summary. Let's do filtered summary for now)
        if recommendation.stock_risk in {"Out of Stock", "Stockout Risk"}:
            summary["stockout_risk_count"] += 1
        elif recommendation.stock_risk == "Overstock":
            summary["overstocked_count"] += 1
        elif recommendation.stock_risk == "Healthy":
            summary["healthy_count"] += 1
            
        if recommendation.recommendation_action == "Reorder Required":
            summary["reorder_count"] += 1
        recommendations.append(recommendation)
        
    return schemas.InventoryRecommendationsResponse(
        summary=schemas.InventoryForecastSummaryOut(**summary),
        recommendations=recommendations
    )


@router.get("/forecast", response_model=schemas.InventoryRecommendationsResponse, dependencies=[Depends(allow_admin)])
def get_inventory_forecast(
    category_id: int | None = Query(None), brand: str | None = Query(None), product_id: int | None = Query(None),
    stock_risk: str | None = Query(None), reorder_required: bool | None = Query(None),
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user),
):
    """Alias kept for the dedicated forecasting dashboard route."""
    return get_inventory_recommendations(category_id, brand, product_id, stock_risk, reorder_required, db, current_user)


@router.get("/recommendations/{product_id}", response_model=schemas.InventoryRecommendationOut, dependencies=[Depends(allow_admin)])
def get_product_recommendation(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    since = datetime.utcnow() - timedelta(days=ANALYSIS_DAYS)
    total_sales = db.query(func.sum(models.SaleItem.quantity)).join(models.Sale).filter(
        models.Sale.company_id == current_user.company_id,
        models.SaleItem.product_id == product_id,
        models.Sale.created_at >= since,
    ).scalar() or 0
    category = db.query(models.Category).filter(models.Category.id == product.category_id).first()
    return build_recommendation(product, category.name if category else "Unknown", {product_id: total_sales})

