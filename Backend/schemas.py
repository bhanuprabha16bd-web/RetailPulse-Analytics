from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from datetime import datetime
from models import RoleEnum, UserStatusEnum

class CompanyBase(BaseModel):
    name: str
    industry: str
    email: EmailStr
    address: str
    phone: str

class CompanyCreate(CompanyBase):
    owner_name: str
    owner_email: EmailStr
    owner_role: RoleEnum
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

class CompanyOut(CompanyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: RoleEnum
    status: UserStatusEnum

class UserOut(UserBase):
    id: int
    company_id: int
    last_login: Optional[datetime] = None
    created_at: datetime
    company: Optional[CompanyOut] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int
    company_id: int

class AuditCompanyOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class AuditUserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    company_id: Optional[int] = None
    user_id: Optional[int] = None
    action: str
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    timestamp: datetime
    company: Optional[AuditCompanyOut] = None
    user: Optional[AuditUserOut] = None

    class Config:
        from_attributes = True

class StoreBase(BaseModel):
    name: str
    location: str
    is_active: bool = True

class StoreCreate(StoreBase):
    pass

class StoreOut(StoreBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    sku: str
    name: str
    category: str
    price: float

class ProductCreate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SaleTransactionBase(BaseModel):
    store_id: int
    product_id: int
    quantity: int
    total_amount: float

class SaleTransactionCreate(SaleTransactionBase):
    pass

class SaleTransactionOut(SaleTransactionBase):
    id: int
    company_id: int
    timestamp: datetime
    store: Optional[StoreOut] = None
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True
