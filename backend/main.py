from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, profile, responses, services, subscriptions, surveys, survey_reset

app = FastAPI(title="SondArt Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(surveys.router, prefix="/surveys", tags=["surveys"])
app.include_router(responses.router, prefix="/responses", tags=["responses"])
app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(survey_reset.router, prefix="/surveys", tags=["surveys"])

@app.get("/")
def read_root():
    return {"message": "SondArt backend fonctionne"}
