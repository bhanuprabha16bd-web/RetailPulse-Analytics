from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
import csv, io
import models, audit
from database import get_db
from dependencies import RoleChecker, get_current_company_user, scope_company_query

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])
allow_forecasts = RoleChecker([models.RoleEnum.company_owner, models.RoleEnum.company_admin, models.RoleEnum.super_admin, models.RoleEnum.analyst])

def days_for(period: str) -> int:
    return {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)


def pdf_safe(value) -> str:
    """Encode plain report text safely for a built-in PDF document."""
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").encode("latin-1", "replace").decode("latin-1")


def product_forecast_pdf(products: list[dict], period: str) -> bytes:
    """Create a compact, dependency-free PDF product forecast report."""
    lines = [
        "RetailPulse Analytics - Product Forecast Report",
        f"Forecast period: {period}    Products: {len(products)}",
        "Product | Category | Brand | Stock | Predicted | Growth | Accuracy",
        "-" * 100,
    ]
    for product in products:
        lines.append(
            f"{product['productName'][:22]} | {product['category'][:16]} | {product['brand'][:14]} | "
            f"{product['currentStock']} | {product['predictedDemand']} | {product['growth']}% | {product['accuracy']}%"
        )
    if not products:
        lines.append("No product forecasts match the selected filters.")

    pages = [lines[index:index + 42] for index in range(0, len(lines), 42)] or [[]]
    objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""]
    page_ids, content_ids = [], []
    for _ in pages:
        page_ids.append(len(objects) + 1)
        objects.append("")
        content_ids.append(len(objects) + 1)
        objects.append("")
    objects[1] = f"<< /Type /Pages /Kids [{' '.join(f'{page_id} 0 R' for page_id in page_ids)}] /Count {len(page_ids)} >>"
    for page_id, content_id, page_lines in zip(page_ids, content_ids, pages):
        text = ["BT", "/F1 9 Tf", "50 775 Td", "12 TL"]
        for index, line in enumerate(page_lines):
            if index:
                text.append("T*")
            text.append(f"({pdf_safe(line)}) Tj")
        text.append("ET")
        stream = "\n".join(text)
        objects[page_id - 1] = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents {content_id} 0 R >>"
        objects[content_id - 1] = f"<< /Length {len(stream.encode('latin-1'))} >>\nstream\n{stream}\nendstream"

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n{obj}\nendobj\n".encode("latin-1"))
    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("ascii"))
    return bytes(pdf)

def generate(db, user, period: str, refresh: bool = False):
    horizon = days_for(period)
    since = datetime.utcnow() - timedelta(days=90)
    products = scope_company_query(db.query(models.Product), user, models.Product).filter(models.Product.status.is_(True)).all()
    created = 0
    for product in products:
        historical = db.query(func.sum(models.SaleItem.quantity)).join(models.Sale).filter(models.Sale.company_id == user.company_id, models.SaleItem.product_id == product.id, models.Sale.created_at >= since).scalar() or 0
        if not historical:
            continue
        predicted = round((float(historical) / 90) * horizon, 2)
        existing = db.query(models.DemandForecast).filter_by(company_id=user.company_id, product_id=product.id, forecast_period=period).first()
        if existing and not refresh:
            continue
        forecast = existing or models.DemandForecast(company_id=user.company_id, product_id=product.id, category_id=product.category_id, forecast_period=period, predicted_demand=predicted, confidence_score=round(min(95, 60 + min(35, historical)), 1))
        forecast.predicted_demand, forecast.confidence_score = predicted, round(min(95, 60 + min(35, historical)), 1)
        db.add(forecast); db.flush()
        db.add(models.ForecastHistory(forecast_id=forecast.id, historical_sales=float(historical), prediction=predicted, accuracy=forecast.confidence_score))
        if predicted >= product.stock_quantity:
            db.add(models.Notification(company_id=user.company_id, message=f"Forecast alert: {product.name} may run out of stock in the next {horizon} days."))
        created += 1
    if not created:
        raise HTTPException(422, "Historical sales data is required to generate forecasts")
    return created

@router.post("/generate", dependencies=[Depends(allow_forecasts)])
def generate_forecasts(period: str = Query("30d"), refresh: bool = False, request: Request = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    created = generate(db, current_user, period, refresh)
    audit.record_audit_log(db, request, current_user, "Forecast Refreshed" if refresh else "Forecast Generated", target_name=period)
    db.commit(); return {"generated": created}

@router.get("/dashboard", dependencies=[Depends(allow_forecasts)])
def dashboard(period: str = "30d", product_id: int | None = None, category_id: int | None = None, brand: str | None = None, sort_by: str = "predicted", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    base_query = db.query(models.DemandForecast).join(models.Product).filter(
        models.DemandForecast.company_id == current_user.company_id,
        models.DemandForecast.forecast_period == period,
        models.Product.status.is_(True),
    )
    # Keep the available filter options stable while another filter is active.
    available_forecasts = base_query.all()
    filters = {
        "products": sorted(
            [{"id": forecast.product_id, "name": forecast.product.name} for forecast in available_forecasts],
            key=lambda product: product["name"].lower(),
        ),
        "categories": sorted(
            [{"id": forecast.category_id, "name": forecast.category.name} for forecast in available_forecasts],
            key=lambda category: category["name"].lower(),
        ),
        "brands": sorted({forecast.product.brand for forecast in available_forecasts if forecast.product.brand}),
    }
    q = base_query
    if product_id: q = q.filter(models.DemandForecast.product_id == product_id)
    if category_id: q = q.filter(models.DemandForecast.category_id == category_id)
    if brand: q = q.filter(models.Product.brand == brand)
    forecasts = q.all()
    rows = []
    for f in forecasts:
        history = db.query(models.ForecastHistory).filter(models.ForecastHistory.forecast_id == f.id).order_by(desc(models.ForecastHistory.created_at)).first()
        stock = f.product.stock_quantity; predicted = f.predicted_demand; growth = ((predicted - history.historical_sales) / history.historical_sales * 100) if history and history.historical_sales else 0
        recommendation = "Immediate Restock Required" if stock <= 0 or predicted >= stock else "Reorder Soon" if stock <= f.product.reorder_level or predicted >= stock * .8 else "Overstock Risk" if stock > predicted * 3 else "Stock Level Healthy"
        rows.append({"id": f.id, "productId": f.product_id, "productName": f.product.name, "category": f.category.name, "brand": f.product.brand or "—", "currentStock": stock, "historicalSales": history.historical_sales if history else 0, "predictedDemand": predicted, "period": period, "confidence": f.confidence_score, "growth": round(growth, 1), "recommendation": recommendation, "accuracy": history.accuracy if history else f.confidence_score})
    sort_key = {"stock": "currentStock", "growth": "growth", "accuracy": "accuracy"}.get(sort_by, "predictedDemand")
    rows.sort(key=lambda row: row[sort_key], reverse=sort_by != "stock")
    categories = {}
    for row in rows:
        c = categories.setdefault(row["category"], {"category": row["category"], "historicalSales": 0, "predictedDemand": 0})
        c["historicalSales"] += row["historicalSales"]; c["predictedDemand"] += row["predictedDemand"]
    for c in categories.values(): c["growth"] = round((c["predictedDemand"] - c["historicalSales"]) / c["historicalSales"] * 100, 1) if c["historicalSales"] else 0
    return {"products": rows, "categories": list(categories.values()), "filters": filters, "kpis": {"totalPredictedDemand": round(sum(r["predictedDemand"] for r in rows), 1), "runOut": sum(r["recommendation"] == "Immediate Restock Required" for r in rows), "highGrowth": sum(r["growth"] >= 20 for r in rows), "slowMoving": sum(r["growth"] <= 0 for r in rows), "accuracy": round(sum(r["accuracy"] for r in rows) / len(rows), 1) if rows else 0}}

@router.get("/export/demand.csv", dependencies=[Depends(allow_forecasts)])
@router.get("/export.csv", dependencies=[Depends(allow_forecasts)], include_in_schema=False)
def export_demand_csv(period: str = "30d", product_id: int | None = None, category_id: int | None = None, brand: str | None = None, sort_by: str = "predicted", request: Request = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    data = dashboard(period=period, product_id=product_id, category_id=category_id, brand=brand, sort_by=sort_by, db=db, current_user=current_user)
    out = io.StringIO(); writer = csv.DictWriter(out, fieldnames=["productName", "category", "brand", "currentStock", "historicalSales", "predictedDemand", "confidence", "growth", "accuracy", "recommendation"], extrasaction="ignore"); writer.writeheader(); writer.writerows(data["products"]); out.seek(0)
    audit.record_audit_log(db, request, current_user, "Forecast Exported", target_name=period); db.commit()
    return StreamingResponse(out, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=demand_forecast_report.csv"})


@router.get("/export/category.csv", dependencies=[Depends(allow_forecasts)])
def export_category_csv(period: str = "30d", product_id: int | None = None, category_id: int | None = None, brand: str | None = None, sort_by: str = "predicted", request: Request = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    data = dashboard(period=period, product_id=product_id, category_id=category_id, brand=brand, sort_by=sort_by, db=db, current_user=current_user)
    out = io.StringIO(); writer = csv.DictWriter(out, fieldnames=["category", "historicalSales", "predictedDemand", "growth"]); writer.writeheader(); writer.writerows(data["categories"]); out.seek(0)
    audit.record_audit_log(db, request, current_user, "Category Forecast Exported", target_name=period); db.commit()
    return StreamingResponse(out, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=category_forecast_report.csv"})


@router.get("/export/product.pdf", dependencies=[Depends(allow_forecasts)])
def export_product_pdf(period: str = "30d", product_id: int | None = None, category_id: int | None = None, brand: str | None = None, sort_by: str = "predicted", request: Request = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_company_user)):
    data = dashboard(period=period, product_id=product_id, category_id=category_id, brand=brand, sort_by=sort_by, db=db, current_user=current_user)
    audit.record_audit_log(db, request, current_user, "Product Forecast PDF Exported", target_name=period); db.commit()
    return Response(content=product_forecast_pdf(data["products"], period), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=product_forecast_report.pdf"})
