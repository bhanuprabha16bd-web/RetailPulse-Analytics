import csv
import json
import os
import shutil
import uuid
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

import models
import schemas
from database import get_db, SessionLocal
from dependencies import RoleChecker
from services.notification_service import evaluate_product_stock_alert, create_import_alert, create_notification
import audit
from routers.data_quality import run_reconciliation

router = APIRouter(prefix="/api/import", tags=["import"])

allow_admin = RoleChecker([models.RoleEnum.company_owner, models.RoleEnum.company_admin])

TEMP_DIR = "temp_imports"
os.makedirs(TEMP_DIR, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload", response_model=schemas.ImportPreviewResponse)
async def upload_file(
    file: UploadFile = File(...),
    import_type: models.DataImportTypeEnum = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    file.file.seek(0, 2)
    file_size = file.file.tell()
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
    file.file.seek(0)
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(TEMP_DIR, f"{file_id}.csv")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
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
        
    data_import = models.DataImport(
        company_id=current_user.company_id,
        import_type=import_type,
        filename=file.filename,
        file_path=file_path,
        uploaded_by=current_user.id,
        total_records=total_rows,
        status=models.DataImportStatusEnum.uploaded
    )
    db.add(data_import)
    db.commit()
    db.refresh(data_import)
    
    audit.record_audit_log(
        db, None, current_user, 
        action="IMPORT_UPLOAD", 
        resource_type="DataImport", 
        resource_id=data_import.id, 
        description=f"Uploaded {import_type.value} import file"
    )
    db.commit()
    
    return schemas.ImportPreviewResponse(
        import_id=data_import.id,
        columns=columns,
        preview_data=preview_data,
        total_rows=total_rows
    )

def validate_row(import_type: models.DataImportTypeEnum, row: dict, db: Session, company_id: int, seen: dict):
    row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in row.items() if k is not None}
    
    if import_type == models.DataImportTypeEnum.products:
        name = row.get("Product Name") or row.get("name")
        sku = row.get("SKU") or row.get("sku")
        category = row.get("Category") or row.get("category")
        price = row.get("Unit Price") or row.get("unit_price") or row.get("price")
        stock = row.get("Stock Quantity") or row.get("stock_quantity") or row.get("stock")
        
        if not sku: return False, "Required", "SKU is required", False, "SKU"
        if not name: return False, "Required", "Product Name is required", False, "Product Name"
        if not category: return False, "Required", "Category is required", False, "Category"
        
        try:
            p = float(price)
            if p <= 0: return False, "Validation", "Price must be greater than zero", False, "Unit Price"
        except (TypeError, ValueError): return False, "Validation", "Invalid Price", False, "Unit Price"
        
        if stock:
            try:
                s = int(stock)
                if s < 0: return False, "Validation", "Stock cannot be negative", False, "Stock Quantity"
            except (TypeError, ValueError): return False, "Validation", "Invalid Stock", False, "Stock Quantity"
            
        if sku in seen:
            return False, "Duplicate", f"In-file duplicate SKU {sku}", True, "SKU"
        seen[sku] = True
        
        exists = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
        if exists: return False, "Duplicate", f"Product with SKU {sku} already exists in DB", True, "SKU"
        
        return True, "", "", False, None
        
    elif import_type == models.DataImportTypeEnum.customers:
        name = row.get("Name") or row.get("name") or row.get("Full Name") or row.get("full_name")
        email = row.get("Email") or row.get("email")
        phone = row.get("Phone") or row.get("phone")
        
        if not name: return False, "Required", "Name is required", False, "Name"
        if not email and not phone: return False, "Required", "Email or Phone is required", False, "Email"
        
        if email:
            if email in seen: return False, "Duplicate", f"In-file duplicate Email {email}", True, "Email"
            seen[email] = True
            exists = db.query(models.Customer).filter_by(company_id=company_id, email=email).first()
            if exists: return False, "Duplicate", f"Customer with email {email} already exists in DB", True, "Email"
            
        if phone:
            if phone in seen: return False, "Duplicate", f"In-file duplicate Phone {phone}", True, "Phone"
            seen[phone] = True
            exists = db.query(models.Customer).filter_by(company_id=company_id, phone=phone).first()
            if exists: return False, "Duplicate", f"Customer with phone {phone} already exists in DB", True, "Phone"
            
        return True, "", "", False, None
        
    elif import_type == models.DataImportTypeEnum.sales:
        invoice = row.get("Invoice Number") or row.get("invoice_number") or row.get("invoice")
        sku = row.get("Product SKU") or row.get("sku") or row.get("product")
        qty = row.get("Quantity") or row.get("quantity")
        customer_email = row.get("Customer Email")
        
        if not sku: return False, "Required", "Product SKU is required", False, "Product SKU"
        try:
            q = int(qty)
            if q <= 0: return False, "Validation", "Quantity must be greater than zero", False, "Quantity"
        except (TypeError, ValueError): return False, "Validation", "Invalid Quantity", False, "Quantity"
        
        product = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
        if not product: return False, "Validation", f"Product {sku} not found", False, "Product SKU"
        
        if invoice:
            if invoice in seen: return False, "Duplicate", f"In-file duplicate Invoice {invoice}", True, "Invoice Number"
            seen[invoice] = True
            exists = db.query(models.Sale).filter_by(company_id=company_id, invoice_number=invoice).first()
            if exists: return False, "Duplicate", f"Invoice {invoice} already exists in DB", True, "Invoice Number"
            
        return True, "", "", False, None

    elif import_type == models.DataImportTypeEnum.inventory:
        sku = row.get("SKU") or row.get("sku")
        qty_change = row.get("Quantity Change") or row.get("quantity_change")
        movement_type = row.get("Movement Type") or row.get("movement_type")
        reason = row.get("Reason") or row.get("reason")
        
        if not sku: return False, "Required", "SKU is required", False, "SKU"
        if not qty_change: return False, "Required", "Quantity Change is required", False, "Quantity Change"
        if not movement_type: return False, "Required", "Movement Type is required", False, "Movement Type"
        
        try:
            q = int(qty_change)
        except (TypeError, ValueError): return False, "Validation", "Invalid Quantity Change", False, "Quantity Change"
        
        if movement_type not in ["Stock Addition", "Stock Removal", "Manual Adjustment"]:
            return False, "Validation", "Invalid Movement Type", False, "Movement Type"
            
        product = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
        if not product: return False, "Validation", f"Product {sku} not found", False, "SKU"
        
        return True, "", "", False, None

    return False, "Validation", "Unknown import type", False, None

@router.post("/{import_id}/validate", response_model=schemas.DetailedValidationResponse)
def validate_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    data_import.status = models.DataImportStatusEnum.validating
    db.commit()
    
    audit.record_audit_log(db, None, current_user, "IMPORT_VALIDATE_START", "DataImport", data_import.id, "Started import validation")
    
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    validation_errors = []
    preview_data = []
    seen = {}
    
    if not os.path.exists(data_import.file_path):
        data_import.status = models.DataImportStatusEnum.failed
        db.commit()
        raise HTTPException(status_code=404, detail="File not found")

    with open(data_import.file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            row_number = idx + 2
            is_valid, err_type, err_msg, is_dup, field = validate_row(data_import.import_type, row, db, current_user.company_id, seen)
            if is_valid:
                valid_count += 1
                if len(preview_data) < 10:
                    preview_data.append(row)
            else:
                if is_dup:
                    duplicate_count += 1
                else:
                    invalid_count += 1
                validation_errors.append(schemas.ValidationErrorDetail(
                    row_number=row_number,
                    field=field,
                    error_type=err_type,
                    error_message=err_msg,
                    raw_data=row
                ))

    data_import.status = models.DataImportStatusEnum.pending
    db.commit()
    
    audit.record_audit_log(db, None, current_user, "IMPORT_VALIDATE_END", "DataImport", data_import.id, "Completed import validation")
    db.commit()

    return schemas.DetailedValidationResponse(
        total_records=data_import.total_records,
        valid_records=valid_count,
        invalid_records=invalid_count,
        duplicate_records=duplicate_count,
        validation_errors=validation_errors,
        preview_data=preview_data
    )

def process_in_background(import_id: int, user_id: int, company_id: int):
    db: Session = SessionLocal()
    try:
        data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=company_id).first()
        if not data_import:
            return
            
        user = db.query(models.User).filter_by(id=user_id).first()
        
        valid_count = 0
        failed_count = 0
        duplicate_count = 0
        skipped_count = 0
        
        categories_cache = {}
        seen = {}
        
        start_time = time.time()
        
        if not os.path.exists(data_import.file_path):
            data_import.status = models.DataImportStatusEnum.failed
            db.commit()
            return
            
        with open(data_import.file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            total = data_import.total_records
            
            for idx, raw_row in enumerate(reader):
                db.refresh(data_import)
                if data_import.status == models.DataImportStatusEnum.cancelled:
                    break
                    
                row_number = idx + 2
                row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in raw_row.items() if k is not None}
                
                is_valid, err_type, err_msg, is_dup, _ = validate_row(data_import.import_type, row, db, company_id, seen)
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
                    skipped_count += 1
                else:
                    try:
                        if data_import.import_type == models.DataImportTypeEnum.products:
                            cat_name = row.get("Category") or row.get("category")
                            if cat_name not in categories_cache:
                                cat = db.query(models.Category).filter_by(company_id=company_id, name=cat_name).first()
                                if not cat:
                                    cat = models.Category(company_id=company_id, name=cat_name)
                                    db.add(cat)
                                    db.flush()
                                categories_cache[cat_name] = cat
                            cat = categories_cache[cat_name]
                            
                            stock = row.get("Stock Quantity") or row.get("stock_quantity") or row.get("stock")
                            stock = int(stock) if stock else 0
                            
                            prod = models.Product(
                                company_id=company_id,
                                sku=row.get("SKU") or row.get("sku"),
                                name=row.get("Product Name") or row.get("name"),
                                category_id=cat.id,
                                brand=row.get("Brand") or row.get("brand"),
                                description=row.get("Description") or row.get("description"),
                                unit_price=float(row.get("Unit Price") or row.get("unit_price") or row.get("price")),
                                cost_price=float(row.get("Cost Price") or row.get("cost_price")) if row.get("Cost Price") or row.get("cost_price") else None,
                                stock_quantity=stock,
                                reorder_level=int(row.get("Reorder Level") or row.get("reorder_level") or 10)
                            )
                            db.add(prod)
                            db.flush()
                            evaluate_product_stock_alert(db, prod)
                            
                        elif data_import.import_type == models.DataImportTypeEnum.customers:
                            cust_count = db.query(models.Customer).filter_by(company_id=company_id).count()
                            cust_id_str = f"CUST-{(cust_count + valid_count + 1):04d}"
                            
                            cust = models.Customer(
                                company_id=company_id,
                                customer_id=cust_id_str,
                                full_name=row.get("Name") or row.get("name") or row.get("Full Name") or row.get("full_name"),
                                email=row.get("Email") or row.get("email") or f"noemail{uuid.uuid4().hex[:6]}@example.com",
                                phone=row.get("Phone") or row.get("phone") or "0000000000",
                                address=row.get("Address") or row.get("address"),
                                city=row.get("City") or row.get("city"),
                                state=row.get("State") or row.get("state"),
                                country=row.get("Country") or row.get("country"),
                                postal_code=row.get("Postal Code") or row.get("postal_code")
                            )
                            db.add(cust)
                            
                        elif data_import.import_type == models.DataImportTypeEnum.sales:
                            invoice = row.get("Invoice Number") or row.get("invoice_number") or row.get("invoice")
                            if not invoice:
                                invoice = f"INV-{uuid.uuid4().hex[:8].upper()}"
                                
                            sku = row.get("Product SKU") or row.get("sku") or row.get("product")
                            qty = int(row.get("Quantity") or row.get("quantity"))
                            prod = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
                            
                            price = row.get("Unit Price") or row.get("unit_price") or row.get("price")
                            if price: price = float(price)
                            else: price = prod.unit_price
                            
                            customer_email = row.get("Customer Email") or row.get("customer_email") or row.get("customer")
                            cust_id = None
                            cust_name = None
                            if customer_email:
                                customer = db.query(models.Customer).filter_by(company_id=company_id, email=customer_email).first()
                                if not customer: customer = db.query(models.Customer).filter_by(company_id=company_id, phone=customer_email).first()
                                if customer:
                                    cust_id = customer.id
                                    cust_name = customer.full_name
                            
                            store = db.query(models.Store).filter_by(company_id=company_id).first()
                            store_id = store.id if store else None
                            
                            pm = row.get("Payment Method") or row.get("payment_method")
                            pm_val = models.PaymentMethodEnum.cash
                            if pm == "Card": pm_val = models.PaymentMethodEnum.card
                            elif pm == "UPI": pm_val = models.PaymentMethodEnum.upi
                            
                            sale = models.Sale(
                                company_id=company_id,
                                store_id=store_id,
                                customer_id=cust_id,
                                customer_name=cust_name,
                                invoice_number=invoice,
                                total_amount=price * qty,
                                payment_method=pm_val,
                                created_by=user_id
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
                            
                            prod.stock_quantity -= qty
                            evaluate_product_stock_alert(db, prod)
                            
                        elif data_import.import_type == models.DataImportTypeEnum.inventory:
                            sku = row.get("SKU") or row.get("sku")
                            qty_change = int(row.get("Quantity Change") or row.get("quantity_change"))
                            movement_type = row.get("Movement Type") or row.get("movement_type")
                            reason = row.get("Reason") or row.get("reason")
                            remarks = row.get("Remarks") or row.get("remarks")
                            
                            prod = db.query(models.Product).filter_by(company_id=company_id, sku=sku).first()
                            
                            prev_qty = prod.stock_quantity
                            if movement_type == "Stock Addition":
                                prod.stock_quantity += qty_change
                                m_type = models.StockMovementEnum.stock_addition
                            elif movement_type == "Stock Removal":
                                prod.stock_quantity -= qty_change
                                m_type = models.StockMovementEnum.stock_removal
                            else:
                                prod.stock_quantity = qty_change
                                qty_change = qty_change - prev_qty
                                m_type = models.StockMovementEnum.manual_adjustment
                                
                            movement = models.StockMovement(
                                company_id=company_id,
                                product_id=prod.id,
                                movement_type=m_type,
                                previous_quantity=prev_qty,
                                updated_quantity=prod.stock_quantity,
                                quantity_changed=abs(qty_change),
                                reason=reason,
                                remarks=remarks,
                                user_id=user_id
                            )
                            db.add(movement)
                            evaluate_product_stock_alert(db, prod)

                        db.flush()
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
                        skipped_count += 1

                if idx % 10 == 0:
                    data_import.processing_progress = int((idx / total) * 100) if total > 0 else 0
                    elapsed_minutes = (time.time() - start_time) / 60
                    data_import.processing_speed = int(idx / elapsed_minutes) if elapsed_minutes > 0 else 0
                    db.commit()

        if data_import.status != models.DataImportStatusEnum.cancelled:
            data_import.successful_records = valid_count
            data_import.failed_records = failed_count
            data_import.duplicate_records = duplicate_count
            data_import.skipped_records = skipped_count
            data_import.processing_progress = 100
            data_import.status = models.DataImportStatusEnum.completed if failed_count == 0 else models.DataImportStatusEnum.completed_with_errors
            data_import.completed_at = datetime.now()
            
            audit.record_audit_log(
                db, None, user, 
                action="IMPORT_COMPLETED", 
                resource_type="DataImport", 
                resource_id=data_import.id, 
                description=f"Imported {valid_count} {data_import.import_type.value} records",
                after_values={"Valid": valid_count, "Failed": failed_count, "Duplicate": duplicate_count}
            )
            create_import_alert(db, data_import, is_success=True, errors_count=failed_count + duplicate_count)
            db.commit()
            
            if data_import.import_type in [models.DataImportTypeEnum.products, models.DataImportTypeEnum.inventory]:
                try:
                    run_reconciliation(db, user, data_import.import_type.value.lower())
                except Exception:
                    pass

    except Exception as e:
        db.rollback()
        data_import.status = models.DataImportStatusEnum.failed
        create_import_alert(db, data_import, is_success=False)
        audit.record_audit_log(db, None, user, "IMPORT_FAILED", "DataImport", data_import.id, str(e))
        db.commit()
    finally:
        db.close()


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
    
    create_notification(
        db=db,
        company_id=current_user.company_id,
        type=models.NotificationTypeEnum.system_alert,
        title='Import Started',
        message=f"{data_import.import_type.value} import has started.",
        user_id=current_user.id
    )
    
    audit.record_audit_log(db, None, current_user, "IMPORT_PROCESS_START", "DataImport", data_import.id, "Started import background processing")
    db.commit()
    
    thread = threading.Thread(target=process_in_background, args=(import_id, current_user.id, current_user.company_id), daemon=True)
    thread.start()
    
    data_import.uploader_name = current_user.name
    return data_import

@router.get("/{import_id}/status", response_model=schemas.DataImportOut)
def get_import_status(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
    
    user = db.query(models.User).filter_by(id=data_import.uploaded_by).first()
    data_import.uploader_name = user.name if user else "Unknown"
    return data_import

@router.get("/history", response_model=List[schemas.DataImportOut])
def get_import_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    imports = db.query(models.DataImport).filter_by(company_id=current_user.company_id).order_by(models.DataImport.created_at.desc()).offset(skip).limit(limit).all()
    for imp in imports:
        u = db.query(models.User).filter_by(id=imp.uploaded_by).first()
        imp.uploader_name = u.name if u else "Unknown"
    return imports

@router.get("/stats", response_model=schemas.ImportStatsResponse)
def get_import_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    
    base_q = db.query(models.DataImport).filter_by(company_id=current_user.company_id)
    
    total = base_q.count()
    completed = base_q.filter_by(status=models.DataImportStatusEnum.completed).count()
    completed_with_errors = base_q.filter_by(status=models.DataImportStatusEnum.completed_with_errors).count()
    failed = base_q.filter_by(status=models.DataImportStatusEnum.failed).count()
    last = base_q.order_by(desc(models.DataImport.created_at)).first()
    
    if last:
        u = db.query(models.User).filter_by(id=last.uploaded_by).first()
        last.uploader_name = u.name if u else "Unknown"
        
    last_30_total = base_q.filter(models.DataImport.created_at >= thirty_days_ago).count()
    prev_30_total = base_q.filter(models.DataImport.created_at >= sixty_days_ago, models.DataImport.created_at < thirty_days_ago).count()
    
    total_growth = ((last_30_total - prev_30_total) / prev_30_total * 100) if prev_30_total > 0 else (100.0 if last_30_total > 0 else 0.0)
    
    return schemas.ImportStatsResponse(
        total_imports=total,
        completed=completed,
        completed_with_errors=completed_with_errors,
        failed=failed,
        last_import=last,
        total_growth=total_growth
    )

@router.get("/{import_id}", response_model=schemas.DataImportOut)
def get_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
    user = db.query(models.User).filter_by(id=data_import.uploaded_by).first()
    data_import.uploader_name = user.name if user else "Unknown"
    return data_import

@router.get("/{import_id}/errors", response_model=List[schemas.DataImportErrorOut])
def get_import_errors(
    import_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    errors = db.query(models.DataImportError).filter_by(import_id=import_id).offset(skip).limit(limit).all()
    return errors

@router.get("/{import_id}/error-csv")
def download_error_csv(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    errors = db.query(models.DataImportError).filter_by(import_id=import_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Row Number", "Error Type", "Error Message", "Raw Data"])
    
    for err in errors:
        writer.writerow([err.row_number, err.error_type, err.error_message, err.raw_data])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=errors_import_{import_id}.csv"
    return response

@router.post("/{import_id}/cancel")
def cancel_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(allow_admin)
):
    data_import = db.query(models.DataImport).filter_by(id=import_id, company_id=current_user.company_id).first()
    if not data_import:
        raise HTTPException(status_code=404, detail="Import not found")
        
    if data_import.status not in [models.DataImportStatusEnum.processing, models.DataImportStatusEnum.pending]:
        raise HTTPException(status_code=400, detail="Can only cancel processing or pending imports")
        
    data_import.status = models.DataImportStatusEnum.cancelled
    audit.record_audit_log(db, None, current_user, "IMPORT_CANCELLED", "DataImport", data_import.id, "Cancelled import")
    db.commit()
    
    return {"message": "Import cancelled successfully"}

@router.get("/template/{import_type}")
def download_template(
    import_type: str,
):
    templates = {
        "products": [
            ["Product Name", "SKU", "Category", "Unit Price", "Stock Quantity", "Brand", "Description", "Cost Price", "Reorder Level"],
            ["Sample Product", "SKU001", "Electronics", "99.99", "100", "Brand X", "A sample product", "50.00", "10"]
        ],
        "customers": [
            ["Name", "Email", "Phone", "Address", "City", "State", "Country", "Postal Code", "Customer Type", "Date of Birth", "Gender"],
            ["John Doe", "john@example.com", "1234567890", "123 Main St", "New York", "NY", "USA", "10001", "Retail", "1990-01-01", "Male"]
        ],
        "sales": [
            ["Invoice Number", "Product SKU", "Quantity", "Customer Email", "Unit Price", "Payment Method"],
            ["INV-1001", "SKU001", "2", "john@example.com", "99.99", "Card"]
        ],
        "inventory": [
            ["SKU", "Quantity Change", "Movement Type", "Reason", "Remarks"],
            ["SKU001", "50", "Stock Addition", "New Delivery", "Received from supplier"]
        ]
    }
    
    if import_type not in templates:
        raise HTTPException(status_code=400, detail="Invalid import type")
        
    output = io.StringIO()
    writer = csv.writer(output)
    for row in templates[import_type]:
        writer.writerow(row)
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=template_{import_type}.csv"
    return response
