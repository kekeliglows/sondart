import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Ne jamais utiliser la clé service_role côté client.
const SUPABASE_URL = 'https://jyvhxjnefapsksogolgp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nrBkbo2JdvmO1WX2yRPAdg_SboZVlmT';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 8;
};

export async function signUp(email, password) {
  if (!isValidEmail(email)) {
    throw new Error('Format d\'email invalide');
  }
  if (!isValidPassword(password)) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }

  // IMPORTANT : refaire la validation côté serveur, ne jamais faire confiance au frontend.
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signIn(email, password) {
  if (!isValidEmail(email)) {
    throw new Error('Format d\'email invalide');
  }
  if (!isValidPassword(password)) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

export async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.access_token ?? null;
}
