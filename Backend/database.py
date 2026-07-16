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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
