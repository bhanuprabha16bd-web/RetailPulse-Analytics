import sys
import os
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
import models

client = TestClient(app)

def test_validation():
    db = SessionLocal()
    user = db.query(models.User).filter_by(role=models.RoleEnum.company_admin).first()
    if not user:
        print("No admin user found")
        return
        
    print(f"Testing with user: {user.email}")
    
    # We need a token for the user to hit the endpoints
    from auth import create_access_token
    token = create_access_token(data={"user_id": user.id, "company_id": user.company_id})
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Upload a dummy CSV
    csv_content = b"Product Name,SKU,Category,Unit Price,Stock Quantity\nTest,TEST-1,Cat,10,5\n"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    data = {"import_type": "Products"}
    
    print("Uploading file...")
    response = client.post("/api/import/upload", files=files, data=data, headers=headers)
    print(response.status_code, response.text)
    
    if response.status_code != 200:
        return
        
    preview = response.json()
    import_id = preview.get("importId")
    print(f"Got import_id: {import_id}")
    
    # 2. Validate
    print("Validating file...")
    validate_res = client.post(f"/api/import/{import_id}/validate", headers=headers)
    print(validate_res.status_code, validate_res.text)

if __name__ == "__main__":
    test_validation()
