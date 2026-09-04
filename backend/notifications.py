import json
import os
import urllib.request
import urllib.error
from typing import Optional

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
SENDGRID_FROM_EMAIL = os.getenv('SENDGRID_FROM_EMAIL', 'no-reply@sondart.app')
SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'


def _ensure_sendgrid_config() -> None:
    if not SENDGRID_API_KEY:
        raise RuntimeError('SENDGRID_API_KEY must be set in the environment to send emails.')


def _send_email(to_email: str, subject: str, content_text: str, content_html: Optional[str] = None) -> None:
    _ensure_sendgrid_config()
    payload = {
        'personalizations': [
            {
                'to': [{'email': to_email}],
                'subject': subject,
            }
        ],
        'from': {'email': SENDGRID_FROM_EMAIL, 'name': 'SondArt'},
        'content': [
            {'type': 'text/plain', 'value': content_text},
        ],
    }
    if content_html:
        payload['content'].append({'type': 'text/html', 'value': content_html})

    request = urllib.request.Request(
        SENDGRID_API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {SENDGRID_API_KEY}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(request) as response:
            if response.status not in (200, 202):
                raise RuntimeError(f'SendGrid returned HTTP {response.status}')
    except urllib.error.HTTPError as err:
        message = err.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'SendGrid error {err.code}: {message}')
    except urllib.error.URLError as err:
        raise RuntimeError(f'SendGrid connection failed: {err.reason}')


def send_thank_you(email: str, survey_title: str) -> None:
    subject = f"Merci pour votre réponse à '{survey_title}'"
    content_text = (
        f"Merci d'avoir répondu au sondage '{survey_title}'.\n\n"
        'Nous avons bien reçu votre contribution et nous apprécions votre participation.'
    )
    _send_email(email, subject, content_text)


def send_new_response_alert(owner_email: str, survey_title: str, response_summary: str) -> None:
    subject = f"Nouvelle réponse reçue pour '{survey_title}'"
    content_text = (
        f"Une nouvelle réponse a été enregistrée pour votre sondage '{survey_title}'.\n\n"
        'Résumé de la réponse :\n'
        f'{response_summary}\n\n'
        'Consultez votre tableau de bord pour plus de détails.'
    )
    _send_email(owner_email, subject, content_text)
