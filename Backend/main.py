from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
from models import Base
from database import engine
from routers import audit_logs, auth, users, stores, products, categories, sales

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    database.migrate_company_isolation_schema()
    database.migrate_role_schema()
    database.migrate_product_schema()
    database.migrate_category_schema()
    database.migrate_schema_v2()
    database.migrate_audit_schema()
    yield

app = FastAPI(title="RetailPulse Analytics API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stores.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(sales.router)
app.include_router(audit_logs.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to RetailPulse Analytics API"}
