import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jyvhxjnefapsksogolgp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nrBkbo2JdvmO1WX2yRPAdg_SboZVlmT';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let resendCooldown = 0;

document.addEventListener('DOMContentLoaded', async () => {
  const emailEl = document.getElementById('verify-email');
  const openEmailBtn = document.getElementById('open-email-btn');
  const resendBtn = document.getElementById('resend-btn');
  const countdownEl = document.getElementById('countdown');

  // Récupérer l'email depuis sessionStorage ou localStorage
  const userEmail = sessionStorage.getItem('pending_verification_email');
  if (userEmail) {
    emailEl.textContent = userEmail;
  }

  // Bouton pour ouvrir la boîte mail
  openEmailBtn.addEventListener('click', () => {
    if (userEmail) {
      const domain = userEmail.split('@')[1];
      const mailUrls = {
        'gmail.com': 'https://mail.google.com',
        'outlook.com': 'https://outlook.live.com',
        'outlook.fr': 'https://outlook.live.com',
        'yahoo.com': 'https://mail.yahoo.com',
        'icloud.com': 'https://mail.icloud.com',
      };
      const mailUrl = mailUrls[domain] || 'https://mail.google.com';
      window.open(mailUrl, '_blank');
    }
  });

  // Bouton renvoyer l'email
  resendBtn.addEventListener('click', async () => {
    if (resendCooldown > 0) {
      alert(`Veuillez attendre ${resendCooldown} secondes avant de renvoyer.`);
      return;
    }

    resendBtn.disabled = true;
    try {
      const { error } = await supabase.auth.resendEnrollmentEmail({
        email: userEmail,
      });

      if (error) throw error;

      alert('Email de confirmation renvoyé !');
      resendCooldown = 60;
      startCountdown();
    } catch (error) {
      alert('Erreur lors du renvoi de l\'email.');
      resendBtn.disabled = false;
    }
  });

  // Vérifier si l'utilisateur a confirmé son email
  const checkEmailVerified = setInterval(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email_confirmed_at) {
      clearInterval(checkEmailVerified);
      sessionStorage.removeItem('pending_verification_email');
      // Redirection avec chemin absolu pour éviter les problèmes avec les hashes Supabase
      const basePath = window.location.origin;
      window.location.href = basePath + '/login/profile.html';
    }
  }, 3000);

  // Arrêter après 15 minutes
  setTimeout(() => clearInterval(checkEmailVerified), 15 * 60 * 1000);

  function startCountdown() {
    const interval = setInterval(() => {
      resendCooldown--;
      if (resendCooldown <= 0) {
        clearInterval(interval);
        resendBtn.disabled = false;
        countdownEl.textContent = '';
      } else {
        countdownEl.textContent = `Réessayer dans ${resendCooldown}s`;
      }
    }, 1000);
  }
});
