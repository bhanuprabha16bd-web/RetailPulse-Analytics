from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import audit, models, schemas
from database import get_db
from dependencies import RoleChecker, get_current_company_user, scope_company_query

router = APIRouter(prefix="/api/products", tags=["products"])

allow_admin = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])


def clean_product(payload: schemas.ProductBase) -> dict:
    data = payload.model_dump()
    for key in ("sku", "name", "brand", "description", "unit_of_measure"):
        if isinstance(data.get(key), str):
            data[key] = data[key].strip() or None
    # SKUs are case-insensitive identifiers. Persisting a canonical value lets
    # the tenant-scoped database constraint also protect concurrent requests.
    if data.get("sku"):
        data["sku"] = data["sku"].upper()
    if not data["sku"] or not data["name"] or not data.get("category_id") or not data["unit_of_measure"]:
        raise HTTPException(status_code=422, detail="SKU, product name, category, and unit of measure are required")
    return data


def validate_product_values(data: dict, db: Session, current_user: models.User, product_id: int | None = None, current_category_id: int | None = None):
    if data.get("reorder_level", 0) < 0:
        raise HTTPException(status_code=422, detail="Reorder level cannot be negative")
    if data.get("unit_price", 0) <= 0:
        raise HTTPException(status_code=422, detail="Unit price must be greater than zero")
    if data.get("cost_price") is not None and data["cost_price"] > data["unit_price"]:
        raise HTTPException(status_code=422, detail="Cost price cannot exceed unit price")

    duplicate = scope_company_query(db.query(models.Product), current_user, models.Product).filter(func.lower(models.Product.sku) == data["sku"].lower())
    if product_id is not None:
        duplicate = duplicate.filter(models.Product.id != product_id)
    if duplicate.first():
        raise HTTPException(status_code=409, detail="A product with this SKU already exists")
    duplicate_name = scope_company_query(db.query(models.Product), current_user, models.Product).filter(
        func.lower(models.Product.name) == data["name"].lower(),
        models.Product.category_id == data["category_id"]
    )
    if product_id is not None:
        duplicate_name = duplicate_name.filter(models.Product.id != product_id)
    if duplicate_name.first():
        raise HTTPException(status_code=409, detail="A product with this name already exists in the selected category")
    category = scope_company_query(db.query(models.Category), current_user, models.Category).filter(models.Category.id == data["category_id"]).first()
    if not category:
        raise HTTPException(status_code=422, detail="Select a valid category from Category Management")
    if not category.status and data["category_id"] != current_category_id:
        raise HTTPException(status_code=422, detail="Inactive categories cannot be assigned to products")


@router.get("/", response_model=List[schemas.ProductOut], dependencies=[Depends(allow_admin)])
def get_products(
    active_only: bool = Query(False, description="Return only products available for new sales"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_company_user),
):
    products = scope_company_query(db.query(models.Product), current_user, models.Product)
    if active_only:
        products = products.filter(models.Product.status.is_(True))
    return products.order_by(models.Product.name).all()


@router.get("/{product_id}", response_model=schemas.ProductOut, dependencies=[Depends(allow_admin)])
def get_product(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_admin)])
def create_product(payload: schemas.ProductCreate, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    data = clean_product(payload)
    validate_product_values(data, db, current_user)
    product = models.Product(**data, company_id=current_user.company_id)
    db.add(product)
    if product.stock_quantity > 0:
        sm = models.StockMovement(
            company_id=current_user.company_id,
            product_id=product.id,
            movement_type=models.StockMovementEnum.stock_addition,
            previous_quantity=0,
            updated_quantity=product.stock_quantity,
            quantity_changed=product.stock_quantity,
            reason="Initial Stock",
            user_id=current_user.id,
            reference_id="Initial Stock"
        )
        db.add(sm)
    audit.record_audit_log(db, request, current_user, "Product Created", target_name=product.name)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut, dependencies=[Depends(allow_admin)])
def update_product(product_id: int, payload: schemas.ProductUpdate, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    data = clean_product(payload)
    validate_product_values(data, db, current_user, product_id, product.category_id)
    old_stock = product.stock_quantity
    old_reorder = product.reorder_level
    old_status = product.status
    for key, value in data.items():
        setattr(product, key, value)
    
    if old_stock != product.stock_quantity:
        diff = product.stock_quantity - old_stock
        sm = models.StockMovement(
            company_id=current_user.company_id,
            product_id=product.id,
            movement_type=models.StockMovementEnum.manual_adjustment,
            previous_quantity=old_stock,
            updated_quantity=product.stock_quantity,
            quantity_changed=diff,
            reason="Product Edit",
            user_id=current_user.id,
            reference_id="Manual Update"
        )
        db.add(sm)
        
    if old_reorder != product.reorder_level:
        audit.record_audit_log(db, request, current_user, "Reorder Level Updated", target_name=product.name)
    if old_status != product.status:
        action_name = "Product Activated" if product.status else "Product Deactivated"
        audit.record_audit_log(db, request, current_user, action_name, target_name=product.name)
    else:
        audit.record_audit_log(db, request, current_user, "Product Updated", target_name=product.name)
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_admin)])
def delete_product(product_id: int, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if scope_company_query(db.query(models.SaleTransaction), current_user, models.SaleTransaction).filter(models.SaleTransaction.product_id == product_id).first():
        raise HTTPException(status_code=409, detail="Products with sales history cannot be deleted. Disable the product instead.")
    name = product.name
    db.delete(product)
    audit.record_audit_log(db, request, current_user, "Product Deleted", target_name=name)
    db.commit()
