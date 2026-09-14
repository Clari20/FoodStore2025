"""Router para subida y gestión de archivos (imágenes) en Cloudinary."""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Dict, Any

from app.core.deps import require_role
from app.modules.uploads.service import UploadService

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])

def get_upload_service() -> UploadService:
    return UploadService()

class UploadResponse(BaseModel):
    secure_url: str
    public_id: str

@router.post(
    "/imagen",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))],
)
async def upload_imagen(
    file: UploadFile = File(...),
    svc: UploadService = Depends(get_upload_service)
):
    """Sube una imagen a Cloudinary y retorna su secure_url y public_id."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    
    content = await file.read()
    resultado = svc.subir_imagen(content, file.filename)
    
    return UploadResponse(
        secure_url=resultado["secure_url"],
        public_id=resultado["public_id"]
    )

@router.delete(
    "/destroy/{public_id:path}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))],
)
async def destroy_imagen(
    public_id: str,
    svc: UploadService = Depends(get_upload_service)
):
    """Elimina una imagen de Cloudinary."""
    # El path param nos permite recibir IDs que contengan slashes como "foodstore/abc1234"
    return svc.eliminar_imagen(public_id)
