"""
Migración: agregar columna 'imagen_url' a la tabla 'categorias'.

Ejecutar una sola vez:
    python migrate_categoria_imagen.py
"""
from sqlmodel import Session, text
from app.core.database import engine


def migrate():
    with Session(engine) as session:
        # Verificar si la columna ya existe
        result = session.exec(
            text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'categorias' AND column_name = 'imagen_url'
            """)
        ).first()

        if result:
            print("La columna 'imagen_url' ya existe en 'categorias'. No se hizo nada.")
            return

        session.exec(
            text("ALTER TABLE categorias ADD COLUMN imagen_url TEXT NULL")
        )
        session.commit()
        print("Columna 'imagen_url' agregada a la tabla 'categorias'.")


if __name__ == "__main__":
    migrate()
