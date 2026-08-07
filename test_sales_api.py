import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'Backend'))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from dependencies import get_current_user, get_current_company_user

client = TestClient(app)

# Mock auth
def override_get_current_user():
    db = SessionLocal()
    user = db.query(models.User).first()
    db.close()
    return user

app.dependency_overrides[get_current_company_user] = override_get_current_user
app.dependency_overrides[get_current_user] = override_get_current_user

try:
    response = client.get("/api/sales/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    import traceback
    traceback.print_exc()
