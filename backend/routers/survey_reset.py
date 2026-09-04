from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from backend.dependencies import verify_jwt
from backend.supabase_client import supabase

router = APIRouter()

@router.post('/{survey_id}/reset')
async def reset_survey(survey_id: UUID, user_id: str = Depends(verify_jwt)):
    survey_result = (
        supabase.table('surveys')
        .select('owner_id')
        .eq('id', str(survey_id))
        .single()
        .execute()
    )
    if survey_result.error or survey_result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sondage introuvable.',
        )

    if survey_result.data['owner_id'] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Accès refusé : seulement le propriétaire peut réinitialiser ce sondage.',
        )

    questions_result = (
        supabase.table('questions')
        .select('id,question_text')
        .eq('survey_id', str(survey_id))
        .execute()
    )
    if questions_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de charger les questions du sondage.',
        )

    question_texts = {item['id']: item['question_text'] for item in questions_result.data or []}
    question_ids = list(question_texts.keys())

    answers_result = (
        supabase.table('answers')
        .select('id,question_id,respondent_id,answer_text,answer_value,created_at')
        .in_('question_id', question_ids)
        .execute()
    )
    if answers_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de lire les réponses existantes.',
        )

    archive_rows = [
        {
            'survey_id': str(survey_id),
            'question_id': answer['question_id'],
            'question_text': question_texts.get(answer['question_id'], ''),
            'respondent_id': answer['respondent_id'],
            'answer_text': answer.get('answer_text'),
            'answer_value': answer.get('answer_value'),
            'created_at': answer.get('created_at'),
            'archived_by': user_id,
        }
        for answer in answers_result.data or []
    ]

    if archive_rows:
        archive_result = supabase.table('survey_archives').insert(archive_rows).execute()
        if archive_result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Impossible d\'archiver les réponses.',
            )

    delete_answers = (
        supabase.table('answers')
        .delete()
        .in_('question_id', question_ids)
        .execute()
    )
    if delete_answers.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de supprimer les réponses actives.',
        )

    delete_participations = (
        supabase.table('survey_participations')
        .delete()
        .eq('survey_id', str(survey_id))
        .execute()
    )
    if delete_participations.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de supprimer les participations.',
        )

    log_result = (
        supabase.table('audit_log')
        .insert({
            'user_id': user_id,
            'survey_id': str(survey_id),
            'action': 'reset_survey',
            'detail': 'Réinitialisation des réponses et participations pour ce sondage.',
        })
        .execute()
    )
    if log_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de journaliser l\'action.',
        )

    return {'status': 'success'}
