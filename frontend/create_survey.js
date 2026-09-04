import { getAccessToken } from './auth.js';

const form = document.getElementById('survey-form');
const questionsContainer = document.getElementById('questions-container');
const addQuestionButton = document.getElementById('add-question');
const messageElement = document.getElementById('form-message');
const surveyTypeInput = document.getElementById('survey_type');
const surveyTypeHelp = document.getElementById('survey-type-help');

const typeLabels = {
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiple',
  open_ended: 'Question ouverte',
};

const showMessage = (text, type = 'info') => {
  messageElement.textContent = text;
  messageElement.className = type === 'error' ? 'error' : 'success';
};

const createQuestionField = (index) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'question-item';
  wrapper.innerHTML = `
    <div class="question-main">
      <label><span class="question-label">Question ${index}</span><input type="text" name="question_text" maxlength="1000" required /></label>
      <label class="question-type-field">Type de question
        <select name="question_type">
          <option value="single_choice">Choix unique</option>
          <option value="multiple_choice">Choix multiple</option>
          <option value="open_ended">Question ouverte</option>
        </select>
      </label>
      <div class="options-field">
        <label>Options de réponse
          <input type="text" name="options" maxlength="1000" placeholder="Une option par ligne ou séparée par des virgules" />
        </label>
        <small>Ajoutez au moins deux options.</small>
      </div>
    </div>
    <button type="button" class="remove-question">Supprimer</button>`;

  const typeSelect = wrapper.querySelector('[name="question_type"]');
  const optionsField = wrapper.querySelector('.options-field');
  const syncType = () => { optionsField.hidden = typeSelect.value === 'open_ended'; };
  typeSelect.addEventListener('change', syncType);
  wrapper.querySelector('.remove-question').addEventListener('click', () => {
    if (questionsContainer.querySelectorAll('.question-item').length === 1) {
      showMessage('Un sondage doit contenir au moins une question.', 'error');
      return;
    }
    wrapper.remove();
    questionsContainer.querySelectorAll('.question-item').forEach((item, itemIndex) => {
      item.querySelector('.question-label').textContent = `Question ${itemIndex + 1}`;
    });
  });
  syncType();
  return wrapper;
};

const updateSurveyType = () => {
  const mixed = surveyTypeInput.value === 'mixed';
  surveyTypeHelp.textContent = mixed
    ? 'Choisissez le type de chaque question pour composer un sondage varié.'
    : `Toutes les questions seront de type « ${typeLabels[surveyTypeInput.value]} ».`;
  questionsContainer.querySelectorAll('.question-item').forEach((item) => {
    const typeSelect = item.querySelector('[name="question_type"]');
    typeSelect.disabled = !mixed;
    if (!mixed) {
      typeSelect.value = surveyTypeInput.value;
      item.querySelector('.options-field').hidden = surveyTypeInput.value === 'open_ended';
    }
  });
};

surveyTypeInput.addEventListener('change', updateSurveyType);
addQuestionButton.addEventListener('click', () => {
  questionsContainer.appendChild(createQuestionField(questionsContainer.querySelectorAll('.question-item').length + 1));
  updateSurveyType();
});
questionsContainer.appendChild(createQuestionField(1));
updateSurveyType();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const questions = Array.from(questionsContainer.querySelectorAll('.question-item')).map((item) => {
    const questionType = item.querySelector('[name="question_type"]').value;
    const options = item.querySelector('[name="options"]').value.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
    return { question_text: item.querySelector('[name="question_text"]').value.trim(), question_type: questionType, options };
  });
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  if (!title || description.length > 1000 || questions.some((question) => !question.question_text)) {
    showMessage('Complétez le titre, la description et toutes les questions.', 'error');
    return;
  }
  if (questions.some((question) => ['single_choice', 'multiple_choice'].includes(question.question_type) && question.options.length < 2)) {
    showMessage('Chaque question à choix doit contenir au moins deux options.', 'error');
    return;
  }
  if (questions.some((question) => question.question_type === 'open_ended' && question.options.length > 0)) {
    showMessage('Supprimez les options des questions ouvertes.', 'error');
    return;
  }
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Vous devez être connecté pour créer un sondage.');
    const response = await fetch('/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ title, description, survey_type: surveyTypeInput.value, collecte_identite: document.getElementById('collect_contact').checked, questions }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Erreur lors de la création du sondage.');
    showMessage(`Sondage créé avec succès. Identifiant : ${result.id}`);
    form.reset();
    questionsContainer.innerHTML = '<h2>Questions</h2>';
    questionsContainer.appendChild(createQuestionField(1));
    updateSurveyType();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});
