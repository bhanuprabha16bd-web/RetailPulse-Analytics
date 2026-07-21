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
            target_name=product.name
        )
        db.add(audit_inv)
        
        # Check out of stock
        if product.stock_quantity == 0:
            product.status = False
            audit_oos = models.AuditLog(
                company_id=current_user.company_id,
                user_id=current_user.id,
                action="Product Marked Out of Stock",
                target_name=product.name
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
        customer_name=sale_create.customer_name,
        sales_channel=sale_create.sales_channel,
        payment_method=sale_create.payment_method,
        total_amount=total_amount,
        created_by=current_user.id,
        invoice_number=invoice_number,
        items=sale_items
    )
    db.add(new_sale)
    
    audit_sale = models.AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="Sale Created",
        target_name=invoice_number
    )
    db.add(audit_sale)

    db.commit()
    db.refresh(new_sale)
    return new_sale

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
            if product.stock_quantity > 0:
                product.status = True # Restore status if it was out of stock
            
            audit_inv = models.AuditLog(
                company_id=current_user.company_id,
                user_id=current_user.id,
                action="Inventory Updated (Reverted)",
                target_name=product.name
            )
            db.add(audit_inv)

    audit_del = models.AuditLog(
        company_id=current_user.company_id,
        user_id=current_user.id,
        action="Sale Deleted",
        target_name=sale.invoice_number
    )
    db.add(audit_del)

    db.delete(sale)
    db.commit()
    return None
