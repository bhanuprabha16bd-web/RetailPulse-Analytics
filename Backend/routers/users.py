from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import models, schemas, dependencies
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/", response_model=List[schemas.UserOut])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_company_user)):
    users = dependencies.scope_company_query(db.query(models.User), current_user, models.User).all()
    return users

@router.get("/me", response_model=schemas.UserOut)
def get_user_profile(current_user: models.User = Depends(dependencies.get_current_company_user)):
    return current_user
