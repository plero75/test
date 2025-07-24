# Dashboard Mobilité – RER A Joinville-le-Pont

Ce projet est un tableau de bord dynamique affichant en temps réel les 4 prochains passages du RER A à la gare de Joinville-le-Pont (IDFM).

## 📦 Contenu du dépôt

- `index.html` – Page principale du dashboard
- `style.css` – Style visuel (responsive, sombre, animations)
- `script.js` – Script JavaScript qui interroge l'API PRIM (via proxy Cloudflare)
- `bus77.js` – Script simplifié de récupération des horaires Bus 77
- `bus201.js` – Script simplifié de récupération des horaires Bus 201
- `README.md` – Ce fichier d’explication

## 🔁 Fonctionnalités

- Affichage automatique des 4 prochains départs par direction (Poissy / Cergy)
- Détection et affichage des retards (⚠️ Retard +X min)
- Affichage des suppressions (❌ supprimé)
- Alternance animée entre « dans X min » et « Retard +X min »
- Affichage des messages de trafic en temps réel via `/general-message`

## 🌐 Déploiement GitHub Pages

1. Crée un dépôt GitHub
2. Envoie ces fichiers à la racine
3. Active GitHub Pages via **Settings > Pages** (branche `main`)
4. Visite l’URL générée (ex. `https://ton-pseudo.github.io/dashboard-mobilite-rer-a/`)

## 🔧 À adapter

- Le proxy utilisé (`ratp-proxy.hippodrome-proxy42.workers.dev`) doit être valide
- Pour ajouter Bus 77 ou 201 : utiliser les scripts `bus77.js` et `bus201.js` ou intégrer leurs blocs dans `script.js`.

---

© Projet par Paul – Vincennes, 2025
