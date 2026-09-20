# Reporting API

All endpoints are under `/api/reports` and require a bearer access token. Report queries are always restricted to the authenticated user's company.

## Reports

- `GET /types` lists supported report types.
- `GET /data` returns a paginated report. Parameters include `report_type`, `start_date`, `end_date`, `product_id`, `category_id`, `brand`, `customer_id`, `sales_status`, `stock_status`, `user_id`, `page`, `limit`, `sort_by`, and `sort_order`.
- `POST /generate` generates a complete report and records report history.
- `GET /export` downloads CSV or PDF using the same filters. Use `report_format=CSV|PDF`.
- `GET /history` lists the authenticated company's report history.

Supported `report_type` values are `sales`, `inventory`, `customer`, `product-performance`, and `stock-movement`.

## Scheduled reports

Schedule administration requires Company Owner, Company Admin, or Super Admin role:

- `GET /schedules`
- `POST /schedules`
- `PATCH /schedules/{schedule_id}`
- `DELETE /schedules/{schedule_id}`
- `POST /schedules/{schedule_id}/run`

Schedule payloads contain `report_type`, `filters`, `frequency` (`Daily`, `Weekly`, or `Monthly`), `execution_time` (`HH:MM`), `recipients`, `format` (`CSV` or `PDF`), and `is_active`. The run endpoint records execution status and history; it is suitable for invocation by a deployment scheduler or worker.

FastAPI also publishes the interactive contract at `/docs` and `/openapi.json`.
