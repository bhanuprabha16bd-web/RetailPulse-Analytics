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

class PaymentStatusEnum(str, enum.Enum):
    paid = "Paid"
    pending = "Pending"
    overdue = "Overdue"

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

class DataImportStatusEnum(str, enum.Enum):
    uploaded = "Uploaded"
    validating = "Validating"
    pending = "Pending"
    processing = "Processing"
    completed = "Completed"
    completed_with_errors = "Completed with Errors"
    failed = "Failed"
    cancelled = "Cancelled"

class DataImportTypeEnum(str, enum.Enum):
    products = "Products"
    customers = "Customers"
    sales = "Sales"
    inventory = "Inventory"

class ReportFormatEnum(str, enum.Enum):
    csv = "CSV"
    pdf = "PDF"

class ReportFrequencyEnum(str, enum.Enum):
    daily = "Daily"
    weekly = "Weekly"
    monthly = "Monthly"

class NotificationTypeEnum(str, enum.Enum):
    stockout_risk = "Stockout Risk"
    low_stock = "Low Stock"
    overstock = "Overstock"
    import_completed = "Import Completed"
    import_failed = "Import Failed"
    sales_alert = "Sales Alert"
    system_alert = "System Alert"

class NotificationPriorityEnum(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"

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
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, index=True)
    resource_type = Column(String, nullable=True, index=True)
    resource_id = Column(String, nullable=True)
    description = Column(String, nullable=True)
    status = Column(String, default="Success") # e.g. Success, Failed
    before_values = Column(String, nullable=True) # JSON string
    after_values = Column(String, nullable=True) # JSON string
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

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
    payment_status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.paid)
    notes = Column(String, nullable=True)
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    type = Column(Enum(NotificationTypeEnum, values_callable=lambda x: [e.value for e in x]), nullable=False, default=NotificationTypeEnum.system_alert.value)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    priority = Column(Enum(NotificationPriorityEnum, values_callable=lambda x: [e.value for e in x]), default=NotificationPriorityEnum.medium.value)
    resource_type = Column(String, nullable=True) # e.g. "Product", "Import"
    resource_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company")
    user = relationship("User")

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
    postal_code = Column(String, nullable=True)
    customer_type = Column(Enum(CustomerTypeEnum), default=CustomerTypeEnum.retail)
    preferred_sales_channel = Column(Enum(SalesChannelEnum), default=SalesChannelEnum.retail_store)
    status = Column(Enum(CustomerStatusEnum), default=CustomerStatusEnum.active)
    segment = Column(Enum(CustomerSegmentEnum), default=CustomerSegmentEnum.new)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
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

class DataImport(Base):
    __tablename__ = "data_imports"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    import_type = Column(Enum(DataImportTypeEnum), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False) # Path where the temporary file is saved
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    duplicate_records = Column(Integer, default=0)
    skipped_records = Column(Integer, default=0)
    processing_progress = Column(Integer, default=0)
    processing_speed = Column(Integer, default=0)
    status = Column(Enum(DataImportStatusEnum), default=DataImportStatusEnum.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company")
    user = relationship("User")
    errors = relationship("DataImportError", back_populates="data_import", cascade="all, delete-orphan")

class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    report_type = Column(String, nullable=False, index=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    filters = Column(String, nullable=False, default="{}")
    format = Column(Enum(ReportFormatEnum), nullable=False)
    status = Column(String, nullable=False, default="Success")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    company = relationship("Company")
    user = relationship("User")

class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    report_type = Column(String, nullable=False)
    filters = Column(String, nullable=False, default="{}")
    frequency = Column(Enum(ReportFrequencyEnum), nullable=False)
    execution_time = Column(String, nullable=False)
    recipients = Column(String, nullable=False, default="[]")
    format = Column(Enum(ReportFormatEnum), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String, nullable=True)
    last_error = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    creator = relationship("User")

class DataImportError(Base):
    __tablename__ = "data_import_errors"
    
    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("data_imports.id"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    error_type = Column(String, nullable=False) # Validation, Duplicate, Database
    error_message = Column(String, nullable=False)
    raw_data = Column(String, nullable=True) # JSON representation of the failing row

    data_import = relationship("DataImport", back_populates="errors")

# Data Quality Enums
class DQIssueTypeEnum(str, enum.Enum):
    stock_mismatch = "Stock Mismatch"
    invalid_product_ref = "Invalid Product Ref"
    invalid_customer_ref = "Invalid Customer Ref"
    duplicate_sku = "Duplicate SKU"
    missing_information = "Missing Information"
    stock_movement_mismatch = "Stock Movement Mismatch"
    report_mismatch = "Report Mismatch"
    product_deactivated = "Product Deactivated"
    excess_sale_quantity = "Excess Sale Quantity"

class DQSeverityEnum(str, enum.Enum):
    critical = "Critical"
    high = "High"
    medium = "Medium"
    low = "Low"

class DQIssueStatusEnum(str, enum.Enum):
    open = "Open"
    investigating = "Investigating"
    resolved = "Resolved"
    ignored = "Ignored"

class DQModuleEnum(str, enum.Enum):
    inventory = "Inventory"
    sales = "Sales"
    products = "Products"
    customers = "Customers"
    reports = "Reports"

class ReconciliationStatusEnum(str, enum.Enum):
    running = "Running"
    completed = "Completed"
    completed_with_issues = "Completed with Issues"
    failed = "Failed"

class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    issue_id = Column(String, index=True, nullable=False)
    issue_type = Column(Enum(DQIssueTypeEnum), nullable=False)
    severity = Column(Enum(DQSeverityEnum), nullable=False)
    module = Column(Enum(DQModuleEnum), nullable=False)
    affected_record = Column(String, nullable=False)
    resource_type = Column(String, nullable=True)
    resource_id = Column(Integer, nullable=True)
    description = Column(String, nullable=False)
    status = Column(Enum(DQIssueStatusEnum), default=DQIssueStatusEnum.open, nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_note = Column(String, nullable=True)
    related_data = Column(String, nullable=True)
    reconciliation_id = Column(Integer, ForeignKey("reconciliation_runs.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    resolver = relationship("User", foreign_keys=[resolved_by])
    reconciliation_run = relationship("ReconciliationRun", back_populates="issues", foreign_keys=[reconciliation_id])

class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    execution_id = Column(String, index=True, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    triggered_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    records_checked = Column(Integer, default=0, nullable=False)
    issues_found = Column(Integer, default=0, nullable=False)
    issues_resolved = Column(Integer, default=0, nullable=False)
    failed_checks = Column(Integer, default=0, nullable=False)
    status = Column(Enum(ReconciliationStatusEnum), default=ReconciliationStatusEnum.running, nullable=False)
    error_message = Column(String, nullable=True)

    company = relationship("Company")
    trigger_user = relationship("User", foreign_keys=[triggered_by])
    issues = relationship("DataQualityIssue", back_populates="reconciliation_run")

class IssueStatusHistory(Base):
    __tablename__ = "issue_status_history"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("data_quality_issues.id"), nullable=False)
    previous_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(String, nullable=True)

    issue = relationship("DataQualityIssue")
    user = relationship("User")

# ─────────────────── Workflow & Approval ───────────────────

class WorkflowRequestTypeEnum(str, enum.Enum):
    stock_adjustment = "Stock Adjustment"
    product_deactivation = "Product Deactivation"
    product_price_change = "Product Price Change"
    customer_info_change = "Customer Information Change"
    inventory_import_approval = "Inventory Import Approval"

class WorkflowPriorityEnum(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"

class WorkflowStatusEnum(str, enum.Enum):
    draft = "Draft"
    submitted = "Submitted"
    pending_approval = "Pending Approval"
    approved = "Approved"
    rejected = "Rejected"
    cancelled = "Cancelled"

class WorkflowRequest(Base):
    __tablename__ = "workflow_requests"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, unique=True, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    request_type = Column(Enum(WorkflowRequestTypeEnum), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    related_record_type = Column(String, nullable=True)
    related_record_id = Column(Integer, nullable=True)
    related_record_label = Column(String, nullable=True)
    current_values = Column(String, nullable=True)
    requested_values = Column(String, nullable=True)
    reason = Column(String, nullable=False)
    priority = Column(Enum(WorkflowPriorityEnum), default=WorkflowPriorityEnum.medium)
    status = Column(Enum(WorkflowStatusEnum), default=WorkflowStatusEnum.pending_approval, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    history = relationship("WorkflowHistory", back_populates="request", cascade="all, delete-orphan", order_by="WorkflowHistory.created_at")
    comments = relationship("WorkflowComment", back_populates="request", cascade="all, delete-orphan", order_by="WorkflowComment.created_at")

class WorkflowHistory(Base):
    __tablename__ = "workflow_history"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("workflow_requests.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("WorkflowRequest", back_populates="history")
    user = relationship("User")

class WorkflowComment(Base):
    __tablename__ = "workflow_comments"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("workflow_requests.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    comment = Column(String, nullable=False)
    commented_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("WorkflowRequest", back_populates="comments")
    author = relationship("User")

class WorkflowConfig(Base):
    __tablename__ = "workflow_configs"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    request_type = Column(Enum(WorkflowRequestTypeEnum), nullable=False)
    approver_role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.company_admin)
    require_reason = Column(Boolean, default=True)
    allow_self_approve = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")


# ─────────────────── System Health Monitoring ───────────────────

class SystemHealthStatusEnum(str, enum.Enum):
    healthy = "Healthy"
    degraded = "Degraded"
    unavailable = "Unavailable"

class JobStatusEnum(str, enum.Enum):
    pending = "Pending"
    running = "Running"
    completed = "Completed"
    failed = "Failed"
    cancelled = "Cancelled"

class JobTypeEnum(str, enum.Enum):
    data_import = "Data Import"
    scheduled_report = "Scheduled Report"
    reconciliation = "Reconciliation"
    health_check = "Health Check"
    system_task = "System Task"

class ErrorCategoryEnum(str, enum.Enum):
    api_error = "API Error"
    db_error = "Database Error"
    job_failure = "Job Failure"
    external_api = "External API"
    auth_error = "Auth Error"
    validation_error = "Validation Error"

class ErrorSeverityEnum(str, enum.Enum):
    critical = "Critical"
    high = "High"
    medium = "Medium"
    low = "Low"

class ErrorStatusEnum(str, enum.Enum):
    open = "Open"
    investigating = "Investigating"
    resolved = "Resolved"

class IncidentStatusEnum(str, enum.Enum):
    open = "Open"
    investigating = "Investigating"
    resolved = "Resolved"

class SystemHealthCheck(Base):
    __tablename__ = "system_health_checks"

    id = Column(Integer, primary_key=True, index=True)
    component = Column(String, nullable=False, index=True)  # e.g. 'Application API', 'Database', 'Background Jobs'
    status = Column(Enum(SystemHealthStatusEnum), nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class ApiMetric(Base):
    __tablename__ = "api_metrics"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    endpoint = Column(String, nullable=False, index=True)
    method = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    is_error = Column(Boolean, default=False, nullable=False)
    error_category = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class BackgroundJob(Base):
    __tablename__ = "background_jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    job_id = Column(String, unique=True, nullable=False, index=True)
    job_type = Column(Enum(JobTypeEnum), nullable=False)
    triggered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.pending, nullable=False, index=True)
    retry_count = Column(Integer, default=0, nullable=False)
    failure_reason = Column(String, nullable=True)
    metadata_json = Column(String, nullable=True)  # JSON: extra info
    source_record_type = Column(String, nullable=True)  # 'DataImport', 'ReconciliationRun', 'ScheduledReport'
    source_record_id = Column(Integer, nullable=True)

    company = relationship("Company")
    trigger_user = relationship("User", foreign_keys=[triggered_by])

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    incident_id = Column(String, nullable=False, unique=True, index=True)  # e.g. INC-001
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    severity = Column(Enum(ErrorSeverityEnum), nullable=False)
    status = Column(Enum(IncidentStatusEnum), default=IncidentStatusEnum.open, nullable=False)
    affected_components = Column(String, nullable=True)  # JSON list
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    resolver = relationship("User", foreign_keys=[resolved_by])
    timeline = relationship("IncidentTimeline", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentTimeline.created_at")
    errors = relationship("SystemError", back_populates="incident", foreign_keys="[SystemError.incident_id]")

class SystemError(Base):
    __tablename__ = "system_errors"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    error_id = Column(String, nullable=False, index=True)  # e.g. ERR-1001
    error_key = Column(String, nullable=False, index=True)  # Dedup key: category+component+endpoint
    category = Column(Enum(ErrorCategoryEnum), nullable=False)
    component = Column(String, nullable=False)
    endpoint_or_job = Column(String, nullable=True)
    severity = Column(Enum(ErrorSeverityEnum), nullable=False)
    occurrence_count = Column(Integer, default=1, nullable=False)
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    status = Column(Enum(ErrorStatusEnum), default=ErrorStatusEnum.open, nullable=False)
    resolution_notes = Column(String, nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    sample_message = Column(String, nullable=True)  # Sample error message (sanitized)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company")
    incident = relationship("Incident", foreign_keys=[incident_id], back_populates="errors")
    resolver = relationship("User", foreign_keys=[resolved_by])

class IncidentTimeline(Base):
    __tablename__ = "incident_timeline"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    status_from = Column(String, nullable=True)
    status_to = Column(String, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    incident = relationship("Incident", back_populates="timeline")
    user = relationship("User", foreign_keys=[performed_by])

class MonitoringThreshold(Base):
    __tablename__ = "monitoring_thresholds"
    __table_args__ = (
        UniqueConstraint("company_id", "threshold_key", name="uq_thresholds_company_key"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    threshold_key = Column(String, nullable=False)  # e.g. 'api_error_rate', 'response_time_ms', 'job_failure_count'
    threshold_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
