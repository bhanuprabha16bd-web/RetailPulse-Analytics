from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from dependencies import get_current_company_user, RoleChecker, scope_company_query
from database import get_db

router = APIRouter(prefix="/api/products", tags=["products"])

allow_admin = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])

@router.get("/", response_model=List[schemas.ProductOut])
def get_products(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    products = scope_company_query(db.query(models.Product), current_user, models.Product).all()
    return products

@router.post("/", response_model=schemas.ProductOut, dependencies=[Depends(allow_admin)])
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    new_product = models.Product(
        **product.model_dump(),
        company_id=current_user.company_id
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product
