from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import timedelta
import jwt
import audit, models, schemas, auth, dependencies
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=schemas.CompanyOut)
def register_company(company: schemas.CompanyCreate, request: Request, db: Session = Depends(get_db)):
    # Email addresses are stored in a canonical form so database uniqueness
    # also prevents registrations differing only by letter case.
    company_email = str(company.email).lower()
    owner_email = str(company.owner_email).lower()

    db_company = db.query(models.Company).filter(models.Company.email == company_email).first()
    if db_company:
        raise HTTPException(status_code=400, detail="Company email already registered")
        
    db_user = db.query(models.User).filter(models.User.email == owner_email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="User email already registered")

    new_company = models.Company(
        name=company.name,
        industry=company.industry,
        email=company_email,
        address=company.address,
        phone=company.phone
    )
    db.add(new_company)
    db.flush() # flush to get new_company.id without committing

    hashed_password = auth.get_password_hash(company.password)
    
    new_user = models.User(
        company_id=new_company.id,
        name=company.owner_name,
        email=owner_email,
        password=hashed_password,
        role=company.owner_role
    )
    db.add(new_user)
    db.flush()
    
    audit.record_audit_log(db, request, new_user, "Company Registered")
    try:
        db.commit()
    except IntegrityError:
        # Database constraints are the final guard against concurrent duplicate
        # registrations after the pre-insert checks above.
        db.rollback()
        raise HTTPException(status_code=409, detail="Company or user email is already registered")

    return new_company

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == str(login_data.email).lower()).first()
    if not user or not auth.verify_password(login_data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
        
    if user.status != models.UserStatusEnum.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)

    access_token = auth.create_access_token(
        data={"user_id": user.id, "company_id": user.company_id}
    )
    refresh_token, expires_at = auth.create_refresh_token(
        data={"user_id": user.id, "company_id": user.company_id}
    )

    db_refresh_token = models.RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    
    audit.record_audit_log(db, request, user, "User Login")
    db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(token: str, db: Session = Depends(get_db)):
    db_token = db.query(models.RefreshToken).filter(models.RefreshToken.token == token).first()

    from datetime import datetime, timezone
    if not db_token or db_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("token_type") != "refresh" or payload.get("user_id") != db_token.user_id:
            raise ValueError("Invalid refresh token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
    user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
    if not user or user.company_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != models.UserStatusEnum.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
        
    access_token = auth.create_access_token(
        data={"user_id": user.id, "company_id": user.company_id}
    )
    return {"access_token": access_token, "refresh_token": token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    """End the supplied session and retain an auditable logout event."""
    db.query(models.RefreshToken).filter(
        models.RefreshToken.token == token,
        models.RefreshToken.user_id == current_user.id,
    ).delete(synchronize_session=False)
    audit.record_audit_log(db, request, current_user, "User Logout")
    db.commit()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    password_change: schemas.ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_active_user),
):
    if not auth.verify_password(password_change.current_password, current_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.password = auth.get_password_hash(password_change.new_password)
    # A password change invalidates every existing session for this user.
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == current_user.id).delete(
        synchronize_session=False
    )
    audit.record_audit_log(db, request, current_user, "Password Changed")
    db.commit()
