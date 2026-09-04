from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/login")
def login():
    raise HTTPException(status_code=501, detail="Login non implémenté")

@router.post("/register")
def register():
    raise HTTPException(status_code=501, detail="Inscription non implémentée")
