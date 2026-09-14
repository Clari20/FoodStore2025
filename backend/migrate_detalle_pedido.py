import os
import sqlite3
from sqlmodel import SQLModel, create_engine
from app.modules.pedidos.model import Pedido, DetallePedido, EstadoPedido, FormaPago, HistorialEstadoPedido

DATABASE_URL = "sqlite:///./food_store.db"
engine = create_engine(DATABASE_URL)

def migrate():
    print("Starting migration...")
    # Connect with standard sqlite3 to do the rename
    conn = sqlite3.connect("./food_store.db")
    cursor = conn.cursor()
    
    # Check if we need to migrate
    cursor.execute("PRAGMA table_info(detalles_pedido);")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "id" in columns:
        print("Migration already applied (id column exists).")
        return
        
    print("Renaming table to _old...")
    cursor.execute("ALTER TABLE detalles_pedido RENAME TO detalles_pedido_old;")
    conn.commit()
    conn.close()
    
    print("Creating new tables via SQLModel...")
    SQLModel.metadata.create_all(engine)
    
    print("Copying data...")
    conn = sqlite3.connect("./food_store.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, nombre_snapshot, precio_snapshot, subtotal_snap, personalizacion, created_at)
        SELECT pedido_id, producto_id, cantidad, nombre_snapshot, precio_snapshot, subtotal_snap, personalizacion, created_at 
        FROM detalles_pedido_old;
    """)
    print(f"Copied {cursor.rowcount} rows.")
    
    print("Dropping old table...")
    cursor.execute("DROP TABLE detalles_pedido_old;")
    conn.commit()
    conn.close()
    
    print("Migration finished successfully!")

if __name__ == "__main__":
    migrate()
