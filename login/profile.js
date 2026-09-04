import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jyvhxjnefapsksogolgp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nrBkbo2JdvmO1WX2yRPAdg_SboZVlmT';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier si l'utilisateur est connecté
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    const basePath = window.location.origin;
    window.location.href = basePath + '/login/login.html';
    return;
  }

  const form = document.getElementById('profile-form');
  const usernameInput = document.getElementById('username');
  const organizationInput = document.getElementById('organization');
  const newsletterInput = document.getElementById('accept-newsletter');
  const submitButton = document.getElementById('profile-submit');
  const statusEl = document.getElementById('profile-status');
  const successMsg = document.getElementById('success-message');

  // Charger le profil existant
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    usernameInput.value = profile.username || '';
    organizationInput.value = profile.organization || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!usernameInput.value.trim()) {
      statusEl.textContent = 'Le nom d\'utilisateur est requis.';
      statusEl.className = 'form-status';
      statusEl.classList.remove('visually-hidden');
      return;
    }

    submitButton.disabled = true;

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: usernameInput.value.trim(),
          organization: organizationInput.value.trim(),
          updated_at: new Date(),
        });

      if (upsertError) throw upsertError;

      successMsg.classList.add('visible');
      
      setTimeout(() => {
        const basePath = window.location.origin;
        window.location.href = basePath + '/frontend/dashboard.html';
      }, 1500);

    } catch (error) {
      statusEl.textContent = 'Erreur lors de la mise à jour du profil.';
      statusEl.className = 'form-status';
      statusEl.classList.remove('visually-hidden');
    } finally {
      submitButton.disabled = false;
    }
  });
});
