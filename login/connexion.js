import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jyvhxjnefapsksogolgp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nrBkbo2JdvmO1WX2yRPAdg_SboZVlmT';
const TIMEOUT_MS = 15000;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let isSubmitting = false;

function getElement(id) {
  return document.getElementById(id);
}

function setStatus(element, message, type = 'error') {
  if (!element) return;
  element.textContent = message;
  element.className = `form-status ${type}`;
  element.classList.remove('visually-hidden');
}

function clearStatus(element) {
  if (!element) return;
  element.textContent = '';
  element.className = 'form-status visually-hidden';
}

function showFieldError(input, message) {
  const errorElement = getElement(`${input.id}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('active');
  }
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function clearFieldError(input) {
  const errorElement = getElement(`${input.id}-error`);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('active');
  }
  input.removeAttribute('aria-invalid');
}

function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'L’adresse email est requise.';
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return valid ? '' : 'Format de l’email invalide.';
}

function validatePassword(value) {
  if (!value) return 'Le mot de passe est requis.';
  if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  return '';
}

function validateName(value) {
  const name = value.trim();
  if (!name) return 'Le nom est requis.';
  if (name.length < 2) return 'Le nom doit contenir au moins 2 caractères.';
  return '';
}

function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return 'La confirmation du mot de passe est requise.';
  if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas.';
  return '';
}

function evaluatePasswordStrength(password) {
  if (password.length >= 14 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    return { text: 'Mot de passe très solide', strength: 'strong' };
  }
  if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    return { text: 'Mot de passe solide', strength: 'medium' };
  }
  if (password.length >= 8) {
    return { text: 'Mot de passe correct', strength: 'weak' };
  }
  return { text: 'Mot de passe trop court', strength: 'weak' };
}

function withTimeout(promise, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function safeAuthRequest(promise) {
  if (!navigator.onLine) {
    throw new Error('offline');
  }

  try {
    return await withTimeout(promise);
  } catch (error) {
    if (error.message === 'timeout') {
      throw new Error('timeout');
    }
    throw error;
  }
}

function togglePasswordVisibility(inputId, button) {
  const input = getElement(inputId);
  if (!input || !button) return;

  const isVisible = input.type === 'text';
  input.type = isVisible ? 'password' : 'text';
  button.setAttribute('aria-pressed', String(!isVisible));
  button.setAttribute('aria-label', isVisible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
}

function attachPasswordToggle(buttonId, inputId) {
  const button = getElement(buttonId);
  if (!button) return;
  button.addEventListener('click', () => togglePasswordVisibility(inputId, button));
}

function attachBlurValidation(input, validator) {
  if (!input) return;
  input.addEventListener('blur', () => {
    const error = validator(input.value);
    if (error) {
      showFieldError(input, error);
    } else {
      clearFieldError(input);
    }
  });
}

function setRegisterStrength(passwordInput) {
  const strengthEl = getElement('password-strength');
  if (!strengthEl || !passwordInput) return;
  const { text, strength } = evaluatePasswordStrength(passwordInput.value);
  strengthEl.textContent = text;
  strengthEl.className = `password-strength ${strength}`;
}

function disableSubmit(button, disabled) {
  if (!button) return;
  button.disabled = disabled;
}

async function handleLogin() {
  const form = getElement('login-form');
  const status = getElement('login-status');
  const emailInput = getElement('email-login');
  const passwordInput = getElement('password-login');
  const submitButton = getElement('login-submit');

  if (!form || !emailInput || !passwordInput || !submitButton) return;

  clearStatus(status);
  showFieldError(emailInput, validateEmail(emailInput.value));
  showFieldError(passwordInput, validatePassword(passwordInput.value));

  if (emailInput.getAttribute('aria-invalid') === 'true' || passwordInput.getAttribute('aria-invalid') === 'true') {
    setStatus(status, 'Veuillez corriger les erreurs ci-dessus.', 'error');
    return;
  }

  if (isSubmitting) return;
  isSubmitting = true;
  disableSubmit(submitButton, true);

  try {
    const { data, error } = await safeAuthRequest(
      supabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      })
    );

    if (error || !data?.session) {
      setStatus(status, 'Email ou mot de passe invalide.', 'error');
      return;
    }

    setStatus(status, 'Connexion réussie. Redirection en cours…', 'success');
    window.location.href = '/frontend/dashboard.html';
  } catch (error) {
    const message = error.message === 'offline'
      ? 'Vous êtes hors ligne. Vérifiez votre connexion internet.'
      : error.message === 'timeout'
      ? 'Le service met trop de temps à répondre. Réessayez dans un instant.'
      : 'Impossible de joindre le service. Réessayez plus tard.';
    setStatus(status, message, 'error');
  } finally {
    isSubmitting = false;
    disableSubmit(submitButton, false);
  }
}

async function handleRegister() {
  const status = getElement('register-status');
  const nameInput = getElement('name-register');
  const emailInput = getElement('email-register');
  const passwordInput = getElement('password-register');
  const confirmInput = getElement('confirm-password-register');
  const acceptInput = getElement('accept-privacy');
  const submitButton = getElement('register-submit');

  if (!nameInput || !emailInput || !passwordInput || !confirmInput || !acceptInput || !submitButton) return;

  clearStatus(status);
  showFieldError(nameInput, validateName(nameInput.value));
  showFieldError(emailInput, validateEmail(emailInput.value));
  showFieldError(passwordInput, validatePassword(passwordInput.value));
  showFieldError(confirmInput, validateConfirmPassword(passwordInput.value, confirmInput.value));

  if (!acceptInput.checked) {
    showFieldError(acceptInput, 'Vous devez accepter la politique de confidentialité.');
  } else {
    clearFieldError(acceptInput);
  }

  const invalid = [nameInput, emailInput, passwordInput, confirmInput, acceptInput].some((input) => input.getAttribute('aria-invalid') === 'true');
  if (invalid) {
    setStatus(status, 'Veuillez corriger les erreurs ci-dessus.', 'error');
    return;
  }

  if (isSubmitting) return;
  isSubmitting = true;
  disableSubmit(submitButton, true);

  try {
    const { data, error } = await safeAuthRequest(
      supabase.auth.signUp({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      })
    );

    if (error) {
      setStatus(status, error.message || 'Impossible de créer le compte.', 'error');
      return;
    }

    setStatus(status, 'Inscription réussie ! Redirection vers la vérification d\'email…', 'success');
    
    // Stocker l'email pour la page de vérification
    sessionStorage.setItem('pending_verification_email', emailInput.value.trim());
    
    // Rediriger vers la page de vérification d'email
    setTimeout(() => {
      window.location.href = 'verify-email.html';
    }, 1500);
  } catch (error) {
    const message = error.message === 'offline'
      ? 'Vous êtes hors ligne. Vérifiez votre connexion internet.'
      : error.message === 'timeout'
      ? 'Le service met trop de temps à répondre. Réessayez dans un instant.'
      : 'Impossible de joindre le service. Réessayez plus tard.';
    setStatus(status, message, 'error');
  } finally {
    isSubmitting = false;
    disableSubmit(submitButton, false);
  }
}

function handleOauth(provider) {
  const status = getElement('login-status') || getElement('register-status');
  clearStatus(status);
  if (!navigator.onLine) {
    setStatus(status, 'Vous êtes hors ligne. Vérifiez votre connexion internet.', 'error');
    return;
  }

  supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  }).catch(() => {
    setStatus(status, 'Impossible de démarrer la connexion OAuth. Réessayez.', 'error');
  });
}

function initLoginPage() {
  const form = getElement('login-form');
  if (!form) return;

  const emailInput = getElement('email-login');
  const passwordInput = getElement('password-login');
  const submitButton = getElement('login-submit');
  const googleButton = getElement('google-login');
  const toggleButton = getElement('toggle-password-login');

  attachBlurValidation(emailInput, validateEmail);
  attachBlurValidation(passwordInput, validatePassword);
  attachPasswordToggle('toggle-password-login', 'password-login');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLogin();
  });

  if (googleButton) {
    googleButton.addEventListener('click', () => handleOauth('google'));
  }
}

function initRegisterPage() {
  const form = getElement('register-form');
  if (!form) return;

  const nameInput = getElement('name-register');
  const emailInput = getElement('email-register');
  const passwordInput = getElement('password-register');
  const confirmInput = getElement('confirm-password-register');
  const acceptInput = getElement('accept-privacy');
  const googleButton = getElement('google-register');
  const toggleButton = getElement('toggle-password-register');

  attachBlurValidation(nameInput, validateName);
  attachBlurValidation(emailInput, validateEmail);
  attachBlurValidation(passwordInput, validatePassword);
  attachBlurValidation(confirmInput, (value) => validateConfirmPassword(passwordInput.value, value));
  attachPasswordToggle('toggle-password-register', 'password-register');
  attachPasswordToggle('toggle-password-register', 'confirm-password-register');

  passwordInput.addEventListener('input', () => setRegisterStrength(passwordInput));
  setRegisterStrength(passwordInput);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleRegister();
  });

  if (googleButton) {
    googleButton.addEventListener('click', () => handleOauth('google'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
});
