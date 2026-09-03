from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from datetime import datetime
from typing import List, Optional
import models, schemas, dependencies, audit
from database import get_db

router = APIRouter(prefix="/api/customers", tags=["customers"])

def active_customers_query(db: Session, current_user: models.User):
    """Customers are retained for reporting, but hidden after a soft delete."""
    return dependencies.scope_company_query(db.query(models.Customer), current_user, models.Customer).filter(
        models.Customer.is_deleted.is_(False)
    )

def generate_customer_id(db: Session, company_id: int) -> str:
    count = db.query(models.Customer).filter(models.Customer.company_id == company_id).count()
    return f"CUST-{count + 1:04d}"

@router.get("/analytics", response_model=schemas.CustomerAnalyticsResponse)
def get_customer_analytics(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    from datetime import datetime
    import calendar
    
    customers_query = active_customers_query(db, current_user)
    sales_query = dependencies.scope_company_query(db.query(models.Sale), current_user, models.Sale).filter(models.Sale.customer_id.isnot(None))
    
    total_customers = customers_query.count()
    active_customers = customers_query.filter(models.Customer.status == models.CustomerStatusEnum.active).count()
    
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    
    # Needs to handle sqlite vs postgres extraction slightly differently, so we'll do it in python for small datasets or with simple filters
    # For robust extraction across DBs, we'll fetch dates and process
    new_customers_count = 0
    all_customers = customers_query.all()
    for c in all_customers:
        if c.created_at and c.created_at.month == current_month and c.created_at.year == current_year:
            new_customers_count += 1
            
    # Use linked sales as the source of truth for customer-order metrics.
    # This does not depend on cached purchase summaries being up to date.
    customer_sales = db.query(
        models.Sale.customer_id,
        func.count(models.Sale.id).label("orders"),
        func.sum(models.Sale.total_amount).label("revenue"),
    ).filter(
        models.Sale.company_id == current_user.company_id,
        models.Sale.customer_id.isnot(None),
    ).group_by(models.Sale.customer_id).all()
    sales_by_customer = {row.customer_id: {"orders": int(row.orders), "revenue": float(row.revenue or 0)} for row in customer_sales}
    returning_customers = sum(1 for metrics in sales_by_customer.values() if metrics["orders"] > 1)
    
    total_revenue = db.query(func.sum(models.Sale.total_amount)).filter(models.Sale.company_id == current_user.company_id, models.Sale.customer_id.isnot(None)).scalar() or 0.0
    average_customer_spend = total_revenue / total_customers if total_customers > 0 else 0.0
    
    total_orders = sales_query.count()
    average_purchase_frequency = total_orders / total_customers if total_customers > 0 else 0.0

    # Growth Trend (Cumulative)
    # We will just group by month of created_at
    monthly_counts = {}
    for c in all_customers:
        if c.created_at:
            month_key = f"{c.created_at.year}-{c.created_at.month:02d}"
            monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1
    
    sorted_months = sorted(monthly_counts.keys())
    growth_trend = []
    cumulative = 0
    for m in sorted_months:
        cumulative += monthly_counts[m]
        month_name = calendar.month_abbr[int(m.split('-')[1])]
        growth_trend.append({"name": f"{month_name} {m.split('-')[0]}", "value": cumulative})
        
    monthly_acquisition = []
    for m in sorted_months:
        month_name = calendar.month_abbr[int(m.split('-')[1])]
        monthly_acquisition.append({"name": f"{month_name} {m.split('-')[0]}", "value": monthly_counts[m]})

    # New vs Returning
    new_vs_returning = [
        {"name": "New Customers (<=1 Order)", "value": total_customers - returning_customers},
        {"name": "Returning Customers (>1 Order)", "value": returning_customers}
    ]

    # Revenue by Type
    rev_by_type = db.query(
        models.Customer.customer_type, func.sum(models.Sale.total_amount).label('rev')
    ).join(models.Sale, models.Customer.id == models.Sale.customer_id)\
     .filter(models.Customer.company_id == current_user.company_id, models.Customer.is_deleted.is_(False))\
     .group_by(models.Customer.customer_type).all()
     
    revenue_by_type = [{"name": str(r.customer_type.value), "value": float(r.rev)} for r in rev_by_type if r.rev]

    # Top 10 Customers
    top_c = db.query(
        models.Customer.full_name, func.sum(models.Sale.total_amount).label('rev')
    ).join(models.Sale, models.Customer.id == models.Sale.customer_id)\
     .filter(models.Customer.company_id == current_user.company_id, models.Customer.is_deleted.is_(False))\
     .group_by(models.Customer.id, models.Customer.full_name)\
     .order_by(desc('rev')).limit(10).all()
     
    top_customers = [{"name": r.full_name, "value": float(r.rev)} for r in top_c if r.rev]

    # Segment Distribution
    seg_dist = db.query(
        models.Customer.segment, func.count(models.Customer.id).label('cnt')
    ).filter(models.Customer.company_id == current_user.company_id, models.Customer.is_deleted.is_(False))\
     .group_by(models.Customer.segment).all()
     
    segment_distribution = [{"name": str(s.segment.value), "value": int(s.cnt)} for s in seg_dist]
    
    # Location Distribution (City)
    loc_dist = db.query(
        models.Customer.city, func.count(models.Customer.id).label('cnt')
    ).filter(models.Customer.company_id == current_user.company_id, models.Customer.is_deleted.is_(False), models.Customer.city.isnot(None))\
     .group_by(models.Customer.city)\
     .order_by(desc('cnt')).limit(10).all()
     
    location_distribution = [{"name": l.city, "value": int(l.cnt)} for l in loc_dist if l.city]
    
    # Purchase Frequency Distribution
    freq_dist = [
        {"name": "No Orders", "value": total_customers - len(sales_by_customer)},
        {"name": "1 Order", "value": sum(1 for metrics in sales_by_customer.values() if metrics["orders"] == 1)},
        {"name": "2-4 Orders", "value": sum(1 for metrics in sales_by_customer.values() if 2 <= metrics["orders"] <= 4)},
        {"name": "5-9 Orders", "value": sum(1 for metrics in sales_by_customer.values() if 5 <= metrics["orders"] <= 9)},
        {"name": "10+ Orders", "value": sum(1 for metrics in sales_by_customer.values() if metrics["orders"] >= 10)},
    ]

    spending_distribution = [
        {"name": "No Spend", "value": total_customers - len(sales_by_customer)},
        {"name": "₹1–₹1,000", "value": sum(1 for metrics in sales_by_customer.values() if 0 < metrics["revenue"] <= 1000)},
        {"name": "₹1,001–₹5,000", "value": sum(1 for metrics in sales_by_customer.values() if 1000 < metrics["revenue"] <= 5000)},
        {"name": "₹5,001–₹10,000", "value": sum(1 for metrics in sales_by_customer.values() if 5000 < metrics["revenue"] <= 10000)},
        {"name": "₹10,000+", "value": sum(1 for metrics in sales_by_customer.values() if metrics["revenue"] > 10000)},
    ]

    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "new_customers": new_customers_count,
        "returning_customers": returning_customers,
        "average_customer_spend": average_customer_spend,
        "total_revenue": total_revenue,
        "average_purchase_frequency": average_purchase_frequency,
        
        "growth_trend": growth_trend,
        "new_vs_returning": new_vs_returning,
        "revenue_by_type": revenue_by_type,
        "top_customers": top_customers,
        "purchase_frequency_distribution": freq_dist,
        "location_distribution": location_distribution,
        "monthly_acquisition": monthly_acquisition,
        "segment_distribution": segment_distribution,
        "spending_distribution": spending_distribution,
    }

@router.get("/", response_model=List[schemas.CustomerOut])
def get_customers(
    search: Optional[str] = None,
    customer_type: Optional[models.CustomerTypeEnum] = None,
    status_filter: Optional[models.CustomerStatusEnum] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: Optional[str] = None,
    reg_date_start: Optional[str] = None,
    reg_date_end: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = "desc",
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    from datetime import datetime
    query = active_customers_query(db, current_user)
    
    # Needs a join if sorting by total orders/spend
    if sort_by in ["total_orders", "total_spend", "last_purchase"]:
        query = query.outerjoin(models.CustomerPurchaseSummary, models.Customer.id == models.CustomerPurchaseSummary.customer_id)

    if search:
        query = query.filter(or_(
            models.Customer.full_name.ilike(f"%{search}%"),
            models.Customer.email.ilike(f"%{search}%"),
            models.Customer.phone.ilike(f"%{search}%"),
            models.Customer.customer_id.ilike(f"%{search}%")
        ))
    if customer_type:
        query = query.filter(models.Customer.customer_type == customer_type)
    if status_filter:
        query = query.filter(models.Customer.status == status_filter)
    if city:
        query = query.filter(models.Customer.city.ilike(f"%{city}%"))
    if state:
        query = query.filter(models.Customer.state.ilike(f"%{state}%"))
    if country:
        query = query.filter(models.Customer.country.ilike(f"%{country}%"))
    if reg_date_start:
        try:
            start_date = datetime.strptime(reg_date_start, "%Y-%m-%d")
            query = query.filter(models.Customer.created_at >= start_date)
        except:
            pass
    if reg_date_end:
        try:
            end_date = datetime.strptime(reg_date_end, "%Y-%m-%d")
            query = query.filter(models.Customer.created_at <= end_date)
        except:
            pass
            
    # Sorting
    if sort_by == "name":
        order_col = models.Customer.full_name
    elif sort_by == "total_spend":
        order_col = models.CustomerPurchaseSummary.total_revenue
    elif sort_by == "total_orders":
        order_col = models.CustomerPurchaseSummary.total_orders
    elif sort_by == "last_purchase":
        order_col = models.CustomerPurchaseSummary.last_purchase_date
    else: # customer_since or default
        order_col = models.Customer.created_at

    if sort_order == "asc":
        query = query.order_by(order_col.asc().nullsfirst())
    else:
        query = query.order_by(order_col.desc().nullslast())

    return query.all()

@router.post("/", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer: schemas.CustomerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    if customer.email:
        existing_email = dependencies.scope_company_query(
            db.query(models.Customer).filter(models.Customer.email == customer.email, models.Customer.is_deleted.is_(False)), 
            current_user, models.Customer).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer with this email already exists")

    if customer.phone:
        existing_phone = dependencies.scope_company_query(
            db.query(models.Customer).filter(models.Customer.phone == customer.phone, models.Customer.is_deleted.is_(False)), 
            current_user, models.Customer).first()
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer with this phone number already exists")

    new_customer = models.Customer(
        **customer.model_dump(),
        company_id=current_user.company_id,
        customer_id=generate_customer_id(db, current_user.company_id)
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    # Create purchase summary
    summary = models.CustomerPurchaseSummary(customer_id=new_customer.id)
    db.add(summary)
    
    # Create Notification
    db.add(models.Notification(company_id=current_user.company_id, message=f"New customer registered: {new_customer.full_name} ({new_customer.customer_id})"))
    
    db.commit()
    
    audit.record_audit_log(db, request, current_user, "Customer Created", target_name=new_customer.full_name)
    db.commit()
    return new_customer

@router.get("/{customer_id}", response_model=schemas.CustomerStatsResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    customer = active_customers_query(db, current_user).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    summary = customer.purchase_summary
    if not summary:
        # A summary is normally created with the customer, but keep profiles
        # available for records created before that migration.
        summary = models.CustomerPurchaseSummary(customer_id=customer_id)

    # Build the history from sales rather than only trusting the denormalized
    # summary. This keeps profiles correct as soon as a sale is recorded.
    sales_query = dependencies.scope_company_query(
        db.query(models.Sale).filter(models.Sale.customer_id == customer_id),
        current_user,
        models.Sale
    )
    sales = sales_query.all()
    sale_ids = [sale.id for sale in sales]
    total_orders = len(sales)
    total_revenue = float(sum(sale.total_amount for sale in sales))
    total_quantity = int(
        db.query(func.sum(models.SaleItem.quantity))
        .filter(models.SaleItem.sale_id.in_(sale_ids))
        .scalar() or 0
    ) if sale_ids else 0
    first_purchase_date = min((sale.created_at for sale in sales), default=None)
    last_purchase_date = max((sale.created_at for sale in sales), default=None)

    product_counts = []
    if sale_ids:
        product_counts = (
            db.query(
                models.Product.name.label("product_name"),
                func.sum(models.SaleItem.quantity).label("count"),
            )
            .join(models.Product, models.Product.id == models.SaleItem.product_id)
            .filter(models.SaleItem.sale_id.in_(sale_ids))
            .group_by(models.Product.id, models.Product.name)
            .order_by(desc("count"), models.Product.name.asc())
            .limit(5)
            .all()
        )

    fav_cat = summary.favorite_category.name if summary.favorite_category else None
    fav_prod = product_counts[0].product_name if product_counts else None

    # Recent activity is derived from the same linked invoices so orders,
    # purchased products, and payments always move together.
    recent_transactions = []
    recent_purchases = []
    recent_payments = []
    recent_sales = sales_query.order_by(models.Sale.created_at.desc()).limit(5).all()
    for sale in recent_sales:
        items_count = db.query(func.sum(models.SaleItem.quantity)).filter(models.SaleItem.sale_id == sale.id).scalar() or 0
        recent_transactions.append({
            "id": sale.id,
            "invoice_number": sale.invoice_number,
            "total_amount": sale.total_amount,
            "created_at": sale.created_at,
            "items_count": items_count
        })
        recent_payments.append({
            "id": sale.id,
            "invoice_number": sale.invoice_number,
            "payment_method": sale.payment_method.value,
            "total_amount": sale.total_amount,
            "created_at": sale.created_at,
        })
        for item in sale.items:
            recent_purchases.append({
                "id": item.id,
                "invoice_number": sale.invoice_number,
                "product_name": item.product.name if item.product else "Unknown product",
                "quantity": item.quantity,
                "total_amount": item.total,
                "created_at": sale.created_at,
            })

    recent_purchases = recent_purchases[:5]

    return {
        "customer": customer,
        "total_orders": total_orders,
        "total_revenue_generated": total_revenue,
        "total_quantity_purchased": total_quantity,
        "average_order_value": total_revenue / total_orders if total_orders else 0.0,
        "last_purchase_date": last_purchase_date,
        "first_purchase_date": first_purchase_date,
        "favorite_category": fav_cat,
        "favorite_product": fav_prod,
        "purchase_frequency_days": summary.purchase_frequency,
        "most_frequently_purchased_products": [
            {"product_name": product.product_name, "count": int(product.count)}
            for product in product_counts
        ],
        "recent_transactions": recent_transactions,
        "recent_orders": recent_transactions,
        "recent_purchases": recent_purchases,
        "recent_payments": recent_payments,
    }

@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    customer_id: int,
    customer_update: schemas.CustomerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    customer = active_customers_query(db, current_user).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    if customer_update.email and customer_update.email != customer.email:
        existing_email = dependencies.scope_company_query(
            db.query(models.Customer).filter(models.Customer.email == customer_update.email, models.Customer.is_deleted.is_(False)),
            current_user,
            models.Customer
        ).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer with this email already exists")

    if customer_update.phone and customer_update.phone != customer.phone:
        existing_phone = dependencies.scope_company_query(
            db.query(models.Customer).filter(models.Customer.phone == customer_update.phone, models.Customer.is_deleted.is_(False)),
            current_user,
            models.Customer
        ).first()
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer with this phone number already exists")

    status_changed = False
    if 'status' in customer_update.model_dump(exclude_unset=True) and customer_update.status != customer.status:
        status_changed = True

    for key, value in customer_update.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
        
    db.commit()
    db.refresh(customer)
    
    audit.record_audit_log(db, request, current_user, "Customer Updated", target_name=customer.full_name)
    if status_changed:
        audit.record_audit_log(db, request, current_user, "Customer Status Changed", target_name=customer.full_name)
    db.commit()
        
    return customer

@router.put("/{customer_id}/status", response_model=schemas.CustomerOut)
def toggle_customer_status(
    customer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    customer = active_customers_query(db, current_user).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    customer.status = (
        models.CustomerStatusEnum.inactive 
        if customer.status == models.CustomerStatusEnum.active 
        else models.CustomerStatusEnum.active
    )
    
    db.commit()
    db.refresh(customer)
    
    action = "Customer Activated" if customer.status == models.CustomerStatusEnum.active else "Customer Deactivated"
    audit.record_audit_log(db, request, current_user, action, target_name=customer.full_name)
    db.commit()
    
    return customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    customer = active_customers_query(db, current_user).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    customer.is_deleted = True
    customer.deleted_at = datetime.utcnow()
    db.commit()
    
    audit.record_audit_log(db, request, current_user, "Customer Deleted", target_name=customer.full_name)
    db.commit()

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/export/list")
def export_customers_list(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    customers = dependencies.scope_company_query(
        db.query(models.Customer).outerjoin(models.CustomerPurchaseSummary).filter(models.Customer.is_deleted.is_(False)),
        current_user,
        models.Customer
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Customer ID", "Name", "Email", "Phone", "Type", "Status", "Segment", "Total Orders", "Total Spend"])

    for c in customers:
        orders = c.purchase_summary.total_orders if c.purchase_summary else 0
        spend = c.purchase_summary.total_revenue if c.purchase_summary else 0.0
        writer.writerow([c.customer_id, c.full_name, c.email, c.phone, c.customer_type.value, c.status.value, c.segment.value, orders, spend])

    output.seek(0)
    audit.record_audit_log(db, request, current_user, "Customer Exported", target_name="All Customers")
    db.commit()
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=customers_list.csv"})

@router.get("/{customer_id}/timeline")
def get_customer_timeline(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_company_user)
):
    customer = active_customers_query(db, current_user).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    logs = dependencies.scope_company_query(
        db.query(models.AuditLog)
        .filter(models.AuditLog.resource_type == "Customer", models.AuditLog.resource_id == str(customer_id)), 
        current_user, 
        models.AuditLog
    ).order_by(models.AuditLog.created_at.desc()).all()
    
    return [
        {
            "id": log.id,
            "action": log.action,
            "timestamp": log.created_at,
            "user": log.user.name if log.user else "System"
        }
        for log in logs
    ]
