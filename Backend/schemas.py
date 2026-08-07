from pydantic import BaseModel, EmailStr, Field, model_validator, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional
from datetime import datetime
from models import RoleEnum, UserStatusEnum, SalesChannelEnum, PaymentMethodEnum, PaymentStatusEnum

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
    customer_id: Optional[int] = None
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
    customer: Optional['CustomerOut'] = None
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
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    sales_channel: SalesChannelEnum = SalesChannelEnum.retail_store
    payment_method: PaymentMethodEnum = PaymentMethodEnum.cash
    payment_status: PaymentStatusEnum = PaymentStatusEnum.paid
    notes: Optional[str] = None

class SaleCreate(SaleBase):
    items: list[SaleItemCreate]

class SaleUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    payment_status: Optional[PaymentStatusEnum] = None
    notes: Optional[str] = None

class SaleOut(SaleBase):
    id: int
    company_id: int
    invoice_number: str
    total_amount: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    store: Optional[StoreOut] = None
    customer: Optional['CustomerOut'] = None
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

from models import CustomerTypeEnum, CustomerStatusEnum, CustomerSegmentEnum

class CustomerBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20, pattern=r"^\+?[0-9][0-9 ()-]{6,19}$")
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    customer_type: CustomerTypeEnum
    preferred_sales_channel: Optional[SalesChannelEnum] = None
    status: Optional[CustomerStatusEnum] = CustomerStatusEnum.active
    segment: CustomerSegmentEnum = CustomerSegmentEnum.new

class CustomerCreate(CustomerBase):
    address: str = Field(min_length=2, max_length=250)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    country: str = Field(min_length=2, max_length=80)
    postal_code: str = Field(min_length=2, max_length=20)

class CustomerUpdate(CustomerBase):
    address: str = Field(min_length=2, max_length=250)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=80)
    country: str = Field(min_length=2, max_length=80)
    postal_code: str = Field(min_length=2, max_length=20)

class CustomerPurchaseSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)
    total_orders: int
    total_revenue: float
    total_products_purchased: int
    average_order_value: float
    purchase_frequency: Optional[float]
    first_purchase_date: Optional[datetime]
    last_purchase_date: Optional[datetime]
    favorite_product_id: Optional[int]
    favorite_category_id: Optional[int]

class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)
    id: int
    company_id: int
    customer_id: str
    segment: CustomerSegmentEnum
    created_at: datetime
    updated_at: Optional[datetime] = None
    purchase_summary: Optional[CustomerPurchaseSummaryOut] = None

class CustomerExportOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)
    id: int
    customer_id: str
    created_at: datetime

class ProductPurchasedCount(BaseModel):
    product_name: str
    count: int

class RecentTransaction(BaseModel):
    id: int
    invoice_number: str
    total_amount: float
    created_at: datetime
    items_count: int

class RecentPurchase(BaseModel):
    id: int
    invoice_number: str
    product_name: str
    quantity: int
    total_amount: float
    created_at: datetime

class RecentPayment(BaseModel):
    id: int
    invoice_number: str
    payment_method: str
    total_amount: float
    created_at: datetime

class CustomerStatsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    customer: CustomerOut
    total_orders: int
    total_revenue_generated: float
    total_quantity_purchased: int
    average_order_value: float
    last_purchase_date: Optional[datetime] = None
    first_purchase_date: Optional[datetime] = None
    favorite_category: Optional[str] = None
    favorite_product: Optional[str] = None
    purchase_frequency_days: Optional[float] = None
    most_frequently_purchased_products: list[ProductPurchasedCount] = []
    recent_transactions: list[RecentTransaction] = []
    recent_orders: list[RecentTransaction] = []
    recent_purchases: list[RecentPurchase] = []
    recent_payments: list[RecentPayment] = []

class ChartDataPoint(BaseModel):
    name: str
    value: float

class CustomerAnalyticsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    total_customers: int
    active_customers: int
    new_customers: int
    returning_customers: int
    average_customer_spend: float
    total_revenue: float
    average_purchase_frequency: float

    growth_trend: list[ChartDataPoint]
    new_vs_returning: list[ChartDataPoint]
    revenue_by_type: list[ChartDataPoint]
    top_customers: list[ChartDataPoint]
    purchase_frequency_distribution: list[ChartDataPoint]
    location_distribution: list[ChartDataPoint]
    monthly_acquisition: list[ChartDataPoint]
    segment_distribution: list[ChartDataPoint]
    spending_distribution: list[ChartDataPoint]
