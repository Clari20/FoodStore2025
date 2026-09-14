from app.core.database import engine
from sqlalchemy import text

def run_migration():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE productos ADD COLUMN imagenes JSONB DEFAULT '[]'::jsonb;"))
            print("Column 'imagenes' added successfully.")
        except Exception as e:
            print(f"Error or column already exists: {e}")

if __name__ == "__main__":
    run_migration()
