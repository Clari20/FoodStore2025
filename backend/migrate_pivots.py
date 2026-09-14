import sys
from sqlmodel import Session, text
from app.core.database import engine
from app.core.db import create_all_tables
from app.db.seed import run

def migrate():
    with Session(engine) as session:
        print("Borrando tablas pivot viejas...")
        session.exec(text("DROP TABLE IF EXISTS producto_categorias CASCADE"))
        session.exec(text("DROP TABLE IF EXISTS producto_ingredientes CASCADE"))
        session.exec(text("DROP TABLE IF EXISTS unidades_medida CASCADE"))
        session.commit()
    print("Tablas borradas. Creando nuevas...")
    run()

if __name__ == "__main__":
    migrate()
