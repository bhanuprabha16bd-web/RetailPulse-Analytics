from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Optional
from datetime import datetime
import models, schemas
from dependencies import get_current_company_user, RoleChecker, scope_company_query
from database import get_db

router = APIRouter(prefix="/api/sales", tags=["sales"])

allow_sales_manage = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
    models.RoleEnum.analyst,
])

from sqlalchemy import func

def update_customer_stats(db: Session, customer_id: int, company_id: int):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        return
        
    sales = db.query(models.Sale).filter(models.Sale.customer_id == customer_id).all()
    sales_count = len(sales)
    
    # Update segment
    old_segment = customer.segment
    if sales_count <= 1:
        segment = models.CustomerSegmentEnum.new
    elif sales_count <= 4:
        segment = models.CustomerSegmentEnum.regular
    elif sales_count <= 9:
        segment = models.CustomerSegmentEnum.loyal
    else:
        segment = models.CustomerSegmentEnum.vip
        
    if customer.segment != segment:
        customer.segment = segment
        db.add(customer)
        if segment == models.CustomerSegmentEnum.vip:
            db.add(models.Notification(company_id=company_id, message=f"Customer {customer.full_name} reached VIP status!"))
            
    # Send First Purchase Notification if exact 1
    if sales_count == 1 and old_segment == models.CustomerSegmentEnum.new:
        db.add(models.Notification(company_id=company_id, message=f"Customer {customer.full_name} completed their first purchase!"))

    # Update summary
    summary = db.query(models.CustomerPurchaseSummary).filter(models.CustomerPurchaseSummary.customer_id == customer_id).first()
    if not summary:
        summary = models.CustomerPurchaseSummary(customer_id=customer_id)
        db.add(summary)
        
    if sales:
        summary.total_orders = sales_count
        summary.total_revenue = sum(s.total_amount for s in sales)
        sale_ids = [s.id for s in sales]
        summary.total_products_purchased = db.query(func.sum(models.SaleItem.quantity)).filter(models.SaleItem.sale_id.in_(sale_ids)).scalar() or 0
        summary.average_order_value = summary.total_revenue / summary.total_orders
        
        first_sale = min(sales, key=lambda x: x.created_at)
        last_sale = max(sales, key=lambda x: x.created_at)
        summary.first_purchase_date = first_sale.created_at
        summary.last_purchase_date = last_sale.created_at
        
        if summary.total_orders > 1:
            delta = summary.last_purchase_date - summary.first_purchase_date
            summary.purchase_frequency = delta.days / (summary.total_orders - 1)
            
        fav_prod = db.query(models.SaleItem.product_id, func.sum(models.SaleItem.quantity).label('cnt')).filter(models.SaleItem.sale_id.in_(sale_ids)).group_by(models.SaleItem.product_id).order_by(desc('cnt')).first()
        if fav_prod:
            summary.favorite_product_id = fav_prod.product_id
            
        fav_cat = db.query(models.SaleItem.category_id, func.sum(models.SaleItem.quantity).label('cnt')).filter(models.SaleItem.sale_id.in_(sale_ids)).group_by(models.SaleItem.category_id).order_by(desc('cnt')).first()
        if fav_cat:
            summary.favorite_category_id = fav_cat.category_id
    else:
        # No sales
        summary.total_orders = 0
        summary.total_revenue = 0.0
        summary.total_products_purchased = 0
        summary.average_order_value = 0.0
        summary.purchase_frequency = None
        summary.first_purchase_date = None
        summary.last_purchase_date = None
        summary.favorite_product_id = None
        summary.favorite_category_id = None
        
    db.add(summary)

def generate_invoice_number(db: Session, company_id: int) -> str:
    current_year = datetime.now().year
    prefix = f"INV-{current_year}-"
    
    last_sale = db.query(models.Sale)\
        .filter(models.Sale.company_id == company_id, models.Sale.invoice_number.startswith(prefix))\
        .order_by(desc(models.Sale.invoice_number))\
        .first()
        
    if last_sale:
        try:
            sequence = int(last_sale.invoice_number.split("-")[-1]) + 1
        except ValueError:
            sequence = 1
    else:
        sequence = 1
        
    return f"{prefix}{sequence:06d}"

@router.get("/", response_model=List[schemas.SaleOut])
def get_sales(
    q: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category_id: Optional[int] = None,
    sales_channel: Optional[models.SalesChannelEnum] = None,
    payment_method: Optional[models.PaymentMethodEnum] = None,
    sort_by: Optional[str] = "date",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user)
):
    query = scope_company_query(db.query(models.Sale), current_user, models.Sale)

    if q:
        query = query.join(models.Sale.items).join(models.SaleItem.product).filter(
            or_(
                models.Sale.invoice_number.ilike(f"%{q}%"),
                models.Sale.customer_name.ilike(f"%{q}%"),
                models.Product.name.ilike(f"%{q}%")
            )
        )

    if start_date:
        query = query.filter(models.Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(models.Sale.sale_date <= end_date)
        
    if category_id:
        query = query.join(models.Sale.items).filter(models.SaleItem.category_id == category_id)

    if sales_channel:
        query = query.filter(models.Sale.sales_channel == sales_channel)
        
    if payment_method:
        query = query.filter(models.Sale.payment_method == payment_method)

    if sort_by == "invoice_number":
        query = query.order_by(desc(models.Sale.invoice_number))
    elif sort_by == "total_amount":
        query = query.order_by(desc(models.Sale.total_amount))
    else:
        query = query.order_by(desc(models.Sale.created_at))

    return query.all()

@router.post("/", response_model=schemas.SaleOut, dependencies=[Depends(allow_sales_manage)])
def create_sale(sale_create: schemas.SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    store = scope_company_query(db.query(models.Store), current_user, models.Store).filter(models.Store.id == sale_create.store_id).first()
    if not store:
        raise HTTPException(status_code=403, detail="Invalid store or store does not belong to your company")
        
    if not sale_create.items:
        raise HTTPException(status_code=400, detail="Sale must contain at least one product")
        
    if sale_create.customer_id:
        customer = scope_company_query(db.query(models.Customer), current_user, models.Customer).filter(models.Customer.id == sale_create.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        # If customer_name is not provided, autofill it from the linked customer
        if not sale_create.customer_name:
            sale_create.customer_name = customer.full_name

    total_amount = 0.0
    sale_items = []
    
    # Process items and validate stock
    for item in sale_create.items:
        product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=403, detail=f"Invalid product ID: {item.product_id}")
            
        if not product.status:
            raise HTTPException(status_code=422, detail=f"Product {product.name} is inactive")
            
        if item.quantity <= 0:
            raise HTTPException(status_code=422, detail="Quantity must be greater than zero")
            
        if item.quantity > product.stock_quantity:
            raise HTTPException(status_code=422, detail=f"Insufficient stock for {product.name}. Available: {product.stock_quantity}")
            
        item_total = (item.unit_price * item.quantity) - item.discount + item.tax
        if item.discount > (item.unit_price * item.quantity):
            raise HTTPException(status_code=422, detail=f"Discount cannot exceed product value for {product.name}")
        if item.tax < 0:
            raise HTTPException(status_code=422, detail="Tax cannot be negative")
            
        total_amount += item_total
        
        # Deduct stock
        product.stock_quantity -= item.quantity
        
        # Add audit log for inventory update
        audit_inv = models.AuditLog(
            company_id=current_user.company_id,
            user_id=current_user.id,
            action="Inventory Updated",
            resource_type="Product",
            resource_id=str(product.id),
            description=f"Stock deducted for {product.name}"
        )
        db.add(audit_inv)
        
        # Check out of stock
        if product.stock_quantity == 0:
            product.status = False
            audit_oos = models.AuditLog(
                company_id=current_user.company_id,
                user_id=current_user.id,
                action="Product Marked Out of Stock",
                resource_type="Product",
                resource_id=str(product.id),
                description=f"{product.name} is now out of stock"
            )
            db.add(audit_oos)
            
            notification = models.Notification(
                company_id=current_user.company_id,
                message=f"Product '{product.name}' is out of stock."
            )
            db.add(notification)
        elif product.stock_quantity <= 5: # Threshold for low stock notification
            notification = models.Notification(
                company_id=current_user.company_id,
                message=f"Low stock alert: '{product.name}' has only {product.stock_quantity} remaining."
            )
            db.add(notification)

        sale_items.append(models.SaleItem(
            product_id=product.id,
            category_id=product.category_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            tax=item.tax,
            total=item_total
        ))

    invoice_number = generate_invoice_number(db, current_user.company_id)

    new_sale = models.Sale(
        company_id=current_user.company_id,
        store_id=sale_create.store_id,
        customer_id=sale_create.customer_id,
        customer_name=sale_create.customer_name,
        sales_channel=sale_create.sales_channel,
        payment_method=sale_create.payment_method,
        payment_status=sale_create.payment_status,
        notes=sale_create.notes,
        total_amount=total_amount,
        created_by=current_user.id,
        invoice_number=invoice_number,
        items=sale_items
    )
    db.add(new_sale)
    
    for item in sale_items:
        sm = models.StockMovement(
            company_id=current_user.company_id,
            product_id=item.product_id,
            movement_type=models.StockMovementEnum.sale,
            previous_quantity=product.stock_quantity + item.quantity,
            updated_quantity=product.stock_quantity,
            quantity_changed=-item.quantity,
            reason="Sale",
            user_id=current_user.id,
            reference_id=invoice_number
        )
        db.add(sm)
    
    audit_sale = models.AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="Sale Created",
        resource_type="Sale",
        resource_id=invoice_number,
        description=f"Created invoice {invoice_number}"
    )
    db.add(audit_sale)

    if sale_create.customer_id:
        update_customer_stats(db, sale_create.customer_id, current_user.company_id)

    db.commit()
    db.refresh(new_sale)
    return new_sale

@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    sale = scope_company_query(db.query(models.Sale), current_user, models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

@router.put("/{sale_id}", response_model=schemas.SaleOut, dependencies=[Depends(allow_sales_manage)])
def update_sale(sale_id: int, payload: schemas.SaleUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    sale = scope_company_query(db.query(models.Sale), current_user, models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    if payload.payment_status is not None:
        sale.payment_status = payload.payment_status
    if payload.notes is not None:
        sale.notes = payload.notes
        
    audit_upd = models.AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="Sale Updated",
        resource_type="Sale",
        resource_id=sale.invoice_number,
        description=f"Updated invoice {sale.invoice_number}"
    )
    db.add(audit_upd)
    
    db.commit()
    db.refresh(sale)
    return sale

@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_sales_manage)])
def delete_sale(sale_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    sale = scope_company_query(db.query(models.Sale), current_user, models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    # Revert stock
    for item in sale.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.stock_quantity += item.quantity
            sm = models.StockMovement(
                company_id=current_user.company_id,
                product_id=product.id,
                movement_type=models.StockMovementEnum.return_stock,
                previous_quantity=product.stock_quantity - item.quantity,
                updated_quantity=product.stock_quantity,
                quantity_changed=item.quantity,
                reason="Sale Reverted",
                user_id=current_user.id,
                reference_id=f"Reverted {sale.invoice_number}"
            )
            db.add(sm)
            if product.stock_quantity > 0:
                product.status = True # Restore status if it was out of stock
            
            audit_inv = models.AuditLog(
                company_id=current_user.company_id,
                user_id=current_user.id,
                action="Inventory Updated (Reverted)",
                resource_type="Product",
                resource_id=str(product.id),
                description=f"Restored stock for {product.name}"
            )
            db.add(audit_inv)

    audit_del = models.AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="Sale Deleted",
        resource_type="Sale",
        resource_id=sale.invoice_number,
        description=f"Deleted invoice {sale.invoice_number}"
    )
    db.add(audit_del)

    customer_id = sale.customer_id

    db.delete(sale)
    db.commit()
    
    if customer_id:
        update_customer_stats(db, customer_id, current_user.company_id)
        db.commit()
        
    return None
