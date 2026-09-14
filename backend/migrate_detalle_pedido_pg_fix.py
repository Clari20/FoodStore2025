import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "food_store_dev")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5433")
POSTGRES_DB = os.getenv("POSTGRES_DB", "food_store_db")

DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
engine = create_engine(DATABASE_URL)

def migrate():
    print("Starting PG migration fix...")
    
    # 1. Drop the partially created (and empty) detalles_pedido table if it exists
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("DROP TABLE IF EXISTS detalles_pedido CASCADE"))
            print("Dropped partially created detalles_pedido")

    # 2. Load ALL models
    from app.main import app
    from sqlmodel import SQLModel
    
    print("Creating new tables via SQLModel...")
    SQLModel.metadata.create_all(engine)
    
    with engine.connect() as conn:
        with conn.begin():
            print("Copying data...")
            result = conn.execute(text("""
                INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, nombre_snapshot, precio_snapshot, subtotal_snap, personalizacion, created_at)
                SELECT pedido_id, producto_id, cantidad, nombre_snapshot, precio_snapshot, subtotal_snap, personalizacion, created_at 
                FROM detalles_pedido_old
            """))
            print(f"Copied {result.rowcount} rows.")
            
            print("Dropping old table...")
            conn.execute(text("DROP TABLE detalles_pedido_old"))
    
    print("Migration finished successfully!")

if __name__ == "__main__":
    migrate()
