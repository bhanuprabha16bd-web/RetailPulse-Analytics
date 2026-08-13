from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional

import models, schemas
from database import get_db
from dependencies import get_current_company_user, scope_company_query
import audit

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _apply_sales_filters(query, start_date, end_date, product_id, category_id, brand,
                         sales_channel, payment_method, customer_id=None):
    """Apply the shared Sales Analytics filter set to a Sale query."""
    if start_date:
        query = query.filter(models.Sale.created_at >= start_date)
    if end_date:
        query = query.filter(models.Sale.created_at <= end_date)
    if sales_channel:
        query = query.filter(models.Sale.sales_channel == sales_channel)
    if payment_method:
        query = query.filter(models.Sale.payment_method == payment_method)
    if customer_id:
        query = query.filter(models.Sale.customer_id == customer_id)
    if product_id or category_id or brand:
        query = query.join(models.SaleItem).join(models.Product)
        if product_id:
            query = query.filter(models.SaleItem.product_id == product_id)
        if category_id:
            query = query.filter(models.Product.category_id == category_id)
        if brand:
            query = query.filter(models.Product.brand == brand)
        # A sale can have several matching items; never allow that to inflate KPIs.
        query = query.distinct()
    return query


@router.get("/sales")
def get_sales_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    product_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None),
    brand: Optional[str] = Query(None),
    sales_channel: Optional[models.SalesChannelEnum] = Query(None),
    payment_method: Optional[models.PaymentMethodEnum] = Query(None),
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    product_sort: str = Query("revenue", pattern="^(revenue|units_sold)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    """Sales-only BI aggregates. All values are scoped to the authenticated company."""
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=422, detail="Start date must be before or equal to end date.")
    sales = _apply_sales_filters(
        scope_company_query(db.query(models.Sale), current_user, models.Sale),
        start_date, end_date, product_id, category_id, brand, sales_channel, payment_method, customer_id,
    )
    sale_ids = [row[0] for row in sales.with_entities(models.Sale.id).all()]
    if not sale_ids:
        return {
            "kpis": {"total_revenue": 0, "total_orders": 0, "average_order_value": 0,
                     "total_items_sold": 0, "total_discount": 0, "total_tax": 0},
            "sales_overview": [], "sales_vs_orders": [], "top_products": [],
            "top_customers": [], "payment_analysis": [], "recent_sales": [],
        }

    totals = db.query(
        func.count(models.Sale.id), func.coalesce(func.sum(models.Sale.total_amount), 0)
    ).filter(models.Sale.id.in_(sale_ids)).one()
    item_totals = db.query(
        func.coalesce(func.sum(models.SaleItem.quantity), 0),
        func.coalesce(func.sum(models.SaleItem.discount), 0),
        func.coalesce(func.sum(models.SaleItem.tax), 0),
    ).filter(models.SaleItem.sale_id.in_(sale_ids)).one()

    # SQL aggregation keeps the transaction-level data in the database.
    if interval == "monthly":
        period = func.strftime("%Y-%m", models.Sale.created_at)
    elif interval == "weekly":
        period = func.strftime("%Y-W%W", models.Sale.created_at)
    else:
        period = func.date(models.Sale.created_at)
    timeline = db.query(
        period.label("period"), func.coalesce(func.sum(models.Sale.total_amount), 0).label("revenue"),
        func.count(models.Sale.id).label("orders"),
    ).filter(models.Sale.id.in_(sale_ids)).group_by(period).order_by(period).all()

    product_order = desc("units_sold") if product_sort == "units_sold" else desc("revenue")
    products = db.query(
        models.Product.name.label("name"),
        func.coalesce(func.sum(models.SaleItem.quantity), 0).label("units_sold"),
        func.coalesce(func.sum(models.SaleItem.total), 0).label("revenue"),
    ).join(models.SaleItem, models.SaleItem.product_id == models.Product.id) \
     .filter(models.SaleItem.sale_id.in_(sale_ids)) \
     .group_by(models.Product.id, models.Product.name) \
     .order_by(product_order).limit(10).all()

    customer_name = func.coalesce(models.Customer.full_name, models.Sale.customer_name, "Walk-in customer")
    customers = db.query(
        customer_name.label("name"),
        func.count(models.Sale.id).label("orders"),
        func.coalesce(func.sum(models.Sale.total_amount), 0).label("total_spend"),
    ).outerjoin(models.Customer, models.Customer.id == models.Sale.customer_id) \
     .filter(models.Sale.id.in_(sale_ids)) \
     .group_by(customer_name).order_by(desc("total_spend")).limit(10).all()

    payments = db.query(
        models.Sale.payment_method.label("method"),
        func.coalesce(func.sum(models.Sale.total_amount), 0).label("revenue"),
        func.count(models.Sale.id).label("orders"),
    ).filter(models.Sale.id.in_(sale_ids)).group_by(models.Sale.payment_method).order_by(desc("revenue")).all()
    recent_sales = db.query(models.Sale).filter(models.Sale.id.in_(sale_ids)).order_by(desc(models.Sale.created_at)).limit(5).all()

    return {
        "kpis": {
            "total_revenue": float(totals[1]), "total_orders": totals[0],
            "average_order_value": float(totals[1]) / totals[0] if totals[0] else 0,
            "total_items_sold": int(item_totals[0]), "total_discount": float(item_totals[1]),
            "total_tax": float(item_totals[2]),
        },
        "sales_overview": [{"period": str(x.period), "revenue": round(float(x.revenue), 2)} for x in timeline],
        "sales_vs_orders": [{"period": str(x.period), "revenue": round(float(x.revenue), 2), "orders": x.orders} for x in timeline],
        "top_products": [{"name": x.name, "units_sold": int(x.units_sold), "revenue": float(x.revenue)} for x in products],
        "top_customers": [{"name": x.name, "orders": x.orders, "total_spend": float(x.total_spend),
                           "average_order_value": float(x.total_spend) / x.orders if x.orders else 0} for x in customers],
        "payment_analysis": [{"method": x.method.value if x.method else "Unknown", "revenue": float(x.revenue), "orders": x.orders} for x in payments],
        "recent_sales": [{"invoice": sale.invoice_number, "date": sale.created_at.strftime("%b %d, %Y"),
                          "customer": sale.customer.full_name if sale.customer else (sale.customer_name or "Walk-in customer"),
                          "amount": float(sale.total_amount), "payment_method": sale.payment_method.value if sale.payment_method else "Unknown",
                          "status": sale.payment_status.value if sale.payment_status else "Unknown"} for sale in recent_sales],
    }


@router.get("/sales/{section}")
def get_sales_analytics_section(
    section: str,
    start_date: Optional[datetime] = Query(None), end_date: Optional[datetime] = Query(None),
    product_id: Optional[int] = Query(None), category_id: Optional[int] = Query(None),
    customer_id: Optional[int] = Query(None), brand: Optional[str] = Query(None),
    sales_channel: Optional[models.SalesChannelEnum] = Query(None),
    payment_method: Optional[models.PaymentMethodEnum] = Query(None),
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    product_sort: str = Query("revenue", pattern="^(revenue|units_sold)$"),
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user),
):
    """Section endpoints share the exact filtering and aggregation semantics of /sales."""
    sections = {
        "summary": "kpis", "trend": "sales_overview", "products": "top_products",
        "customers": "top_customers", "payment-methods": "payment_analysis",
    }
    if section not in sections:
        raise HTTPException(status_code=404, detail="Analytics section not found.")
    report = get_sales_analytics(start_date, end_date, product_id, category_id, customer_id, brand,
                                 sales_channel, payment_method, interval, product_sort, db, current_user)
    return report[sections[section]]

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
