from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from backend.dependencies import verify_jwt
from backend.models import AnswerItem, PublicSurveyAnswer, SurveyCreate
from backend.notifications import send_new_response_alert, send_thank_you
from backend.supabase_client import supabase

router = APIRouter()

async def check_quota(user_id: str) -> None:
    profile_result = (
        supabase.table('profiles')
        .select('survey_quota')
        .eq('id', user_id)
        .single()
        .execute()
    )
    if profile_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de vérifier le quota utilisateur.',
        )

    user_quota = profile_result.data.get('survey_quota') or 10
    survey_list = (
        supabase.table('surveys')
        .select('id')
        .eq('owner_id', user_id)
        .execute()
    )
    if survey_list.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de compter les sondages existants.',
        )

    if len(survey_list.data or []) >= user_quota:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Quota de sondages atteint, impossible de créer un nouveau sondage.',
        )

@router.get("/")
def list_surveys(user_id: str = Depends(verify_jwt)):
    raise HTTPException(status_code=501, detail="Liste des sondages non implémentée")

@router.post("/")
async def create_survey(payload: SurveyCreate, user_id: str = Depends(verify_jwt)):
    await check_quota(user_id)

    for question in payload.questions:
        if payload.survey_type == 'mixed':
            question_type = question.question_type
        else:
            question_type = payload.survey_type

        if question_type in ('single_choice', 'multiple_choice') and len(question.options) < 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Les questions à choix doivent proposer au moins deux options.',
            )
        if question_type == 'open_ended' and question.options:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Une question ouverte ne peut pas contenir d’options.',
            )

    survey_id = str(uuid4())
    survey_row = {
        'id': survey_id,
        'owner_id': user_id,
        'title': payload.title,
        'description': payload.description,
        'collecte_identite': payload.collecte_identite,
    }

    insert_response = supabase.table('surveys').insert(survey_row).execute()
    if insert_response.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de créer le sondage.',
        )

    question_rows = [
        {
            'survey_id': survey_id,
            'question_text': question.question_text,
            'question_type': question.question_type if payload.survey_type == 'mixed' else payload.survey_type,
            'options': question.options,
            'position': idx,
        }
        for idx, question in enumerate(payload.questions)
    ]
    questions_response = supabase.table('questions').insert(question_rows).execute()
    if questions_response.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de créer les questions du sondage.',
        )

    return {
        'id': survey_id,
        'public_url': f'/frontend/take_survey.html?id={survey_id}',
    }

@router.get('/public/{survey_id}')
def get_public_survey(survey_id: UUID):
    survey_result = (
        supabase.table('surveys')
        .select('title,description')
        .eq('id', str(survey_id))
        .single()
        .execute()
    )
    if survey_result.error or survey_result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sondage introuvable.',
        )

    questions_result = (
        supabase.table('questions')
        .select('id,question_text,question_type,options,position')
        .eq('survey_id', str(survey_id))
        .order('position', ascending=True)
        .execute()
    )
    if questions_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de charger les questions du sondage.',
        )

    return {
        'title': survey_result.data['title'],
        'description': survey_result.data.get('description', ''),
        'questions': questions_result.data or [],
    }

@router.post('/public/{survey_id}/responses')
def submit_public_response(survey_id: UUID, payload: PublicSurveyAnswer):
    survey_result = supabase.table('surveys').select('id,collecte_identite').eq('id', str(survey_id)).single().execute()
    if survey_result.error or survey_result.data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Sondage introuvable.')

    questions_result = supabase.table('questions').select('id,question_type,options').eq('survey_id', str(survey_id)).execute()
    if questions_result.error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Impossible de valider les réponses.')
    questions = {str(question['id']): question for question in questions_result.data or []}
    if any(str(answer.question_id) not in questions for answer in payload.answers):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Une réponse ne correspond pas à ce sondage.')

    for answer in payload.answers:
        question = questions[str(answer.question_id)]
        if not answer.answer_text:
            continue
        if question['question_type'] == 'single_choice' and answer.answer_text not in (question.get('options') or []):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Option de réponse invalide.')
        if question['question_type'] == 'multiple_choice' and answer.answer_text not in (question.get('options') or []):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Option de réponse invalide.')

    respondent = supabase.table('respondents').insert({
        'survey_id': str(survey_id),
        'metadata': {'name': payload.name, 'email': payload.email} if survey_result.data.get('collecte_identite') else {},
    }).execute()
    if respondent.error or not respondent.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Impossible d’enregistrer le répondant.')

    rows = [
        {'question_id': str(answer.question_id), 'respondent_id': respondent.data[0]['id'], 'answer_text': answer.answer_text}
        for answer in payload.answers if answer.answer_text
    ]
    if rows:
        answers_result = supabase.table('answers').insert(rows).execute()
        if answers_result.error:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Impossible d’enregistrer les réponses.')
    return {'message': 'Réponses enregistrées.'}

@router.get('/{survey_id}/results')
def get_survey_results(survey_id: UUID, user_id: str = Depends(verify_jwt)):
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
            detail='Accès refusé : seulement le propriétaire peut consulter les résultats.',
        )

    questions_result = (
        supabase.table('questions')
        .select('id,question_text')
        .eq('survey_id', str(survey_id))
        .order('position', ascending=True)
        .execute()
    )
    if questions_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de récupérer les questions.',
        )

    question_map = {item['id']: item['question_text'] for item in questions_result.data or []}
    question_ids = list(question_map.keys())

    answer_rows = []
    if question_ids:
        answers_result = (
            supabase.table('answers')
            .select('question_id,answer_text')
            .in_('question_id', question_ids)
            .execute()
        )
        if answers_result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Impossible de récupérer les réponses.',
            )
        answer_rows = answers_result.data or []

    aggregates = {}
    for answer in answer_rows:
        qid = answer['question_id']
        label = answer.get('answer_text') or 'Sans réponse'
        aggregates.setdefault(qid, {})
        aggregates[qid][label] = aggregates[qid].get(label, 0) + 1

    result_payload = []
    for qid, question_text in question_map.items():
        options = [
            {'label': label, 'count': count}
            for label, count in sorted(aggregates.get(qid, {}).items(), key=lambda item: item[1], reverse=True)
        ]
        result_payload.append({
            'question_id': qid,
            'question_texte': question_text,
            'options': options,
        })

    return result_payload


def compute_fingerprint(value: bytes) -> str:
    return sha256(value).hexdigest()


def _send_thank_you_email(email: str, survey_id: str) -> None:
    # Placeholder : brancher votre service d'email réel ici.
    print(f'Email de remerciement envoyé à {email} pour le sondage {survey_id}')


@router.post('/public/{survey_id}/answer')
async def submit_public_answer(
    survey_id: UUID,
    payload: PublicSurveyAnswer,
    request: Request,
    background_tasks: BackgroundTasks,
):
    survey_result = (
        supabase.table('surveys')
        .select('collecte_identite,owner_id,title')
        .eq('id', str(survey_id))
        .single()
        .execute()
    )
    if survey_result.error or survey_result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Sondage introuvable.',
        )

    collect_contact = survey_result.data.get('collecte_identite', False)
    if collect_contact:
        if not payload.name or not payload.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Nom et email sont requis pour ce sondage.',
            )
        fingerprint_source = payload.email.strip().lower().encode('utf-8')
    else:
        user_agent = request.headers.get('user-agent', '')
        client_ip = request.headers.get('x-forwarded-for') or (request.client.host if request.client else '')
        fingerprint_source = f'{client_ip}|{user_agent}|{survey_id}'.encode('utf-8')

    fingerprint = compute_fingerprint(fingerprint_source)

    existing_participation = (
        supabase.table('survey_participations')
        .select('id')
        .eq('survey_id', str(survey_id))
        .eq('fingerprint', fingerprint)
        .single()
        .execute()
    )
    if existing_participation.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Vous avez déjà répondu à ce sondage.',
        )

    respondent_row = {
        'survey_id': str(survey_id),
        'anonymous_key': fingerprint,
        'metadata': {'name': payload.name} if payload.name else {},
    }
    respondent_result = supabase.table('respondents').insert(respondent_row).execute()
    if respondent_result.error or not respondent_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de créer le répondant.',
        )

    respondent_id = respondent_result.data[0]['id'] if isinstance(respondent_result.data, list) else respondent_result.data['id']
    answer_rows = [
        {
            'question_id': str(answer.question_id),
            'respondent_id': respondent_id,
            'answer_text': answer.answer_text,
        }
        for answer in payload.answers
    ]

    participant_questions = [str(answer.question_id) for answer in payload.answers]
    questions_map = {}
    if participant_questions:
        questions_query = (
            supabase.table('questions')
            .select('id,question_text')
            .in_('id', participant_questions)
            .execute()
        )
        if questions_query.data:
            questions_map = {item['id']: item['question_text'] for item in questions_query.data}

    response_summary = '\n'.join(
        f"{questions_map.get(str(answer.question_id), str(answer.question_id))}: {answer.answer_text or '[pas de texte]'}"
        for answer in payload.answers
    )

    participation_result = (
        supabase.table('survey_participations')
        .insert({
            'survey_id': str(survey_id),
            'respondent_id': respondent_id,
            'fingerprint': fingerprint,
        })
        .execute()
    )
    if participation_result.error:
        if 'unique_survey_fingerprint' in str(participation_result.error):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='Vous avez déjà répondu à ce sondage.',
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible d\'enregistrer la participation.',
        )

    answers_result = supabase.table('answers').insert(answer_rows).execute()
    if answers_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible de sauvegarder les réponses.',
        )
    if participation_result.error:
        if 'unique_survey_fingerprint' in str(participation_result.error):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='Vous avez déjà répondu à ce sondage.',
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Impossible d\'enregistrer la participation.',
        )

    owner_result = (
        supabase.table('profiles')
        .select('email')
        .eq('id', survey_result.data['owner_id'])
        .single()
        .execute()
    )
    if owner_result.data and owner_result.data.get('email'):
        background_tasks.add_task(
            send_new_response_alert,
            owner_result.data['email'],
            survey_result.data['title'],
            response_summary,
        )

    if collect_contact and payload.email:
        background_tasks.add_task(
            send_thank_you,
            payload.email.strip().lower(),
            survey_result.data['title'],
        )

    return {'status': 'success'}
