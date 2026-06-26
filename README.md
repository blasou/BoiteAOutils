# Boîte à Outils — A2S PROJECT

Boîte à outils web pour **A2S PROJECT (HERAUT SABINE)** : génération de documents PDF
et petits calculateurs métier. 100 % HTML / CSS / JS (aucun build), DA néo-brutaliste.

🔗 **En ligne :** https://blasou.github.io/BoiteAOutils/

## Outils

| Outil | Description |
|-------|-------------|
| 🏷️ Devis | Génère un devis professionnel en PDF (prestations, total, bon pour accord) |
| 📄 Facture | Génère une facture en PDF (conditions, échéance, mentions légales) |
| 📋 Cartouche 1 | Cartouche A3 — déclaration préalable de travaux (DP) |
| 📋 Cartouche 2 | Cartouche A3 — dossier de demande de permis de construire (PC) |
| 📐 Avant Projet | Tableau des surfaces (APS) A3, calcul auto de la surface habitable |
| 📏 Pente / Degré | Convertisseur pente (%) ⇄ angle (°), avec visualisation |
| 🧮 Pourcentages | Ratio, taux d'évolution, application d'une variation, valeur initiale |

## Utilisation

Ouvrir [`index.html`](index.html) dans un navigateur (ou via la version en ligne).
Chaque générateur produit un PDF téléchargeable. Les calculateurs sont instantanés.

## Architecture

- `index.html` — page d'accueil (hub des outils)
- `styles.css` — design system partagé (néo-brutalisme)
- `save_load.js` — moteur de sauvegarde unifié (export/import JSON + historique local)
- `calculs.js` — fonctions de calcul **pures** (séparées de la couche DOM)
- `logo.js` — logo encodé en base64 pour l'intégration dans les PDF
- `logo.png` — logo source

## Technique

- [jsPDF](https://github.com/parallax/jsPDF) + jsPDF-AutoTable pour les PDF
- Polices : Archivo + IBM Plex Mono (Google Fonts)
- Aucune dépendance à installer, aucun serveur requis
