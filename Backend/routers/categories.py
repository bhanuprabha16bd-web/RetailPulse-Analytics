from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import audit, models, schemas
from database import get_db
from dependencies import RoleChecker, get_current_company_user, scope_company_query

router = APIRouter(prefix="/api/categories", tags=["categories"])

allow_admin = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])


def category_out(category: models.Category, product_count: int) -> dict:
    return {
        "id": category.id,
        "company_id": category.company_id,
        "name": category.name,
        "description": category.description,
        "status": category.status,
        "createdAt": category.created_at,
        "updatedAt": category.updated_at,
        "product_count": product_count,
    }


@router.get("/", response_model=List[schemas.CategoryOut], dependencies=[Depends(allow_admin)])
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    categories = scope_company_query(db.query(models.Category), current_user, models.Category).order_by(models.Category.name).all()
    counts = dict(
        scope_company_query(db.query(models.Product.category_id, func.count(models.Product.id)), current_user, models.Product)
        .group_by(models.Product.category_id)
        .all()
    )
    return [category_out(category, counts.get(category.id, 0)) for category in categories]


@router.post("/", response_model=schemas.CategoryOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_admin)])
def create_category(category: schemas.CategoryCreate, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    name = category.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")
    existing = scope_company_query(db.query(models.Category), current_user, models.Category).filter(func.lower(models.Category.name) == name.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    new_category = models.Category(name=name, description=category.description, status=category.status, company_id=current_user.company_id)
    db.add(new_category)
    audit.record_audit_log(db, request, current_user, "Category Created", target_name=name)
    db.commit()
    db.refresh(new_category)
    return category_out(new_category, 0)


@router.put("/{category_id}", response_model=schemas.CategoryOut, dependencies=[Depends(allow_admin)])
def update_category(category_id: int, payload: schemas.CategoryUpdate, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    category = scope_company_query(db.query(models.Category), current_user, models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")
    duplicate = scope_company_query(db.query(models.Category), current_user, models.Category).filter(func.lower(models.Category.name) == name.lower(), models.Category.id != category_id).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A category with this name already exists")
    category.name, category.description, category.status = name, payload.description, payload.status
    audit.record_audit_log(db, request, current_user, "Category Updated", target_name=name)
    db.commit()
    db.refresh(category)
    count = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.category_id == category.id).count()
    return category_out(category, count)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_admin)])
def delete_category(category_id: int, request: Request, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    category = scope_company_query(db.query(models.Category), current_user, models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    product_count = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.category_id == category.id).count()
    if product_count:
        raise HTTPException(status_code=409, detail="Categories with products cannot be deleted. Move or remove the products first.")
    name = category.name
    db.delete(category)
    audit.record_audit_log(db, request, current_user, "Category Deleted", target_name=name)
    db.commit()
