import sqlite3
import os

db_path = 'retailpulse.db'
if not os.path.exists(db_path):
    print("Database not found.")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    c.execute("ALTER TABLE sales ADD COLUMN payment_status VARCHAR DEFAULT 'Paid'")
    print("Added payment_status column")
except sqlite3.OperationalError as e:
    print(f"Error adding payment_status: {e}")

try:
    c.execute("ALTER TABLE sales ADD COLUMN notes VARCHAR")
    print("Added notes column")
except sqlite3.OperationalError as e:
    print(f"Error adding notes: {e}")

conn.commit()
conn.close()
print("Migration completed.")
