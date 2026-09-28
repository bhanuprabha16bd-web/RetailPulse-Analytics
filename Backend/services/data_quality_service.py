import json
from datetime import datetime, timedelta
from typing import Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from models import (
    DQIssueTypeEnum, DQSeverityEnum, DQModuleEnum,
    DataQualityIssue, ReconciliationRun, ReconciliationStatusEnum
)

def _get_next_issue_id(db: Session, company_id: int) -> str:
    last_issue = db.query(DataQualityIssue).filter(
        DataQualityIssue.company_id == company_id
    ).order_by(DataQualityIssue.id.desc()).first()
    if last_issue and last_issue.issue_id.startswith("DQ-"):
        try:
            num = int(last_issue.issue_id.split("-")[1])
            return f"DQ-{num + 1:04d}"
        except:
            pass
    return "DQ-0001"

def _create_or_update_issue(
    db: Session, company_id: int, issue_type: DQIssueTypeEnum, severity: DQSeverityEnum,
    module: DQModuleEnum, affected_record: str, resource_type: str, resource_id: int,
    description: str, related_data: dict, reconciliation_id: int
) -> bool:
    existing_issue = db.query(DataQualityIssue).filter(
        DataQualityIssue.company_id == company_id,
        DataQualityIssue.resource_type == resource_type,
        DataQualityIssue.resource_id == resource_id,
        DataQualityIssue.issue_type == issue_type,
        DataQualityIssue.status.in_([models.DQIssueStatusEnum.open, models.DQIssueStatusEnum.investigating])
    ).first()

    if existing_issue:
        existing_issue.description = description
        existing_issue.related_data = json.dumps(related_data)
        existing_issue.reconciliation_id = reconciliation_id
        return False
    else:
        new_issue = DataQualityIssue(
            company_id=company_id,
            issue_id=_get_next_issue_id(db, company_id),
            issue_type=issue_type,
            severity=severity,
            module=module,
            affected_record=affected_record,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            related_data=json.dumps(related_data),
            reconciliation_id=reconciliation_id
        )
        db.add(new_issue)
        return True

def check_stock_mismatches(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
    for product in products:
        records_checked += 1
        
        movements = db.query(models.StockMovement).filter(
            models.StockMovement.company_id == company_id,
            models.StockMovement.product_id == product.id
        ).order_by(models.StockMovement.timestamp).all()
        
        expected_stock = 0
        if movements:
            # The last movement's updated_quantity should match current stock
            expected_stock = movements[-1].updated_quantity
        
        if expected_stock != product.stock_quantity:
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.stock_mismatch, DQSeverityEnum.critical,
                DQModuleEnum.inventory, f"Product: {product.name} (SKU: {product.sku})",
                "Product", product.id,
                f"Stock mismatch: Current {product.stock_quantity}, Expected {expected_stock}",
                {"current_stock": product.stock_quantity, "expected_quantity": expected_stock, "difference": product.stock_quantity - expected_stock},
                reconciliation_id
            )
            if is_new:
                issues_found += 1
    
    return records_checked, issues_found

def check_invalid_product_references(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    sale_items = db.query(models.SaleItem).join(models.Sale).filter(models.Sale.company_id == company_id).all()
    records_checked = len(sale_items)
    
    for item in sale_items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product or not product.status:
            desc = "Product does not exist" if not product else "Product is inactive"
            name = product.name if product else f"Unknown ({item.product_id})"
            
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.invalid_product_ref, DQSeverityEnum.high,
                DQModuleEnum.sales, f"SaleItem ID: {item.id} in Sale {item.sale_id}",
                "SaleItem", item.id,
                f"Sale references invalid/inactive product: {name}",
                {"product_id": item.product_id, "sale_id": item.sale_id, "issue": desc},
                reconciliation_id
            )
            if is_new:
                issues_found += 1

    return records_checked, issues_found

def check_invalid_customer_references(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    sales = db.query(models.Sale).filter(
        models.Sale.company_id == company_id,
        models.Sale.customer_id.isnot(None)
    ).all()
    records_checked = len(sales)
    
    for sale in sales:
        customer = db.query(models.Customer).filter(models.Customer.id == sale.customer_id).first()
        if not customer or customer.is_deleted:
            desc = "Customer deleted or not found"
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.invalid_customer_ref, DQSeverityEnum.medium,
                DQModuleEnum.sales, f"Sale ID: {sale.id} (Invoice: {sale.invoice_number})",
                "Sale", sale.id,
                f"Sale references invalid customer ID: {sale.customer_id}",
                {"customer_id": sale.customer_id, "invoice_number": sale.invoice_number, "issue": desc},
                reconciliation_id
            )
            if is_new:
                issues_found += 1
                
    return records_checked, issues_found

def check_duplicate_skus(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
    records_checked = len(products)
    
    sku_map = {}
    for product in products:
        if product.sku in sku_map:
            sku_map[product.sku].append(product)
        else:
            sku_map[product.sku] = [product]
            
    for sku, prods in sku_map.items():
        if len(prods) > 1:
            for p in prods:
                is_new = _create_or_update_issue(
                    db, company_id, DQIssueTypeEnum.duplicate_sku, DQSeverityEnum.high,
                    DQModuleEnum.products, f"Product: {p.name} (ID: {p.id})",
                    "Product", p.id,
                    f"Duplicate SKU found: {sku}",
                    {"sku": sku, "duplicate_count": len(prods), "product_ids": [x.id for x in prods]},
                    reconciliation_id
                )
                if is_new:
                    issues_found += 1
                    
    return records_checked, issues_found

def check_missing_information(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
    for product in products:
        records_checked += 1
        if not product.name or not product.sku or product.unit_price is None:
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.missing_information, DQSeverityEnum.low,
                DQModuleEnum.products, f"Product ID: {product.id}",
                "Product", product.id,
                "Product is missing required information (name, sku, or price)",
                {"name": product.name, "sku": product.sku, "price": product.unit_price},
                reconciliation_id
            )
            if is_new:
                issues_found += 1
                
    customers = db.query(models.Customer).filter(models.Customer.company_id == company_id).all()
    for customer in customers:
        records_checked += 1
        if not customer.full_name or not customer.email or not customer.phone:
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.missing_information, DQSeverityEnum.low,
                DQModuleEnum.customers, f"Customer ID: {customer.id}",
                "Customer", customer.id,
                "Customer is missing required information (name, email, or phone)",
                {"name": customer.full_name, "email": customer.email, "phone": customer.phone},
                reconciliation_id
            )
            if is_new:
                issues_found += 1
                
    return records_checked, issues_found

def check_stock_movement_consistency(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
    for product in products:
        movements = db.query(models.StockMovement).filter(
            models.StockMovement.company_id == company_id,
            models.StockMovement.product_id == product.id
        ).order_by(models.StockMovement.timestamp).all()
        
        records_checked += len(movements)
        
        for i in range(1, len(movements)):
            prev = movements[i-1]
            curr = movements[i]
            if prev.updated_quantity != curr.previous_quantity:
                is_new = _create_or_update_issue(
                    db, company_id, DQIssueTypeEnum.stock_movement_mismatch, DQSeverityEnum.medium,
                    DQModuleEnum.inventory, f"StockMovement ID: {curr.id}",
                    "StockMovement", curr.id,
                    f"Stock movement chain broken for product {product.id}",
                    {"prev_updated": prev.updated_quantity, "curr_previous": curr.previous_quantity},
                    reconciliation_id
                )
                if is_new:
                    issues_found += 1
                    
    return records_checked, issues_found

def check_sales_total_mismatch(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    sales = db.query(models.Sale).filter(models.Sale.company_id == company_id).all()
    records_checked = len(sales)
    
    for sale in sales:
        items_total = sum(item.total for item in sale.items)
        if abs(sale.total_amount - items_total) > 0.01:
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.report_mismatch, DQSeverityEnum.high,
                DQModuleEnum.sales, f"Sale ID: {sale.id} (Invoice: {sale.invoice_number})",
                "Sale", sale.id,
                f"Sale total ({sale.total_amount}) does not match items total ({items_total})",
                {"sale_total": sale.total_amount, "items_total": items_total},
                reconciliation_id
            )
            if is_new:
                issues_found += 1
                
    return records_checked, issues_found

def check_deactivated_product_sales(db: Session, company_id: int, reconciliation_id: int = None) -> Tuple[int, int]:
    records_checked = 0
    issues_found = 0
    
    recent_time = datetime.utcnow() - timedelta(days=30)
    sale_items = db.query(models.SaleItem).join(models.Sale).filter(
        models.Sale.company_id == company_id,
        models.Sale.created_at >= recent_time
    ).all()
    
    records_checked = len(sale_items)
    
    for item in sale_items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product and not product.status:
            is_new = _create_or_update_issue(
                db, company_id, DQIssueTypeEnum.product_deactivated, DQSeverityEnum.medium,
                DQModuleEnum.sales, f"SaleItem ID: {item.id} (Sale: {item.sale_id})",
                "SaleItem", item.id,
                f"Recent sale includes deactivated product: {product.name}",
                {"product_id": product.id, "sale_id": item.sale_id},
                reconciliation_id
            )
            if is_new:
                issues_found += 1
                
    return records_checked, issues_found

def run_reconciliation(db: Session, company_id: int, user_id: int) -> ReconciliationRun:
    last_run = db.query(ReconciliationRun).filter(
        ReconciliationRun.company_id == company_id
    ).order_by(ReconciliationRun.id.desc()).first()
    
    if last_run and last_run.execution_id.startswith("REC-"):
        try:
            num = int(last_run.execution_id.split("-")[1])
            exec_id = f"REC-{num + 1:04d}"
        except:
            exec_id = "REC-0001"
    else:
        exec_id = "REC-0001"
        
    run = ReconciliationRun(
        company_id=company_id,
        execution_id=exec_id,
        triggered_by=user_id,
        status=ReconciliationStatusEnum.running
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    total_records = 0
    total_issues = 0
    failed_checks = 0
    
    checks = [
        check_stock_mismatches,
        check_invalid_product_references,
        check_invalid_customer_references,
        check_duplicate_skus,
        check_missing_information,
        check_stock_movement_consistency,
        check_sales_total_mismatch,
        check_deactivated_product_sales
    ]
    
    for check_func in checks:
        try:
            r_checked, i_found = check_func(db, company_id, run.id)
            total_records += r_checked
            total_issues += i_found
            db.commit()
        except Exception as e:
            db.rollback()
            failed_checks += 1
            run.error_message = f"{run.error_message or ''} | Error in {check_func.__name__}: {str(e)}"
            
    run.records_checked = total_records
    run.issues_found = total_issues
    run.failed_checks = failed_checks
    run.completed_at = datetime.utcnow()
    
    if failed_checks == len(checks):
        run.status = ReconciliationStatusEnum.failed
    elif total_issues > 0 or failed_checks > 0:
        run.status = ReconciliationStatusEnum.completed_with_issues
    else:
        run.status = ReconciliationStatusEnum.completed
        
    db.commit()
    db.refresh(run)
    return run

def run_targeted_check(db: Session, company_id: int, check_type: str, resource_type: str, resource_id: int):
    pass
