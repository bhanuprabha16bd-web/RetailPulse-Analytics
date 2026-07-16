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
