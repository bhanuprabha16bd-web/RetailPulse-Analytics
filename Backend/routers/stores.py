from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from dependencies import get_current_company_user, RoleChecker, scope_company_query
from database import get_db

router = APIRouter(prefix="/api/stores", tags=["stores"])

allow_admin = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])

@router.get("/", response_model=List[schemas.StoreOut])
def get_stores(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    stores = scope_company_query(db.query(models.Store), current_user, models.Store).all()
    return stores

@router.post("/", response_model=schemas.StoreOut, dependencies=[Depends(allow_admin)])
def create_store(store: schemas.StoreCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    new_store = models.Store(
        **store.model_dump(),
        company_id=current_user.company_id
    )
    db.add(new_store)
    db.commit()
    db.refresh(new_store)
    return new_store

@router.put("/{store_id}", response_model=schemas.StoreOut, dependencies=[Depends(allow_admin)])
def update_store(store_id: int, store_update: schemas.StoreUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    store = scope_company_query(db.query(models.Store), current_user, models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    for key, value in store_update.model_dump().items():
        setattr(store, key, value)
        
    db.commit()
    db.refresh(store)
    return store

@router.delete("/{store_id}", status_code=204, dependencies=[Depends(allow_admin)])
def delete_store(store_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    store = scope_company_query(db.query(models.Store), current_user, models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    # Check if there are related sales before deleting, although constraints might handle it
    sales_count = db.query(models.SaleTransaction).filter(models.SaleTransaction.store_id == store_id).count()
    if sales_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete store with existing sales. Deactivate it instead.")
        
    db.delete(store)
    db.commit()
    return None
