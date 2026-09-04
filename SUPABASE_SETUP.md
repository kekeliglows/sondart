# Configuration Supabase pour SondArt

## 1. Créer le projet Supabase

1. Ouvre https://app.supabase.com.
2. Clique sur **New project**.
3. Donne un nom comme `sondart`.
4. Choisis une région proche de ton public.
5. Configure un mot de passe pour la base de données.

## 2. Activer l’authentification

1. Ouvre **Authentication > Settings**.
2. Active **Email/password**.
3. Active **Google** si tu veux la connexion OAuth.
4. Dans **Redirect URLs**, ajoute :
   - `http://localhost:5500/login/login.html`
   - `http://localhost:5500/login/register.html`

## 3. Récupérer les clés

1. Ouvre **Settings > API**.
2. Copie la valeur `Project URL`.
3. Copie la clé `anon public`.
4. Dans `login/connexion.js`, remplace :

```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## 4. Tester localement

1. Lance un serveur local dans le dossier du projet :
   `python -m http.server 5500`.
2. Ouvre `http://localhost:5500`.
3. Clique sur **Connexion** et teste l’authentification.

## 5. Créer le dépôt GitHub

1. Sur GitHub, crée un nouveau dépôt `sondart`.
2. Copie l’URL du dépôt.
3. Exécute :

```bash
git branch -M main
git remote add origin https://github.com/<votre-utilisateur>/sondart.git
git push -u origin main
```

> GitHub ne peut pas être créé automatiquement depuis ici : fais-le avec ton compte ou ta CLI GitHub.
