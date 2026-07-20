import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# We default to sqlite if DATABASE_URL is not provided so development can continue without docker
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./retailpulse.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def migrate_company_isolation_schema():
    """Backfill the tenant column required by existing sale tables.

    New databases receive the constraint from ``models.SaleTransaction``.
    This small compatibility migration keeps the bundled development database
    usable while deployments move to the explicit tenant-owned sale model.
    """
    inspector = inspect(engine)
    if "sale_transactions" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("sale_transactions")}
    if "company_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE sale_transactions ADD COLUMN company_id INTEGER"))
            connection.execute(text("""
                UPDATE sale_transactions
                SET company_id = (
                    SELECT company_id FROM stores
                    WHERE stores.id = sale_transactions.store_id
                )
            """))

            if engine.dialect.name != "sqlite":
                connection.execute(text("ALTER TABLE sale_transactions ALTER COLUMN company_id SET NOT NULL"))
                connection.execute(text("""
                    ALTER TABLE sale_transactions
                    ADD CONSTRAINT fk_sale_transactions_company
                    FOREIGN KEY (company_id) REFERENCES companies (id)
                """))

    with engine.begin() as connection:
        connection.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_sale_transactions_company_id "
            "ON sale_transactions (company_id)"
        ))


def migrate_role_schema():
    """Keep the PostgreSQL enum in sync when roles are added in application code."""
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'Company Owner'"
        ))


def migrate_product_schema():
    """Add product master-data fields to installations created before products expanded."""
    inspector = inspect(engine)
    if "products" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("products")}
    additions = {
        "brand": "VARCHAR",
        "description": "VARCHAR",
        "cost_price": "FLOAT",
        "initial_stock_quantity": "INTEGER DEFAULT 0",
        "unit_of_measure": "VARCHAR DEFAULT 'Unit'",
        "is_active": "BOOLEAN DEFAULT 1",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE products ADD COLUMN {name} {definition}"))

        # Product identifiers are tenant-local: two companies may use the same
        # SKU, while a company cannot accidentally create it twice.
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_products_company_sku "
            "ON products (company_id, sku)"
        ))


def migrate_category_schema():
    """Enforce category-name uniqueness within, never across, tenants."""
    inspector = inspect(engine)
    if "categories" not in inspector.get_table_names():
        return

    with engine.begin() as connection:
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_company_name "
            "ON categories (company_id, name)"
        ))

def migrate_schema_v2():
    """Migrate categories and products to updated schema (v2)."""
    inspector = inspect(engine)
    
    with engine.begin() as connection:
        if "categories" in inspector.get_table_names():
            columns = {column["name"] for column in inspector.get_columns("categories")}
            if "is_active" in columns and "status" not in columns:
                connection.execute(text("ALTER TABLE categories RENAME COLUMN is_active TO status"))
            if "updated_at" not in columns:
                connection.execute(text("ALTER TABLE categories ADD COLUMN updated_at DATETIME"))
        
        if "products" in inspector.get_table_names():
            columns = {column["name"] for column in inspector.get_columns("products")}
            if "is_active" in columns and "status" not in columns:
                connection.execute(text("ALTER TABLE products RENAME COLUMN is_active TO status"))
            if "initial_stock_quantity" in columns and "stock_quantity" not in columns:
                connection.execute(text("ALTER TABLE products RENAME COLUMN initial_stock_quantity TO stock_quantity"))
            if "price" in columns and "unit_price" not in columns:
                connection.execute(text("ALTER TABLE products RENAME COLUMN price TO unit_price"))
            if "updated_at" not in columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN updated_at DATETIME"))
            if "category_id" not in columns:
                connection.execute(text("ALTER TABLE products ADD COLUMN category_id INTEGER"))
                connection.execute(text("""
                    UPDATE products
                    SET category_id = (
                        SELECT id FROM categories 
                        WHERE categories.name = products.category 
                          AND categories.company_id = products.company_id
                    )
                """))
                if "category" in columns:
                    connection.execute(text("ALTER TABLE products DROP COLUMN category"))

def migrate_audit_schema():
    """Add target_name to audit_logs and backfill data."""
    inspector = inspect(engine)
    if "audit_logs" not in inspector.get_table_names():
        return
        
    columns = {column["name"] for column in inspector.get_columns("audit_logs")}
    with engine.begin() as connection:
        if "target_name" not in columns:
            connection.execute(text("ALTER TABLE audit_logs ADD COLUMN target_name VARCHAR"))
            
            # Backfill existing data
            # Format is usually "Action: Target"
            # For example: "Product Created: iPhone"
            connection.execute(text("""
                UPDATE audit_logs 
                SET target_name = TRIM(SUBSTR(action, INSTR(action, ':') + 1)),
                    action = TRIM(SUBSTR(action, 1, INSTR(action, ':') - 1))
                WHERE action LIKE '%: %'
            """))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
