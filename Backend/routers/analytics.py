from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

import models, schemas
from database import get_db
from dependencies import get_current_company_user, scope_company_query
import audit

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/kpis")
def get_kpis(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    product_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    brand: Optional[str] = Query(None),
    sales_channel: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_company_user)
):
    # Base queries
    sales_query = scope_company_query(db.query(models.Sale), current_user, models.Sale)
    products_query = scope_company_query(db.query(models.Product), current_user, models.Product)
    categories_query = scope_company_query(db.query(models.Category), current_user, models.Category)
    sale_items_query = db.query(models.SaleItem).join(models.Sale).filter(models.Sale.company_id == current_user.company_id)
    
    # Needs joins for filtering
    if product_id or category_id or brand:
        sales_query = sales_query.join(models.SaleItem).join(models.Product)
        sale_items_query = sale_items_query.join(models.Product)
    
    # 1. Apply Filters
    if start_date:
        sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        sales_query = sales_query.filter(models.Sale.created_at >= sd)
        sale_items_query = sale_items_query.filter(models.Sale.created_at >= sd)
    if end_date:
        ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        sales_query = sales_query.filter(models.Sale.created_at <= ed)
        sale_items_query = sale_items_query.filter(models.Sale.created_at <= ed)
        
    if sales_channel:
        sales_query = sales_query.filter(models.Sale.sales_channel == sales_channel)
        sale_items_query = sale_items_query.filter(models.Sale.sales_channel == sales_channel)
    if payment_method:
        sales_query = sales_query.filter(models.Sale.payment_method == payment_method)
        sale_items_query = sale_items_query.filter(models.Sale.payment_method == payment_method)
        
    if product_id:
        sales_query = sales_query.filter(models.SaleItem.product_id == product_id)
        products_query = products_query.filter(models.Product.id == product_id)
        sale_items_query = sale_items_query.filter(models.SaleItem.product_id == product_id)
    if category_id:
        sales_query = sales_query.filter(models.Product.category_id == category_id)
        products_query = products_query.filter(models.Product.category_id == category_id)
        sale_items_query = sale_items_query.filter(models.Product.category_id == category_id)
    if brand:
        sales_query = sales_query.filter(models.Product.brand == brand)
        products_query = products_query.filter(models.Product.brand == brand)
        sale_items_query = sale_items_query.filter(models.Product.brand == brand)

    # Calculate KPIs
    sales_stats = sales_query.with_entities(
        func.count(func.distinct(models.Sale.id)).label("total_orders"),
        func.sum(models.Sale.total_amount).label("total_revenue")
    ).first()
    
    total_orders = sales_stats.total_orders or 0
    total_revenue = sales_stats.total_revenue or 0.0
    avg_order_value = (total_revenue / total_orders) if total_orders > 0 else 0.0
    
    total_products_sold = sale_items_query.with_entities(func.sum(models.SaleItem.quantity)).scalar() or 0
    
    inventory_stats = products_query.all()
    
    total_inventory_value = 0.0
    low_stock = 0
    out_of_stock = 0
    
    for p in inventory_stats:
        total_inventory_value += (p.stock_quantity * p.unit_price)
        available = p.stock_quantity - p.reserved_stock
        if available <= 0:
            out_of_stock += 1
        elif available <= p.reorder_level:
            low_stock += 1
            
    total_categories = categories_query.filter(models.Category.status == True).count()
    
    # Charts
    # Revenue Trend (Daily over filtered period, or last 30 days default)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    trend_query = sales_query
    if not start_date:
        trend_query = trend_query.filter(models.Sale.created_at >= thirty_days_ago)
        
    daily_sales = trend_query.with_entities(
            func.date(models.Sale.created_at).label("date"),
            func.sum(models.Sale.total_amount).label("revenue")
        ).group_by(func.date(models.Sale.created_at)).order_by(func.date(models.Sale.created_at)).all()
    revenue_trend = [{"date": str(d.date), "revenue": float(d.revenue)} for d in daily_sales]
    
    # Top Products
    top_items = sale_items_query.with_entities(
        models.SaleItem.product_id,
        func.sum(models.SaleItem.quantity).label("total_qty"),
        func.sum(models.SaleItem.total).label("total_rev")
    ).group_by(models.SaleItem.product_id).order_by(desc("total_qty")).limit(10).all()
    
    top_products = []
    for item in top_items:
        # We need the product name regardless of filters for top items if it matches the current filter
        p = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if p:
            top_products.append({"name": p.name, "quantity_sold": item.total_qty, "revenue": float(item.total_rev)})

    # Sales by Payment Method
    payment_stats = sales_query.with_entities(
        models.Sale.payment_method, func.sum(models.Sale.total_amount).label("revenue")
    ).group_by(models.Sale.payment_method).all()
    sales_by_payment = [{"name": str(p.payment_method.value), "value": float(p.revenue)} for p in payment_stats if p.revenue]

    # Sales by Channel
    channel_stats = sales_query.with_entities(
        models.Sale.sales_channel, func.sum(models.Sale.total_amount).label("revenue")
    ).group_by(models.Sale.sales_channel).all()
    sales_by_channel = [{"name": str(c.sales_channel.value).replace('_', ' ').title(), "value": float(c.revenue)} for c in channel_stats if c.revenue]

    # Inventory Distribution by Category
    inv_by_cat = []
    cat_inv_stats = db.query(
        models.Category.name, func.sum(models.Product.stock_quantity).label("qty")
    ).join(models.Product).filter(models.Product.company_id == current_user.company_id).group_by(models.Category.name).all()
    for c in cat_inv_stats:
        inv_by_cat.append({"name": c.name, "quantity": c.qty or 0})

    # Top Low Stock Products (Top 5 lowest available stock)
    top_low_stock = []
    low_stock_prods = products_query.filter(models.Product.stock_quantity - models.Product.reserved_stock > 0)        .filter(models.Product.stock_quantity - models.Product.reserved_stock <= models.Product.reorder_level)        .order_by((models.Product.stock_quantity - models.Product.reserved_stock).asc()).limit(5).all()
    for p in low_stock_prods:
        top_low_stock.append({"name": p.name, "available": p.stock_quantity - p.reserved_stock, "reorder_level": p.reorder_level})

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_products_sold": total_products_sold,
        "average_order_value": avg_order_value,
        "total_inventory_value": total_inventory_value,
        "low_stock_products": low_stock,
        "out_of_stock_products": out_of_stock,
        "total_categories": total_categories,
        "revenue_trend": revenue_trend,
        "top_products": top_products,
        "sales_by_payment": sales_by_payment,
        "sales_by_channel": sales_by_channel,
        "inventory_by_category": inv_by_cat,
        "top_low_stock": top_low_stock
    }

class AuditEvent(schemas.BaseModel):
    action: str
    export_type: Optional[str] = None

@router.post("/audit")
def record_dashboard_audit(
    event: AuditEvent,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user)
):
    action_str = event.action
    if event.export_type:
        action_str += f" ({event.export_type})"
    audit.record_audit_log(db, request, current_user, action_str, target_name="Analytics Dashboard")
    db.commit()
    return {"message": "Audit recorded"}
