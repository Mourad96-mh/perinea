# Périnéa — landing page

Landing page Google Ads (Québec) du programme Périnéa : renforcement du plancher pelvien à domicile, 12 mois.

Parcours : annonce → questionnaire (3 questions + coordonnées) → rendez-vous Calendly de 30 min → rappels WhatsApp et courriel → lien de paiement Stripe envoyé pendant l'entretien.

## Contenu

- `site/` : le site statique (HTML/CSS/JS, aucune étape de build). À publier tel quel ; `dev.mjs` et `package.json` ne servent qu'à la prévisualisation locale.
- `n8n/perinea-workflow.ts` : copie du workflow n8n (leads, RDV Calendly, rappels WhatsApp/courriel).
- `site/GOOGLE-ADS-COMPLIANCE.md` : conformité Google Ads et Loi 25, éléments encore à fournir.
- `site/AUTOMATION.md` : réglages Calendly, Stripe, n8n et modèles WhatsApp.

## Prévisualiser

```
cd site
npm run dev
```

puis http://localhost:3000.

## Configuration (`site/main.js`)

- `FORM_ENDPOINT` : URL du webhook n8n (vide = mode démo).
- `CALENDLY_URL` : lien de l'événement Calendly de 30 min (vide = faux calendrier de démo).
- `LEAD_CONVERSION`, `TEL_CONVERSION` et les identifiants `AW-…` des pages : conversions Google Ads.
