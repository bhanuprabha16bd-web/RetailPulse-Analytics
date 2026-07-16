import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class RoleEnum(str, enum.Enum):
    super_admin = "Super Admin"
    company_owner = "Company Owner"
    company_admin = "Company Admin"
    analyst = "Analyst"
    viewer = "Viewer"

class UserStatusEnum(str, enum.Enum):
    active = "Active"
    inactive = "Inactive"

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
    sales = relationship("SaleTransaction", back_populates="company")
    audit_logs = relationship("AuditLog", back_populates="company")

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
    sales = relationship("SaleTransaction", back_populates="store")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    sku = Column(String, index=True)
    name = Column(String, index=True)
    category = Column(String, index=True)
    price = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", back_populates="products")
    sales = relationship("SaleTransaction", back_populates="product")

class SaleTransaction(Base):
    __tablename__ = "sale_transactions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)
    total_amount = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="sales")
    product = relationship("Product", back_populates="sales")
    company = relationship("Company", back_populates="sales")
