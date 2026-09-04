import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, Field, constr
from backend.dependencies import verify_jwt
from backend.supabase_client import supabase

router = APIRouter()

class ProfileUpdate(BaseModel):
    name: Optional[constr(strip_whitespace=True, min_length=1, max_length=100)] = None
    bio: Optional[constr(strip_whitespace=True, max_length=500)] = None

ALLOWED_MIME_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
}
MAX_FILE_SIZE = 5 * 1024 * 1024

JPEG_MAGIC_PREFIX = b'\xff\xd8\xff'
PNG_MAGIC_PREFIX = b'\x89PNG\r\n\x1a\n'


def _detect_image_type(data: bytes) -> Optional[str]:
    if data.startswith(JPEG_MAGIC_PREFIX):
        return 'image/jpeg'
    if data.startswith(PNG_MAGIC_PREFIX):
        return 'image/png'
    return None


def _validate_image_file(upload_file: UploadFile, data: bytes) -> str:
    if upload_file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Type de fichier non supporté. Seuls JPEG et PNG sont autorisés.',
        )

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Le fichier dépasse la taille maximale de 5 Mo.',
        )

    real_type = _detect_image_type(data)
    if real_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Le fichier n\'est pas une image JPEG ou PNG valide.',
        )

    extension = Path(upload_file.filename).suffix.lower()
    if extension not in ALLOWED_MIME_TYPES[real_type]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='L\'extension du fichier ne correspond pas au type MIME réel.',
        )

    return real_type


@router.put('/')
async def update_profile(payload: ProfileUpdate, user_id: str = Depends(verify_jwt)):
    update_data = payload.dict(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Aucun champ à mettre à jour.',
        )

    result = (
        supabase.table('profiles')
        .update(update_data)
        .eq('id', user_id)
        .execute()
    )
    if result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de mettre à jour le profil.',
        )

    return {'status': 'success'}


@router.post('/photo')
async def upload_profile_photo(file: UploadFile, user_id: str = Depends(verify_jwt)):
    file_data = await file.read()
    real_type = _validate_image_file(file, file_data)

    ext = Path(file.filename).suffix.lower()
    if not ext:
        ext = '.jpg' if real_type == 'image/jpeg' else '.png'

    object_path = f'{user_id}/avatar{ext}'

    upload_result = (
        supabase.storage.from_('avatars')
        .upload(object_path, file_data, content_type=real_type)
    )

    if upload_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de téléverser l\'image de profil.',
        )

    return {'status': 'success', 'path': object_path}
