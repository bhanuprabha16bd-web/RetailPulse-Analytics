import csv
import io
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from dependencies import RoleChecker, get_current_company_user, scope_company_query

router = APIRouter(prefix="/api/reports", tags=["Reports"])

REPORT_TYPES = {
    "sales": "Sales Report",
    "inventory": "Inventory Report",
    "customer": "Customer Report",
    "product-performance": "Product Performance Report",
    "stock-movement": "Stock Movement Report",
}

allow_schedule_management = RoleChecker([
    models.RoleEnum.company_owner,
    models.RoleEnum.company_admin,
    models.RoleEnum.super_admin,
])


def parse_filters(start_date, end_date, product_id, category_id, brand, customer_id, sales_status, stock_status, user_id):
    return {
        key: value for key, value in {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "product_id": product_id,
            "category_id": category_id,
            "brand": brand,
            "customer_id": customer_id,
            "sales_status": sales_status.value if hasattr(sales_status, "value") else sales_status,
            "stock_status": stock_status,
            "user_id": user_id,
        }.items() if value is not None
    }


def apply_product_filters(query, filters):
    if filters.get("product_id"):
        query = query.filter(models.Product.id == filters["product_id"])
    if filters.get("category_id"):
        query = query.filter(models.Product.category_id == filters["category_id"])
    if filters.get("brand"):
        query = query.filter(models.Product.brand == filters["brand"])
    return query


def build_rows(db: Session, current_user: models.User, report_type: str, filters: dict[str, Any]):
    if report_type not in REPORT_TYPES:
        raise HTTPException(422, "Unsupported report type")
    company_id = current_user.company_id
    start_date = datetime.fromisoformat(filters["start_date"]) if filters.get("start_date") else None
    end_date = datetime.fromisoformat(filters["end_date"]) if filters.get("end_date") else None
    if filters.get("end_date") and len(filters["end_date"]) == 10:
        end_date = end_date.replace(hour=23, minute=59, second=59)
    rows = []

    if report_type == "sales":
        query = db.query(models.SaleItem, models.Sale, models.Product, models.Category).join(models.Sale).filter(models.Sale.company_id == company_id)
        query = query.join(models.Product).join(models.Category, models.Product.category_id == models.Category.id)
        if start_date: query = query.filter(models.Sale.created_at >= start_date)
        if end_date: query = query.filter(models.Sale.created_at <= end_date)
        if filters.get("customer_id"): query = query.filter(models.Sale.customer_id == filters["customer_id"])
        if filters.get("sales_status"): query = query.filter(models.Sale.payment_status == filters["sales_status"])
        if filters.get("user_id"): query = query.filter(models.Sale.created_by == filters["user_id"])
        query = apply_product_filters(query, filters)
        for item, sale, product, category in query.order_by(desc(models.Sale.created_at)).all():
            rows.append({"invoice": sale.invoice_number, "date": sale.created_at, "customer": sale.customer_name or "Walk-in", "product": product.name, "category": category.name, "quantity": item.quantity, "unit_price": item.unit_price, "total": item.total, "payment_status": sale.payment_status.value})

    elif report_type == "inventory":
        query = scope_company_query(db.query(models.Product), current_user, models.Product).join(models.Category)
        query = apply_product_filters(query, filters)
        products = query.order_by(models.Product.name).all()
        for product in products:
            available = product.stock_quantity - product.reserved_stock
            status = "Out of Stock" if available <= 0 else "Low Stock" if available <= product.reorder_level else "In Stock"
            if filters.get("stock_status") and status != filters["stock_status"]: continue
            rows.append({"sku": product.sku, "product": product.name, "category": product.category.name, "brand": product.brand or "Unbranded", "stock": product.stock_quantity, "reserved": product.reserved_stock, "available": available, "reorder_level": product.reorder_level, "stock_status": status, "unit_price": product.unit_price})

    elif report_type == "customer":
        query = scope_company_query(db.query(models.Customer), current_user, models.Customer).filter(models.Customer.is_deleted.is_(False))
        if filters.get("customer_id"): query = query.filter(models.Customer.id == filters["customer_id"])
        customers = query.order_by(models.Customer.full_name).all()
        for customer in customers:
            sales_query = scope_company_query(db.query(models.Sale), current_user, models.Sale).filter(models.Sale.customer_id == customer.id)
            if start_date: sales_query = sales_query.filter(models.Sale.created_at >= start_date)
            if end_date: sales_query = sales_query.filter(models.Sale.created_at <= end_date)
            sales = sales_query.all()
            rows.append({"customer_id": customer.customer_id, "customer": customer.full_name, "email": customer.email, "type": customer.customer_type.value, "status": customer.status.value, "orders": len(sales), "revenue": sum(sale.total_amount for sale in sales), "last_purchase": max((sale.created_at for sale in sales), default=None)})

    elif report_type == "product-performance":
        query = db.query(models.SaleItem.product_id, func.sum(models.SaleItem.quantity).label("quantity"), func.sum(models.SaleItem.total).label("revenue")).join(models.Sale).filter(models.Sale.company_id == company_id).group_by(models.SaleItem.product_id)
        if start_date: query = query.filter(models.Sale.created_at >= start_date)
        if end_date: query = query.filter(models.Sale.created_at <= end_date)
        for product_id, quantity, revenue in query.all():
            product = scope_company_query(db.query(models.Product), current_user, models.Product).filter(models.Product.id == product_id).first()
            if not product: continue
            if apply_product_filters(db.query(models.Product), filters).filter(models.Product.id == product.id).first() is None: continue
            rows.append({"product": product.name, "sku": product.sku, "category": product.category.name, "brand": product.brand or "Unbranded", "quantity_sold": int(quantity or 0), "revenue": float(revenue or 0), "unit_price": product.unit_price})
        rows.sort(key=lambda row: row["revenue"], reverse=True)

    else:
        query = db.query(models.StockMovement, models.Product, models.Category, models.User).filter(models.StockMovement.company_id == company_id).join(models.Product, models.StockMovement.product_id == models.Product.id).join(models.Category, models.Product.category_id == models.Category.id).join(models.User, models.StockMovement.user_id == models.User.id)
        if start_date: query = query.filter(models.StockMovement.timestamp >= start_date)
        if end_date: query = query.filter(models.StockMovement.timestamp <= end_date)
        if filters.get("user_id"): query = query.filter(models.StockMovement.user_id == filters["user_id"])
        query = apply_product_filters(query, filters)
        for movement, product, category, user in query.order_by(desc(models.StockMovement.timestamp)).all():
            rows.append({"date": movement.timestamp, "product": product.name, "category": category.name, "movement_type": movement.movement_type.value, "quantity_changed": movement.quantity_changed, "previous_quantity": movement.previous_quantity, "updated_quantity": movement.updated_quantity, "user": user.name or user.email, "reason": movement.reason or ""})

    return rows


def filter_params(start_date, end_date, product_id, category_id, brand, customer_id, sales_status, stock_status, user_id):
    return parse_filters(start_date, end_date, product_id, category_id, brand, customer_id, sales_status, stock_status, user_id)


def make_history(db, current_user, report_type, filters, report_format, status="Success", error_message=None):
    history = models.ReportHistory(company_id=current_user.company_id, report_type=report_type, generated_by=current_user.id, filters=json.dumps(filters), format=report_format, status=status, error_message=error_message)
    db.add(history)
    return history


def json_value(value, default):
    if isinstance(value, (dict, list)):
        return value
    return json.loads(value or default)


def schedule_response(record):
    return {
        "id": record.id,
        "company_id": record.company_id,
        "created_by": record.created_by,
        "report_type": record.report_type,
        "filters": json_value(record.filters, "{}"),
        "frequency": record.frequency,
        "execution_time": record.execution_time,
        "recipients": json_value(record.recipients, "[]"),
        "format": record.format,
        "is_active": record.is_active,
        "last_run_at": record.last_run_at,
        "last_status": record.last_status,
        "last_error": record.last_error,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def text_pdf(lines):
    safe_lines = [str(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:140] for line in lines]
    content = ["BT", "/F1 9 Tf", "50 780 Td", "12 TL"]
    for index, line in enumerate(safe_lines):
        if index: content.append("T*")
        content.append(f"({line}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream.decode('latin-1')}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, obj in enumerate(objects, 1):
        offsets.append(len(pdf)); pdf.extend(f"{number} 0 obj\n{obj}\nendobj\n".encode("latin-1"))
    xref = len(pdf); pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets: pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(pdf)


def common_report_params(
    report_type: str = Query("sales"), start_date: datetime | None = None, end_date: datetime | None = None,
    product_id: int | None = None, category_id: int | None = None, brand: str | None = None,
    customer_id: int | None = None, sales_status: models.PaymentStatusEnum | None = None,
    stock_status: str | None = None, user_id: int | None = None,
):
    return report_type, filter_params(start_date, end_date, product_id, category_id, brand, customer_id, sales_status, stock_status, user_id)


@router.get("/types")
def report_types():
    return [{"value": value, "label": label} for value, label in REPORT_TYPES.items()]


@router.get("/data")
def report_data(params=Depends(common_report_params), page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=100), sort_by: str = "date", sort_order: str = "desc", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    report_type, filters = params
    rows = build_rows(db, current_user, report_type, filters)
    if sort_by in rows[0] if rows else False:
        rows.sort(key=lambda row: (row.get(sort_by) is None, row.get(sort_by)), reverse=sort_order == "desc")
    total = len(rows)
    start = (page - 1) * limit
    return {"report_type": report_type, "report_name": REPORT_TYPES[report_type], "filters": filters, "rows": rows[start:start + limit], "total": total, "page": page, "limit": limit}


@router.post("/generate")
def generate_report(params=Depends(common_report_params), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    report_type, filters = params
    try:
        rows = build_rows(db, current_user, report_type, filters)
        history = make_history(db, current_user, report_type, filters, models.ReportFormatEnum.csv)
        db.commit()
        return {"report_type": report_type, "report_name": REPORT_TYPES[report_type], "filters": filters, "rows": rows, "total": len(rows), "history_id": history.id}
    except Exception as error:
        db.rollback()
        make_history(db, current_user, report_type, filters, models.ReportFormatEnum.csv, "Failed", str(error))
        db.commit()
        raise HTTPException(500, "Report generation failed")


def export_report(params, report_format, db, current_user):
    report_type, filters = params
    rows = build_rows(db, current_user, report_type, filters)
    history = make_history(db, current_user, report_type, filters, report_format)
    db.commit()
    fields = list(rows[0].keys()) if rows else ["message"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows or [{"message": "No records match the selected filters."}])
    if report_format == models.ReportFormatEnum.csv:
        return StreamingResponse(io.BytesIO(output.getvalue().encode("utf-8")), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={report_type}_report.csv"})
    text = [REPORT_TYPES[report_type], f"Applied filters: {json.dumps(filters)}", "", *[" | ".join(str(row.get(field, "")) for field in fields) for row in rows]]
    return Response(text_pdf(text), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"})


@router.get("/export")
def export(report_format: models.ReportFormatEnum = Query(models.ReportFormatEnum.csv), params=Depends(common_report_params), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    return export_report(params, report_format, db, current_user)


@router.get("/history", response_model=list[schemas.ReportHistoryOut])
def report_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    histories = scope_company_query(db.query(models.ReportHistory), current_user, models.ReportHistory).order_by(desc(models.ReportHistory.created_at)).limit(100).all()
    result = []
    for history in histories:
        result.append({"id": history.id, "report_type": history.report_type, "generated_by": history.generated_by, "filters": json.loads(history.filters or "{}"), "format": history.format, "status": history.status, "error_message": history.error_message, "created_at": history.created_at})
    return result


@router.get("/schedules", response_model=list[schemas.ScheduledReportOut])
def schedules(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    records = scope_company_query(db.query(models.ScheduledReport), current_user, models.ScheduledReport).order_by(desc(models.ScheduledReport.created_at)).all()
    return [schedule_response(record) for record in records]


@router.post("/schedules", response_model=schemas.ScheduledReportOut, dependencies=[Depends(allow_schedule_management)])
def create_schedule(payload: schemas.ScheduledReportCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    if payload.report_type not in REPORT_TYPES: raise HTTPException(422, "Unsupported report type")
    record = models.ScheduledReport(company_id=current_user.company_id, created_by=current_user.id, report_type=payload.report_type, filters=json.dumps(payload.filters), frequency=payload.frequency, execution_time=payload.execution_time, recipients=json.dumps(payload.recipients), format=payload.format, is_active=payload.is_active)
    db.add(record); db.commit(); db.refresh(record)
    return schedule_response(record)


@router.patch("/schedules/{schedule_id}", response_model=schemas.ScheduledReportOut, dependencies=[Depends(allow_schedule_management)])
def update_schedule(schedule_id: int, payload: schemas.ScheduledReportCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    record = scope_company_query(db.query(models.ScheduledReport), current_user, models.ScheduledReport).filter(models.ScheduledReport.id == schedule_id).first()
    if not record: raise HTTPException(404, "Schedule not found")
    for field in ("report_type", "frequency", "execution_time", "format", "is_active"): setattr(record, field, getattr(payload, field))
    record.filters = json.dumps(payload.filters); record.recipients = json.dumps(payload.recipients)
    db.commit(); db.refresh(record)
    return schedule_response(record)


@router.delete("/schedules/{schedule_id}", dependencies=[Depends(allow_schedule_management)])
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    record = scope_company_query(db.query(models.ScheduledReport), current_user, models.ScheduledReport).filter(models.ScheduledReport.id == schedule_id).first()
    if not record: raise HTTPException(404, "Schedule not found")
    db.delete(record); db.commit(); return {"deleted": True}


@router.post("/schedules/{schedule_id}/run", dependencies=[Depends(allow_schedule_management)])
def run_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    record = scope_company_query(db.query(models.ScheduledReport), current_user, models.ScheduledReport).filter(models.ScheduledReport.id == schedule_id).first()
    if not record: raise HTTPException(404, "Schedule not found")
    try:
        filters = json_value(record.filters, "{}")
        rows = build_rows(db, current_user, record.report_type, filters)
        record.last_run_at = datetime.utcnow(); record.last_status = "Success"; record.last_error = None
        make_history(db, current_user, record.report_type, filters, record.format)
        db.commit()
        return {"status": "Success", "rows": len(rows), "recipients": json_value(record.recipients, "[]")}
    except Exception as error:
        record.last_run_at = datetime.utcnow(); record.last_status = "Failed"; record.last_error = str(error)
        db.commit(); raise HTTPException(500, "Scheduled report failed")
