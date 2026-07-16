from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import Base
from database import engine, migrate_company_isolation_schema, migrate_role_schema
from routers import audit_logs, auth, users, stores, products, sales

Base.metadata.create_all(bind=engine)
migrate_company_isolation_schema()
migrate_role_schema()

app = FastAPI(title="RetailPulse Analytics API")

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
app.include_router(sales.router)
app.include_router(audit_logs.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to RetailPulse Analytics API"}
