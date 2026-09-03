import csv
import json
import os
import shutil
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from pydantic import ValidationError

import models
import schemas
from database import get_db
from dependencies import RoleChecker, get_current_company_user

router = APIRouter(prefix="/api/import", tags=["import"])

allow_admin = RoleChecker([models.RoleEnum.company_owner, models.RoleEnum.company_admin])

TEMP_DIR = "temp_imports"
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/upload", response_model=schemas.ImportPreviewResponse)
async def upload_file(
    file: UploadFile = File(...),
    import_type: models.DataImportTypeEnum = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(TEMP_DIR, f"{file_id}.csv")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Preview data
    preview_data = []
    columns = []
    total_rows = 0
    
    try:
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            columns = reader.fieldnames or []
            for idx, row in enumerate(reader):
                total_rows += 1
                if idx < 5:
                    preview_data.append(row)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
        
    # Create DB record
    data_import = models.DataImport(
        company_id=current_user.company_id,
        import_type=import_type,
        filename=file.filename,
        file_path=file_path,
        uploaded_by=current_user.id,
        total_records=total_rows,
        status=models.DataImportStatusEnum.pending
    )
    db.add(data_import)
    db.commit()
    db.refresh(data_import)
    
    return schemas.ImportPreviewResponse(
        import_id=data_import.id,
        columns=columns,
        preview_data=preview_data,
        total_rows=total_rows
    )

def validate_row(import_type: models.DataImportTypeEnum, row: dict, db: Session, company_id: int):
    # This returns (is_valid, error_type, error_message, is_duplicate)
    
    # Strip whitespace from keys and values
    row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in row.items() if k is not None}

    if import_type == models.DataImportTypeEnum.products:
        name = row.get("Product Name") or row.get("name")
        sku = row.get("SKU") or row.get("sku")
        category = row.get("Category") or row.get("category")
        price = row.get("Unit Price") or row.get("unit_price") or row.get("price")
        stock = row.get("Stock Quantity") or row.get("stock_quantity") or row.get("stock")
        
        if not sku: return False, "Validation", "SKU is required", False
        if not name: return False, "Validation", "Product Name is required", False
        if not category: return False, "Validation", "Category is required", False
        try:
            p = float(price)
            if p <= 0: return False, "Validation", "Price must be greater than zero", False
        except (TypeError, ValueError): return False, "Validation", "Invalid Price", False
        try:
            s = int(stock)
            if s < 0: return False, "Validation", "Stock cannot be negative", False
        except (TypeError, ValueError): return False, "Validation", "Invalid Stock", False
        
        # Check duplicate
        exists = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
        if exists: return False, "Duplicate", f"Product with SKU {sku} already exists", True
        return True, "", "", False
        
    elif import_type == models.DataImportTypeEnum.customers:
        name = row.get("Name") or row.get("name") or row.get("Full Name") or row.get("full_name")
        email = row.get("Email") or row.get("email")
        phone = row.get("Phone") or row.get("phone")
        
        if not name: return False, "Validation", "Name is required", False
        if not email and not phone: return False, "Validation", "Email or Phone is required", False
        
        # Check duplicate
        if email:
            exists = db.query(models.Customer).filter_by(company_id=company_id, email=email).first()
            if exists: return False, "Duplicate", f"Customer with email {email} already exists", True
        if phone:
            exists = db.query(models.Customer).filter_by(company_id=company_id, phone=phone).first()
            if exists: return False, "Duplicate", f"Customer with phone {phone} already exists", True
        return True, "", "", False
        
    elif import_type == models.DataImportTypeEnum.sales:
        invoice = row.get("Invoice Number") or row.get("invoice_number") or row.get("invoice")
        customer_email = row.get("Customer Email") or row.get("customer_email") or row.get("customer")
        sku = row.get("Product SKU") or row.get("sku") or row.get("product")
        qty = row.get("Quantity") or row.get("quantity")
        
        if not sku: return False, "Validation", "Product SKU is required", False
        try:
            q = int(qty)
            if q <= 0: return False, "Validation", "Quantity must be greater than zero", False
        except (TypeError, ValueError): return False, "Validation", "Invalid Quantity", False
        
        # Check constraints
        product = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
        if not product: return False, "Validation", f"Product {sku} not found", False
        
        if customer_email:
            customer = db.query(models.Customer).filter_by(company_id=company_id, email=customer_email).first()
            if not customer:
                customer = db.query(models.Customer).filter_by(company_id=company_id, phone=customer_email).first()
            if not customer:
                return False, "Validation", f"Customer {customer_email} not found", False
                
        # Sale duplicate based on invoice
        if invoice:
            exists = db.query(models.Sale).filter_by(company_id=company_id, invoice_number=invoice).first()
            if exists: return False, "Duplicate", f"Invoice {invoice} already exists", True
            
        return True, "", "", False
        
    return False, "Validation", "Unknown import type", False

@router.post("/{import_id}/validate", response_model=schemas.ImportValidationResponse)
def validate_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    
    with open(data_import.file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            is_valid, err_type, err_msg, is_dup = validate_row(data_import.import_type, row, db, current_user.company_id)
            if is_valid:
                valid_count += 1
            else:
                if is_dup:
                    duplicate_count += 1
                else:
                    invalid_count += 1
                    
    return schemas.ImportValidationResponse(
        total_records=data_import.total_records,
        valid_records=valid_count,
        invalid_records=invalid_count,
        duplicate_records=duplicate_count
    )

@router.post("/{import_id}/process", response_model=schemas.DataImportOut)
def process_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    data_import.status = models.DataImportStatusEnum.processing
    db.commit()
    
    valid_count = 0
    failed_count = 0
    duplicate_count = 0
    
    categories_cache = {}
    
    def get_or_create_category(name: str):
        if name in categories_cache: return categories_cache[name]
        cat = db.query(models.Category).filter_by(company_id=current_user.company_id, name=name).first()
        if not cat:
            cat = models.Category(company_id=current_user.company_id, name=name)
            db.add(cat)
            db.flush()
        categories_cache[name] = cat
        return cat

    try:
        with open(data_import.file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for idx, raw_row in enumerate(reader):
                row_number = idx + 2 # Header is 1
                row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in raw_row.items() if k is not None}
                
                is_valid, err_type, err_msg, is_dup = validate_row(data_import.import_type, row, db, current_user.company_id)
                if not is_valid:
                    if is_dup: duplicate_count += 1
                    else: failed_count += 1
                    err = models.DataImportError(
                        import_id=import_id,
                        row_number=row_number,
                        error_type=err_type,
                        error_message=err_msg,
                        raw_data=json.dumps(raw_row)
                    )
                    db.add(err)
                    continue
                    
                # Process valid row
                try:
                    if data_import.import_type == models.DataImportTypeEnum.products:
                        cat_name = row.get("Category") or row.get("category")
                        cat = get_or_create_category(cat_name)
                        
                        prod = models.Product(
                            company_id=current_user.company_id,
                            sku=row.get("SKU") or row.get("sku"),
                            name=row.get("Product Name") or row.get("name"),
                            category_id=cat.id,
                            unit_price=float(row.get("Unit Price") or row.get("unit_price") or row.get("price")),
                            stock_quantity=int(row.get("Stock Quantity") or row.get("stock_quantity") or row.get("stock")),
                        )
                        db.add(prod)
                        
                    elif data_import.import_type == models.DataImportTypeEnum.customers:
                        # Assuming CUST- format for customer_id
                        cust_count = db.query(models.Customer).filter_by(company_id=current_user.company_id).count()
                        cust_id_str = f"CUST-{(cust_count + valid_count + 1):04d}"
                        
                        cust = models.Customer(
                            company_id=current_user.company_id,
                            customer_id=cust_id_str,
                            full_name=row.get("Name") or row.get("name") or row.get("Full Name") or row.get("full_name"),
                            email=row.get("Email") or row.get("email") or f"noemail{uuid.uuid4().hex[:6]}@example.com",
                            phone=row.get("Phone") or row.get("phone") or "0000000000",
                        )
                        db.add(cust)
                        
                    elif data_import.import_type == models.DataImportTypeEnum.sales:
                        invoice = row.get("Invoice Number") or row.get("invoice_number") or row.get("invoice")
                        if not invoice:
                            invoice = f"INV-{uuid.uuid4().hex[:8].upper()}"
                            
                        sku = row.get("Product SKU") or row.get("sku") or row.get("product")
                        qty = int(row.get("Quantity") or row.get("quantity"))
                        prod = db.query(models.Product).filter_by(company_id=current_user.company_id, sku=sku).first()
                        
                        price = row.get("Unit Price") or row.get("unit_price") or row.get("price")
                        if price: price = float(price)
                        else: price = prod.unit_price
                        
                        customer_email = row.get("Customer Email") or row.get("customer_email") or row.get("customer")
                        cust_id = None
                        cust_name = None
                        if customer_email:
                            customer = db.query(models.Customer).filter_by(company_id=current_user.company_id, email=customer_email).first()
                            if not customer: customer = db.query(models.Customer).filter_by(company_id=current_user.company_id, phone=customer_email).first()
                            if customer:
                                cust_id = customer.id
                                cust_name = customer.full_name
                        
                        store = db.query(models.Store).filter_by(company_id=current_user.company_id).first()
                        store_id = store.id if store else None
                        
                        sale = models.Sale(
                            company_id=current_user.company_id,
                            store_id=store_id,
                            customer_id=cust_id,
                            customer_name=cust_name,
                            invoice_number=invoice,
                            total_amount=price * qty,
                            created_by=current_user.id
                        )
                        db.add(sale)
                        db.flush()
                        
                        item = models.SaleItem(
                            sale_id=sale.id,
                            product_id=prod.id,
                            category_id=prod.category_id,
                            quantity=qty,
                            unit_price=price,
                            total=price * qty
                        )
                        db.add(item)
                        
                        # Decrease stock
                        prod.stock_quantity -= qty
                        
                    db.flush() # Try to flush row
                    valid_count += 1
                except Exception as e:
                    db.rollback()
                    failed_count += 1
                    err = models.DataImportError(
                        import_id=import_id,
                        row_number=row_number,
                        error_type="Database",
                        error_message=str(e),
                        raw_data=json.dumps(raw_row)
                    )
                    db.add(err)
                    
        # Overall commit for valid rows
        db.commit()
        
    except Exception as e:
        db.rollback()
        data_import.status = models.DataImportStatusEnum.failed
        db.commit()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
        
    data_import.successful_records = valid_count
    data_import.failed_records = failed_count
    data_import.duplicate_records = duplicate_count
    data_import.status = models.DataImportStatusEnum.completed if failed_count == 0 else models.DataImportStatusEnum.completed_with_errors
    data_import.completed_at = datetime.now()
    
    import audit
    audit.record_audit_log(
        db, None, current_user, 
        action="IMPORT", 
        resource_type="DataImport", 
        resource_id=data_import.id, 
        description=f"Imported {valid_count} {data_import.import_type.value} records",
        before_values=None,
        after_values={"Valid": valid_count, "Failed": failed_count, "Duplicate": duplicate_count}
    )
    
    db.commit()
    db.refresh(data_import)
    
    return data_import

@router.get("/history", response_model=List[schemas.DataImportOut])
def get_import_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    imports = db.query(models.DataImport).filter_by(company_id=current_user.company_id).order_by(models.DataImport.created_at.desc()).all()
    return imports

@router.get("/{import_id}/errors", response_model=List[schemas.DataImportErrorOut])
def get_import_errors(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    errors = db.query(models.DataImportError).filter_by(import_id=import_id).all()
    return errors
