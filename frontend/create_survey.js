import { getAccessToken } from './auth.js';

const form = document.getElementById('survey-form');
const questionsContainer = document.getElementById('questions-container');
const addQuestionButton = document.getElementById('add-question');
const messageElement = document.getElementById('form-message');

const createQuestionField = (index = 1) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'question-item';
  wrapper.innerHTML = `
    <label>
      Question ${index}
      <input type="text" name="question_text" maxlength="1000" required />
    </label>
    <button type="button" class="remove-question">Supprimer</button>
  `;

  wrapper.querySelector('.remove-question').addEventListener('click', () => {
    wrapper.remove();
    refreshQuestionLabels();
  });

  return wrapper;
};

const refreshQuestionLabels = () => {
  const items = questionsContainer.querySelectorAll('.question-item');
  items.forEach((item, index) => {
    const label = item.querySelector('label');
    if (label) {
      label.firstChild.textContent = `Question ${index + 1}`;
    }
  });
};

const addQuestion = () => {
  const questionCount = questionsContainer.querySelectorAll('.question-item').length;
  const nextQuestion = createQuestionField(questionCount + 1);
  questionsContainer.appendChild(nextQuestion);
};

addQuestionButton.addEventListener('click', addQuestion);
addQuestion();

const showMessage = (text, type = 'info') => {
  messageElement.textContent = text;
  messageElement.style.color = type === 'error' ? 'red' : '#1d7a0f';
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  messageElement.textContent = '';

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const survey_type = document.getElementById('survey_type').value;
  const collect_contact = document.getElementById('collect_contact').checked;
  const questionInputs = Array.from(questionsContainer.querySelectorAll('input[name="question_text"]'));
  const questions = questionInputs.map((input) => input.value.trim()).filter(Boolean);

  if (!title || title.length > 200) {
    showMessage('Le titre est requis et doit faire au maximum 200 caractères.', 'error');
    return;
  }

  if (description.length > 1000) {
    showMessage('La description ne doit pas dépasser 1000 caractères.', 'error');
    return;
  }

  if (questions.length === 0) {
    showMessage('Ajoutez au moins une question.', 'error');
    return;
  }

  if (questions.length > 50) {
    showMessage('Le nombre maximum de questions est 50.', 'error');
    return;
  }

  const payload = { title, description, survey_type, collect_contact, questions };

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Vous devez être connecté pour créer un sondage.');
    }

    const response = await fetch('/surveys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || 'Erreur lors de la création du sondage.');
    }

    showMessage('Sondage créé avec succès ! ID : ' + result.id);
    form.reset();
    questionsContainer.innerHTML = '<h2>Questions</h2>';
    addQuestion();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});
