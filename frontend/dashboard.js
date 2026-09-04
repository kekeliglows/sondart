import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://jyvhxjnefapsksogolgp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nrBkbo2JdvmO1WX2yRPAdg_SboZVlmT';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier l'authentification
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    window.location.href = '/login/login.html';
    return;
  }

  // Charger les données utilisateur
  const userGreeting = document.getElementById('user-greeting');
  const userAvatar = document.getElementById('user-avatar');
  const dropdown = document.getElementById('dropdown-menu');
  const surveyCount = document.getElementById('survey-count');
  const responseCount = document.getElementById('response-count');
  const respondentCount = document.getElementById('respondent-count');
  const surveysList = document.getElementById('surveys-list');
  const logoutBtn = document.getElementById('logout-btn');

  // Afficher l'initiale de l'utilisateur
  const userInitial = user.email?.charAt(0).toUpperCase() || 'U';
  userAvatar.textContent = userInitial;

  // Menu déroulant
  userAvatar.addEventListener('click', () => {
    dropdown.classList.toggle('visible');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      dropdown.classList.remove('visible');
    }
  });

  // Déconnexion
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  try {
    // Charger le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profile?.username) {
      userGreeting.textContent = `Prêt à créer, ${profile.username} ?`;
    } else {
      userGreeting.textContent = 'Prêt à créer des sondages ?';
    }

    // Charger les statistiques
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id')
      .eq('owner_id', user.id);

    if (surveys) {
      surveyCount.textContent = surveys.length;

      if (surveys.length > 0) {
        // Récupérer les statistiques
        const surveyIds = surveys.map(s => s.id);
        
        const { count: respCount } = await supabase
          .from('answers')
          .select('id', { count: 'exact' })
          .in('question_id', 
            await supabase
              .from('questions')
              .select('id')
              .in('survey_id', surveyIds)
              .then(d => d.data?.map(q => q.id) || [])
          );

        const { count: respndntCount } = await supabase
          .from('respondents')
          .select('id', { count: 'exact' })
          .in('survey_id', surveyIds);

        responseCount.textContent = respCount || 0;
        respondentCount.textContent = respndntCount || 0;

        // Afficher les sondages récents
        const { data: recentSurveys } = await supabase
          .from('surveys')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentSurveys && recentSurveys.length > 0) {
          surveysList.innerHTML = recentSurveys.map(survey => `
            <div class="card" style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                  <div class="card-title">${survey.title}</div>
                  <div class="card-description">${survey.description || 'Pas de description'}</div>
                </div>
                <a href="results.html?id=${survey.id}" class="btn btn-secondary">
                  Voir résultats
                </a>
                <a href="take_survey.html?id=${survey.id}" class="btn btn-secondary">
                  Ouvrir le sondage
                </a>
              </div>
              <div style="display: flex; gap: 2rem; font-size: 0.9rem; color: var(--color-muted);">
                <div>${new Date(survey.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          `).join('');
        }
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
});
