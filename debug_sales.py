import sys
import os

# Add Backend dir to path
sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from database import SessionLocal
import models
import traceback

try:
    db = SessionLocal()
    sales = db.query(models.Sale).all()
    print(f"Successfully loaded {len(sales)} sales.")
except Exception as e:
    print("Error loading sales:")
    traceback.print_exc()
finally:
    db.close()
