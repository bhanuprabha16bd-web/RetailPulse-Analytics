from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.orm import Session
import models, schemas, auth, database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("token_type") != "access":
            raise credentials_exception
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        company_id: int = payload.get("company_id")
        if company_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(user_id=user_id, company_id=company_id)
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception

    if user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to a company",
        )

    # The tenant is always derived from the user record; a token can never
    # choose a different company.
    if token_data.company_id != user.company_id:
        raise credentials_exception

    return user

def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if current_user.status != models.UserStatusEnum.active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_company_user(current_user: models.User = Depends(get_current_active_user)):
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to a company",
        )
    return current_user


def scope_company_query(query, current_user: models.User, model_class):
    """Apply the mandatory tenant predicate for a company-owned model."""
    if current_user.company_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not assigned to a company")
    if not hasattr(model_class, "company_id"):
        raise ValueError(f"{model_class.__name__} is not a company-owned model")
    return query.filter(model_class.company_id == current_user.company_id)


class RoleChecker:
    def __init__(self, allowed_roles: list[models.RoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: models.User = Depends(get_current_active_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {[r.value for r in self.allowed_roles]}",
            )
        return user
