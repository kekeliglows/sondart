from fastapi import APIRouter, Depends, HTTPException, status
from uuid import uuid4
from backend.dependencies import verify_jwt
from backend.models import SurveyCreate
from backend.supabase_client import supabase

router = APIRouter()

async def check_quota(user_id: str) -> None:
    quota_record = (
        supabase.table('profiles')
        .select('survey_quota')
        .eq('id', user_id)
        .single()
        .execute()
    )
    if quota_record.error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Impossible de vérifier le quota utilisateur.')

    user_quota = quota_record.data.get('survey_quota', 0)
    active_surveys = (
        supabase.table('surveys')
        .select('id', fetch='exact')
        .eq('owner_id', user_id)
        .execute()
    )
    if active_surveys.error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Impossible de compter les sondages existants.')

    survey_count = len(active_surveys.data or [])
    if survey_count >= user_quota:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Quota de sondages atteint, impossible de créer un nouveau sondage.',
        )

@router.post('/')
async def create_survey(payload: SurveyCreate, user_id: str = Depends(verify_jwt)):
    await check_quota(user_id)

    survey_id = str(uuid4())
    questions = [
        {'question_text': q.question_text}
        for q in payload.questions
    ]

    survey_row = {
        'id': survey_id,
        'owner_id': user_id,
        'title': payload.title,
        'description': payload.description,
        'survey_type': payload.survey_type,
        'collect_contact': payload.collect_contact,
        'questions': questions,
    }

    insert_response = supabase.table('surveys').insert(survey_row).execute()
    if insert_response.error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Impossible de créer le sondage.')

    return {'id': survey_id}
