import os
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt

SUPABASE_JWT_PUBLIC_KEY = os.getenv('SUPABASE_JWT_PUBLIC_KEY', '')

if not SUPABASE_JWT_PUBLIC_KEY:
    raise RuntimeError('SUPABASE_JWT_PUBLIC_KEY must be set in the environment')

ALGORITHM = 'RS256'

async def verify_jwt(request: Request) -> str:
    authorization: str | None = request.headers.get('Authorization')
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token manquant ou invalide',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    token = authorization.removeprefix('Bearer ').strip()
    try:
        payload = jwt.decode(token, SUPABASE_JWT_PUBLIC_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token invalide',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    user_id = payload.get('sub') or payload.get('user_id')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Utilisateur non authentifié',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    return user_id
