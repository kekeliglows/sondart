const apiBase = window.SONDART_API_URL || '';
const surveyId = new URLSearchParams(window.location.search).get('id');
const loading = document.getElementById('survey-loading');
const content = document.getElementById('survey-content');
const title = document.getElementById('survey-title');
const description = document.getElementById('survey-description');
const form = document.getElementById('response-form');
const message = document.getElementById('survey-message');

const showMessage = (text, type = 'info') => {
  message.textContent = text;
  message.className = type;
};

const renderQuestion = (question, index) => {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'response-question';
  const legend = document.createElement('legend');
  legend.textContent = `${index + 1}. ${question.question_text}`;
  fieldset.appendChild(legend);
  const options = question.options || [];
  if (question.question_type === 'open_ended') {
    const input = document.createElement('textarea');
    input.name = `question-${question.id}`;
    input.maxLength = 2000;
    input.required = true;
    fieldset.appendChild(input);
  } else {
    options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'response-option';
      const input = document.createElement('input');
      input.type = question.question_type === 'multiple_choice' ? 'checkbox' : 'radio';
      input.name = `question-${question.id}`;
      input.value = option;
      input.required = question.question_type === 'single_choice';
      label.append(input, document.createTextNode(option));
      fieldset.appendChild(label);
    });
  }
  return fieldset;
};

const loadSurvey = async () => {
  if (!surveyId) throw new Error('Identifiant de sondage manquant.');
  const response = await fetch(`${apiBase}/surveys/public/${surveyId}`);
  const survey = await response.json();
  if (!response.ok) throw new Error(survey.detail || 'Sondage introuvable.');
  title.textContent = survey.title;
  description.textContent = survey.description || '';
  survey.questions.forEach((question, index) => form.appendChild(renderQuestion(question, index)));
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Envoyer mes réponses';
  form.appendChild(submit);
  content.hidden = false;
  loading.hidden = true;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const answers = [];
  form.querySelectorAll('fieldset').forEach((fieldset) => {
    const inputs = [...fieldset.querySelectorAll('input:checked, textarea')];
    const questionId = inputs[0]?.name.replace('question-', '');
    inputs.forEach((input) => answers.push({ question_id: questionId, answer_text: input.value.trim() }));
  });
  if (!answers.length) {
    showMessage('Répondez à au moins une question.', 'error');
    return;
  }
  try {
    const response = await fetch(`${apiBase}/surveys/public/${surveyId}/responses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Impossible d’envoyer les réponses.');
    form.replaceChildren();
    showMessage(result.message, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

loadSurvey().catch((error) => { loading.hidden = true; showMessage(error.message, 'error'); });
