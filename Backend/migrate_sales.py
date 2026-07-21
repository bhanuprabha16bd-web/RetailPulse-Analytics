import sqlite3
from models import Base
from database import engine

conn = sqlite3.connect('retailpulse.db')
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS sale_transactions")
conn.commit()
conn.close()

Base.metadata.create_all(bind=engine)
print("Recreated sale_transactions table successfully")
