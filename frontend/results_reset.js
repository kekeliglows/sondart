import { getAccessToken } from './auth.js';

export async function confirmAndResetSurvey(surveyId) {
  const confirmed = window.confirm('Cette action est irréversible. Voulez-vous vraiment réinitialiser ce sondage ?');
  if (!confirmed) {
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Vous devez être connecté pour réinitialiser un sondage.');
  }

  const response = await fetch(`/surveys/${surveyId}/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.detail || 'Impossible de réinitialiser le sondage.');
  }

  return result;
}
