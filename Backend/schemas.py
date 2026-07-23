from pydantic import BaseModel, EmailStr, Field, model_validator, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime
from models import RoleEnum, UserStatusEnum, SalesChannelEnum, PaymentMethodEnum

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

class AuditUserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

class AuditLogOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    
    id: int
    company_id: Optional[int] = None
    user_id: Optional[int] = None
    action: str
    target_name: Optional[str] = None
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    timestamp: datetime
    company: Optional[AuditCompanyOut] = None
    user: Optional[AuditUserOut] = None

class StoreBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    name: str
    location: str
    is_active: bool = True

class StoreCreate(StoreBase):
    pass

class StoreUpdate(StoreBase):
    pass

class StoreOut(StoreBase):
    id: int
    company_id: int
    created_at: datetime

class ProductBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    sku: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=180)
    category_id: int
    brand: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    unit_price: float = Field(ge=0)
    cost_price: Optional[float] = Field(default=None, ge=0)
    stock_quantity: int = Field(default=0, ge=0)
    reserved_stock: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=10, ge=0)
    unit_of_measure: str = Field(default="Unit", min_length=1, max_length=50)
    status: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class CategoryBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    status: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    product_count: int = 0

class SaleItemBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    product_id: int
    quantity: int = Field(default=1, gt=0)
    unit_price: float = Field(ge=0)
    discount: float = Field(default=0.0, ge=0)
    tax: float = Field(default=0.0, ge=0)

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemOut(SaleItemBase):
    id: int
    sale_id: int
    category_id: int
    total: float
    product: Optional[ProductOut] = None
    category: Optional[CategoryOut] = None

class SaleBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    store_id: int
    customer_name: Optional[str] = None
    sales_channel: SalesChannelEnum = SalesChannelEnum.retail_store
    payment_method: PaymentMethodEnum = PaymentMethodEnum.cash

class SaleCreate(SaleBase):
    items: list[SaleItemCreate]

class SaleOut(SaleBase):
    id: int
    company_id: int
    invoice_number: str
    total_amount: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    store: Optional[StoreOut] = None
    items: list[SaleItemOut] = []

class NotificationOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: int
    message: str
    is_read: bool
    created_at: datetime

from models import StockMovementEnum

class StockMovementBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    product_id: int
    movement_type: StockMovementEnum
    previous_quantity: int
    updated_quantity: int
    quantity_changed: int
    reason: Optional[str] = None
    remarks: Optional[str] = None
    reference_id: Optional[str] = None

class StockMovementOut(StockMovementBase):
    id: int
    company_id: int
    user_id: int
    timestamp: datetime
    product: Optional[ProductOut] = None
    user: Optional[UserOut] = None

class StockAdjustmentCreate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    product_id: int
    adjustment_type: str # "Stock Addition", "Stock Removal", "Manual Adjustment"
    quantity: int
    reason: str
    remarks: Optional[str] = None

