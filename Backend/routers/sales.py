from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from dependencies import get_current_company_user, RoleChecker, scope_company_query
from database import get_db

router = APIRouter(prefix="/api/sales", tags=["sales"])

allow_admin = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])

@router.get("/", response_model=List[schemas.SaleTransactionOut])
def get_sales(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    sales = scope_company_query(db.query(models.SaleTransaction), current_user, models.SaleTransaction).all()
    return sales

@router.post("/", response_model=schemas.SaleTransactionOut, dependencies=[Depends(allow_admin)])
def create_sale(sale: schemas.SaleTransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    store = scope_company_query(db.query(models.Store), current_user, models.Store).filter(models.Store.id == sale.store_id).first()
    if not store:
        raise HTTPException(status_code=403, detail="Invalid store or store does not belong to your company")

    product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == sale.product_id).first()
    if not product:
        raise HTTPException(status_code=403, detail="Invalid product or product does not belong to your company")

    new_sale = models.SaleTransaction(
        **sale.model_dump(),
        company_id=current_user.company_id,
    )
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    return new_sale
