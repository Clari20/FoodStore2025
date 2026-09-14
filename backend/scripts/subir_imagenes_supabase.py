"""
Sube las imágenes locales de backend/uploads/seed/ a Supabase Storage y
actualiza cada producto en la base de datos para que apunte a esa URL
pública, en vez de a la ruta local (/static/uploads/seed/...).

Antes de correrlo:
  1. En Supabase, andá a Storage y creá un bucket público llamado "productos".
  2. En Project Settings -> API, copiá la "Project URL" y la clave
     "service_role" (NO la "anon", esa no alcanza para subir archivos).
  3. Agregá en backend/.env:
       SUPABASE_URL=https://tu-project-ref.supabase.co
       SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

Uso (parado en la carpeta backend/, con el resto del .env ya apuntando
a tu base de Supabase real):
    python -m scripts.subir_imagenes_supabase
"""

import os

import httpx
from dotenv import load_dotenv
from sqlmodel import Session, select

from app.core.database import engine
from app.core.media import SEEDED_UPLOAD_DIR
from app.modules.productos.model import Producto

load_dotenv()

BUCKET = "productos"

CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
}


def main() -> None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        print("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en tu .env")
        return

    supabase_url = supabase_url.rstrip("/")

    if not SEEDED_UPLOAD_DIR.exists():
        print(f"No encontré la carpeta {SEEDED_UPLOAD_DIR}")
        return

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "x-upsert": "true",
    }

    subidas: dict[str, str] = {}
    archivos = sorted(p for p in SEEDED_UPLOAD_DIR.iterdir() if p.is_file())
    print(f"Subiendo {len(archivos)} imágenes a Supabase Storage...")

    with httpx.Client(timeout=30.0) as client:
        for archivo in archivos:
            content_type = CONTENT_TYPES.get(archivo.suffix.lower(), "application/octet-stream")
            path = f"seed/{archivo.name}"
            url = f"{supabase_url}/storage/v1/object/{BUCKET}/{path}"

            try:
                resp = client.post(
                    url,
                    headers={**headers, "Content-Type": content_type},
                    content=archivo.read_bytes(),
                )
                if resp.status_code in (200, 201):
                    public_url = f"{supabase_url}/storage/v1/object/public/{BUCKET}/{path}"
                    subidas[archivo.name] = public_url
                    print(f"  OK: {archivo.name}")
                else:
                    print(f"  ERROR subiendo {archivo.name}: {resp.status_code} {resp.text}")
            except Exception as e:
                print(f"  ERROR subiendo {archivo.name}: {e}")

    print(f"\n{len(subidas)} imágenes subidas. Actualizando productos en la base...")

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

    print(f"Listo. {actualizados} productos actualizados con imágenes de Supabase Storage.")


if __name__ == "__main__":
    main()
