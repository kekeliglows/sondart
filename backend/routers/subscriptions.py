from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies import verify_jwt

router = APIRouter()

@router.get("/")
def get_subscription(user_id: str = Depends(verify_jwt)):
    raise HTTPException(status_code=501, detail="Récupération d'abonnement non implémentée")

@router.post("/")
def create_subscription(user_id: str = Depends(verify_jwt)):
    raise HTTPException(status_code=501, detail="Création d'abonnement non implémentée")
