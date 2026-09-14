from sqlmodel import Session, text
from app.core.database import engine

def migrate():
    with Session(engine) as session:
        try:
            session.exec(text("DROP TABLE IF EXISTS direcciones_entrega CASCADE"))
            session.commit()
            print("Tabla direcciones_entrega eliminada con éxito. Reinicia el backend para que la vuelva a crear con el esquema nuevo.")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    migrate()
