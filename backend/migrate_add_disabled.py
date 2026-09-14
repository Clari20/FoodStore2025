"""
Migración: agregar columna 'disabled' a la tabla 'usuarios'.

Ejecutar una sola vez:
    python migrate_add_disabled.py
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
                WHERE table_name = 'usuarios' AND column_name = 'disabled'
            """)
        ).first()

        if result:
            print("✅ La columna 'disabled' ya existe. No se hizo nada.")
            return

        session.exec(
            text("ALTER TABLE usuarios ADD COLUMN disabled BOOLEAN NOT NULL DEFAULT FALSE")
        )
        session.commit()
        print("✅ Columna 'disabled' agregada a la tabla 'usuarios'.")


if __name__ == "__main__":
    migrate()
