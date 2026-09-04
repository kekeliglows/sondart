# SondArt

SondArt est une interface de sondage moderne et accessible, pensée pour la création rapide d’enquêtes et une intégration propre avec Supabase Auth.

## Structure du projet

- `index.html` : page d’accueil professionnelle
- `index.css` : styles spécifiques à la page d’accueil
- `frontend/design-system.css` : tokens et styles globaux
- `frontend/styles.css` : composants et styles partagés
- `login/login.html` / `login/register.html` : pages d’authentification
- `login/login.css` : styles d’authentification
- `login/connexion.js` : logique Supabase et validation client

## Supabase

Voir `SUPABASE_SETUP.md` pour la configuration initiale du projet Supabase.

## Initialisation Git

1. Crée un dépôt Git local :

```bash
git init
git add .
git commit -m "Initial commit"
```

2. Crée le dépôt sur GitHub depuis https://github.com/new
3. Ajoute la télécommande et pousse :

```bash
git branch -M main
git remote add origin https://github.com/<votre-utilisateur>/sondart.git
git push -u origin main
```
