import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class StockMovementEnum(str, enum.Enum):
    sale = "Sale"
    manual_adjustment = "Manual Adjustment"
    stock_addition = "Stock Addition"
    stock_removal = "Stock Removal"
    return_stock = "Return"

class RoleEnum(str, enum.Enum):
    super_admin = "Super Admin"
    company_owner = "Company Owner"
    company_admin = "Company Admin"
    analyst = "Analyst"
    viewer = "Viewer"

class UserStatusEnum(str, enum.Enum):
    active = "Active"
    inactive = "Inactive"

class SalesChannelEnum(str, enum.Enum):
    retail_store = "Retail Store"
    online_store = "Online Store"
    marketplace = "Marketplace"

class PaymentMethodEnum(str, enum.Enum):
    cash = "Cash"
    card = "Card"
    upi = "UPI"
    bank_transfer = "Bank Transfer"

class CustomerTypeEnum(str, enum.Enum):
    retail = "Retail"
    wholesale = "Wholesale"
    corporate = "Corporate"

class CustomerStatusEnum(str, enum.Enum):
    active = "Active"
    inactive = "Inactive"

class CustomerSegmentEnum(str, enum.Enum):
    new = "New Customer"
    regular = "Regular Customer"
    loyal = "Loyal Customer"
    vip = "VIP Customer"

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    industry = Column(String)
    email = Column(String, unique=True, index=True)
    address = Column(String)
    phone = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="company")
    stores = relationship("Store", back_populates="company")
    products = relationship("Product", back_populates="company")
    categories = relationship("Category", back_populates="company")
    sales = relationship("Sale", back_populates="company")
    audit_logs = relationship("AuditLog", back_populates="company")
    customers = relationship("Customer", back_populates="company")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(Enum(RoleEnum), default=RoleEnum.company_admin)
    status = Column(Enum(UserStatusEnum), default=UserStatusEnum.active)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="users")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String)
    target_name = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, index=True)
    location = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="stores")
    sales = relationship("Sale", back_populates="store")

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("company_id", "sku", name="uq_products_company_sku"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    sku = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    brand = Column(String, nullable=True, index=True)
    description = Column(String, nullable=True)
    unit_price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=True)
    stock_quantity = Column(Integer, default=0, nullable=False)
    reserved_stock = Column(Integer, default=0, nullable=False)
    reorder_level = Column(Integer, default=10, nullable=False)
    unit_of_measure = Column(String, default="Unit", nullable=False)
    status = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="products")
    category = relationship("Category", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    

class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_categories_company_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    status = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="categories")
    products = relationship("Product", back_populates="category")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    invoice_number = Column(String, index=True, nullable=False)
    customer_name = Column(String, nullable=True)
    sales_channel = Column(Enum(SalesChannelEnum), default=SalesChannelEnum.retail_store)
    payment_method = Column(Enum(PaymentMethodEnum), default=PaymentMethodEnum.cash)
    total_amount = Column(Float, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="sales")
    store = relationship("Store", back_populates="sales")
    creator = relationship("User")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    customer = relationship("Customer", back_populates="sales")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")
    category = relationship("Category")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    movement_type = Column(Enum(StockMovementEnum), nullable=False)
    previous_quantity = Column(Integer, nullable=False, default=0)
    updated_quantity = Column(Integer, nullable=False, default=0)
    quantity_changed = Column(Integer, nullable=False)
    reason = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reference_id = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="stock_movements")
    company = relationship("Company")
    user = relationship("User")

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("company_id", "email", name="uq_customers_company_email"),
        UniqueConstraint("company_id", "phone", name="uq_customers_company_phone"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    customer_id = Column(String, index=True, nullable=False) # Auto-generated like CUST-1234
    full_name = Column(String, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    customer_type = Column(Enum(CustomerTypeEnum), default=CustomerTypeEnum.retail)
    preferred_sales_channel = Column(Enum(SalesChannelEnum), default=SalesChannelEnum.retail_store)
    status = Column(Enum(CustomerStatusEnum), default=CustomerStatusEnum.active)
    segment = Column(Enum(CustomerSegmentEnum), default=CustomerSegmentEnum.new)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="customers")
    sales = relationship("Sale", back_populates="customer")
    purchase_summary = relationship("CustomerPurchaseSummary", back_populates="customer", uselist=False, cascade="all, delete-orphan")

class CustomerPurchaseSummary(Base):
    __tablename__ = "customer_purchase_summary"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True, unique=True)
    total_orders = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    total_products_purchased = Column(Integer, default=0)
    average_order_value = Column(Float, default=0.0)
    purchase_frequency = Column(Float, nullable=True)
    first_purchase_date = Column(DateTime(timezone=True), nullable=True)
    last_purchase_date = Column(DateTime(timezone=True), nullable=True)
    favorite_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    favorite_category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="purchase_summary")
    favorite_product = relationship("Product")
    favorite_category = relationship("Category")

class DemandForecast(Base):
    __tablename__ = "demand_forecasts"
    __table_args__ = (UniqueConstraint("company_id", "product_id", "forecast_period", name="uq_forecast_company_product_period"),)
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    forecast_period = Column(String, nullable=False)
    predicted_demand = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    product = relationship("Product")
    category = relationship("Category")

class ForecastHistory(Base):
    __tablename__ = "forecast_history"
    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("demand_forecasts.id"), nullable=False, index=True)
    historical_sales = Column(Float, nullable=False)
    prediction = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    forecast = relationship("DemandForecast")
