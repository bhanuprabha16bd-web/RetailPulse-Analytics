from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
from models import Base
from database import engine
from routers import audit_logs, auth, users, stores, products, categories, sales, notifications, inventory, analytics, customers, forecasts, imports, reports, data_quality, workflows, system_health
from middleware.api_metrics import ApiMetricsMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    database.migrate_company_isolation_schema()
    database.migrate_role_schema()
    database.migrate_product_schema()
    database.migrate_category_schema()
    database.migrate_schema_v2()
    database.migrate_audit_schema()
    database.migrate_customers_schema()
    database.migrate_customers_segment_schema()
    database.migrate_customer_management_schema()
    database.migrate_customer_purchase_summary_schema()
    database.migrate_notification_schema()
    database.migrate_data_quality_schema()
    database.migrate_import_schema()
    database.migrate_workflow_schema()
    database.migrate_system_health_schema()
    yield

app = FastAPI(title="RetailPulse Analytics API", lifespan=lifespan, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ApiMetricsMiddleware)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stores.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(sales.router)
app.include_router(notifications.router)
app.include_router(inventory.router)
app.include_router(audit_logs.router)
app.include_router(analytics.router)
app.include_router(customers.router)
app.include_router(forecasts.router)
app.include_router(imports.router)
app.include_router(reports.router)
app.include_router(data_quality.router)
app.include_router(workflows.router)
app.include_router(system_health.router)

# Public health check (no auth required)
@app.get("/api/health", tags=["health"])
def public_health():
    from database import engine
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unavailable"
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "components": {"database": {"status": db_status}, "api": {"status": "healthy"}},
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to RetailPulse Analytics API"}
