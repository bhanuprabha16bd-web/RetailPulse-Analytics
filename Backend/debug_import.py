import sys
import os
import traceback
from database import SessionLocal
import models
from routers.imports import validate_row

def main():
    try:
        db = SessionLocal()
        company = db.query(models.Company).first()
        if not company:
            print("No company found.")
            return

        row = {
            "Product Name": "Laptop",
            "SKU": "LPT-001",
            "Category": "Electronics",
            "Unit Price": "1500",
            "Stock Quantity": "10"
        }
        
        is_valid, err_type, err_msg, is_dup = validate_row(
            models.DataImportTypeEnum.products,
            row,
            db,
            company.id
        )
        print(f"Products Validation: valid={is_valid}, err_type={err_type}, msg={err_msg}, dup={is_dup}")
        
    except Exception as e:
        print("Error during validation:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
