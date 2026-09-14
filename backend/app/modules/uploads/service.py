import logging
from typing import Dict, Any

import cloudinary
import cloudinary.uploader

from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("app.modules.uploads.service")


class UploadService:
    def __init__(self):
        # Configuramos Cloudinary usando las variables de entorno
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
        else:
            logger.warning("Cloudinary no está configurado. Las subidas fallarán si no hay credenciales.")

    def subir_imagen(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Sube una imagen a Cloudinary y retorna un diccionario con secure_url y public_id.
        """
        if not settings.CLOUDINARY_CLOUD_NAME:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Cloudinary no está configurado en el servidor."
            )

        try:
            # Subir el archivo a Cloudinary
            response = cloudinary.uploader.upload(
                file_content,
                folder="foodstore",  # Carpeta dentro de tu Cloudinary
                use_filename=True,
                unique_filename=True
            )
            
            return {
                "secure_url": response.get("secure_url"),
                "public_id": response.get("public_id")
            }
        except Exception as e:
            logger.exception("Error subiendo imagen a Cloudinary")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al subir imagen a Cloudinary: {str(e)}"
            )

    def eliminar_imagen(self, public_id: str) -> Dict[str, Any]:
        """
        Elimina una imagen de Cloudinary usando su public_id.
        """
        if not settings.CLOUDINARY_CLOUD_NAME:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Cloudinary no está configurado en el servidor."
            )

        try:
            response = cloudinary.uploader.destroy(public_id)
            return response
        except Exception as e:
            logger.exception("Error eliminando imagen de Cloudinary")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar imagen de Cloudinary: {str(e)}"
            )
