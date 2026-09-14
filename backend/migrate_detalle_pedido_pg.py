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
    print("Starting PG migration...")
    with engine.connect() as conn:
        with conn.begin():
            # Check if id column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='detalles_pedido' AND column_name='id'"))
            if result.fetchone() is not None:
                print("Migration already applied (id column exists).")
                return

            print("Renaming table to _old...")
            conn.execute(text("ALTER TABLE detalles_pedido RENAME TO detalles_pedido_old"))

    from app.modules.pedidos.model import Pedido, DetallePedido, EstadoPedido, FormaPago, HistorialEstadoPedido
    from app.modules.productos.model import Producto, Categoria, Ingrediente
    from app.modules.auth.model import Usuario
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
