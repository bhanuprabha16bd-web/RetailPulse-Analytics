import sqlite3

def recreate_audit_logs():
    print("Connecting to database...")
    conn = sqlite3.connect('retailpulse.db')
    cursor = conn.cursor()
    
    print("Dropping audit_logs table...")
    cursor.execute("DROP TABLE IF EXISTS audit_logs")
    
    conn.commit()
    conn.close()
    
    print("Table dropped successfully.")
    
    print("Running SQLAlchemy create_all...")
    from database import engine
    from models import Base
    Base.metadata.create_all(bind=engine)
    print("Table recreated successfully.")

if __name__ == "__main__":
    recreate_audit_logs()
