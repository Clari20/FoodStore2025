"""
Sube las imágenes locales de backend/uploads/seed/ a Cloudinary y actualiza
cada producto en la base de datos para que apunte a la URL de Cloudinary
en vez de a la ruta local (/static/uploads/seed/...).

Requiere que backend/.env tenga configuradas las variables de POSTGRES_*
(apuntando a tu base real) y las de CLOUDINARY_* (de tu cuenta de Cloudinary).

Uso (parado en la carpeta backend/):
    python -m scripts.subir_imagenes_cloudinary
"""

import cloudinary
import cloudinary.uploader
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine
from app.core.media import SEEDED_UPLOAD_DIR
from app.modules.productos.model import Producto


def main() -> None:
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        print("Faltan las variables CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en tu .env")
        return

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )

    if not SEEDED_UPLOAD_DIR.exists():
        print(f"No encontré la carpeta {SEEDED_UPLOAD_DIR}")
        return

    # 1. Subir cada imagen local a Cloudinary una sola vez, guardando
    #    filename -> url_de_cloudinary en un diccionario.
    subidas: dict[str, str] = {}
    archivos = sorted(SEEDED_UPLOAD_DIR.iterdir())
    print(f"Subiendo {len(archivos)} imágenes a Cloudinary...")

    for archivo in archivos:
        if not archivo.is_file():
            continue
        try:
            resultado = cloudinary.uploader.upload(
                str(archivo),
                folder="food-store/seed",
                public_id=archivo.stem,
                overwrite=True,
            )
            subidas[archivo.name] = resultado["secure_url"]
            print(f"  OK: {archivo.name}")
        except Exception as e:
            print(f"  ERROR subiendo {archivo.name}: {e}")

    print(f"\n{len(subidas)} imágenes subidas. Actualizando productos en la base...")

    # 2. Recorrer los productos y, si su imagen local coincide con alguna
    #    subida, reemplazar imagen_url e imagenes por la URL de Cloudinary.
    actualizados = 0
    with Session(engine) as session:
        productos = session.exec(select(Producto)).all()
        for producto in productos:
            if not producto.imagen_url:
                continue
            nombre_archivo = producto.imagen_url.rsplit("/", 1)[-1]
            nueva_url = subidas.get(nombre_archivo)
            if nueva_url:
                producto.imagen_url = nueva_url
                producto.imagenes = [nueva_url]
                session.add(producto)
                actualizados += 1

        session.commit()

    print(f"Listo. {actualizados} productos actualizados con imágenes de Cloudinary.")


if __name__ == "__main__":
    main()
