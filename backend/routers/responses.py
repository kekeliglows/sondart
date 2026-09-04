from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies import verify_jwt

router = APIRouter()

@router.get("/")
def list_responses(user_id: str = Depends(verify_jwt)):
    raise HTTPException(status_code=501, detail="Liste de réponses non implémentée")

@router.post("/")
def submit_response(user_id: str = Depends(verify_jwt)):
    raise HTTPException(status_code=501, detail="Envoi de réponse non implémenté")
