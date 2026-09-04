# Méthodes d'Authentification SondArt

## ⚠️ Important
Ce projet utilise **Supabase** pour l'authentification, pas Firebase.

## Configuration Supabase Actuelle

**Projet:** `jyvhxjnefapsksogolgp`  
**URL:** `https://jyvhxjnefapsksogolgp.supabase.co`

---

## 🔐 Méthodes d'Authentification Disponibles

### 1. **Email/Password** ✅ (Activé)
- **Type:** Authentification native Supabase
- **Code de flux:**
  ```javascript
  // Inscription
  const { data, error } = await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'SecurePassword123'
  });
  
  // Connexion
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'SecurePassword123'
  });
  ```
- **Où:** Implémenté dans `login/connexion.js`
- **Fichiers HTML:** `login/login.html`, `login/register.html`

### 2. **Google OAuth** (À Activer)
- **Type:** OAuth via Google
- **Configuration requise:**
  1. Aller dans [Supabase Console](https://app.supabase.com) → Settings → Authentication
  2. Activer **Google** dans les providers
  3. Ajouter Google OAuth credentials
  
- **Code de flux:**
  ```javascript
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login/login.html`
    }
  });
  ```

### 3. **GitHub OAuth** (Optionnel)
- **Configuration:** Dans Supabase → Settings → Authentication → GitHub
- **Code:**
  ```javascript
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/login/login.html`
    }
  });
  ```

### 4. **Magic Link (Email sans mot de passe)** (Optionnel)
- **Flux:**
  ```javascript
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'user@example.com',
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/login/login.html`
    }
  });
  ```

---

## 🛡️ Gestion des Sessions

```javascript
// Obtenir l'utilisateur actuel
const { data: { user } } = await supabase.auth.getUser();

// Écouter les changements d'authentification
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('Utilisateur connecté:', session.user);
  } else if (event === 'SIGNED_OUT') {
    console.log('Utilisateur déconnecté');
  }
});

// Déconnexion
const { error } = await supabase.auth.signOut();
```

---

## 📋 Étapes d'Activation

### Étape 1: Email/Password (Déjà activé ✅)
Aucune action requise, le code est prêt.

### Étape 2: Google OAuth (Recommandé)
1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet
3. Activer Google+ API
4. Créer les identifiants OAuth 2.0 (Client ID + Secret)
5. Dans Supabase Console:
   - Settings → Authentication → Google
   - Coller Client ID et Secret
   - Ajouter `http://localhost:5500/login/login.html` aux URLs autorisées

### Étape 3: Implémenter dans l'UI
Ajouter les boutons OAuth dans `login/login.html` et `login/register.html`:

```html
<!-- Google Sign-In Button -->
<button id="google-signin" class="oauth-button google">
  <svg><!-- Google icon --></svg>
  Continuer avec Google
</button>

<script>
document.getElementById('google-signin').addEventListener('click', async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login/login.html`
    }
  });
  if (error) console.error(error);
});
</script>
```

---

## 🔄 Row Level Security (RLS)

Les tables sont protégées par RLS:
- **Profiles:** Chaque utilisateur ne voit que son profil
- **Surveys:** Chaque utilisateur ne voit que ses sondages
- **Respondents/Answers:** Protégés par les sondages du propriétaire

---

## 🚀 Résumé des Clés

| Clé | Valeur |
|-----|--------|
| **SUPABASE_URL** | https://jyvhxjnefapsksogolgp.supabase.co |
| **SUPABASE_ANON_KEY** | sb_publishable_nrBkbo2JdvmO1WX2yRPAdg_SboZVlmT |
| **SUPABASE_SERVICE_ROLE_KEY** | À remplir dans `.env` |

---

## 📚 Ressources Utiles

- [Docs Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)
- [RLS Policy Examples](https://supabase.com/docs/guides/auth/row-level-security)
