# Périnéa landing page — Google Ads compliance notes

Static site: `index.html`, `merci.html` (thank-you + conversion), `politique-de-confidentialite.html`,
`conditions.html`, `styles.css`, `main.js`, `favicon.svg`. No build step; upload the folder as-is.
Every value the client must supply is wrapped in a yellow `<span class="todo">` — search for `todo`.

## What was changed from the client mockups, and why

| Mockup element | Decision | Google policy at stake |
|---|---|---|
| "Dr Smart, ancien urologue" + stock doctor photo | Removed | Misrepresentation: unverifiable credentials / fake persona. Can return only with a real name, real photo and verifiable licence. |
| Testimonials "Sophie, 48 ans", "Claire, 52 ans" | Removed (commented slot in `index.html`) | Misrepresentation: fake or unverifiable reviews. Re-add only real ones, with written consent, no health-outcome promises. |
| Anatomical / vulva-like pink illustration | Replaced by an abstract lotus | Sexual content: imagery resembling genitalia gets health ads disapproved. |
| "Et si votre périnée était au cœur de vos fuites urinaires ?" | Used the softer mockup-3 headline; leaks only mentioned in a neutral educational block | Personal hardships / sensitive health targeting. |
| No business identity | Footer legal ID + T&C page (price deliberately left off the site, given on the call) | Misrepresentation: clear business info and payment model are required. |

## Already in place

- Business identity in the footer (legal name, NEQ, address, phone, e-mail). **Still to fill in.**
- Privacy policy written for Quebec's Law 25 (privacy officer, retention, rights, cookies).
- Cookie banner: Consent Mode v2, everything denied by default. `ad_personalization` is always denied (no remarketing on a health topic).
- The questionnaire asks about the visitor's situation (postpartum, menopause, sport…), never symptoms or diagnosis. Answers go only to the client's webhook and Calendly; **no answer is ever sent to Google** (conversions carry no parameters). Keep it that way: no enhanced conversions with questionnaire data.
- No price on the site (client decision, 2026-10-27): the price is given during the information call and confirmed in writing before payment; nothing is charged on the site.
- Separate consent for WhatsApp/e-mail reminders (Meta requires opt-in).
- Clear statements that the call is not a medical consultation, results vary, and no guarantee is made.
- Contraindications and "talk to your doctor" block.
- Fast, light page (no images to load, one font family), no pop-ups, works on mobile, no horizontal scroll (checked at 320–1440 px).

## Blocking before launch (client must provide)

1. **Health Canada medical device licence (MDL) numbers** for both devices. Electrostimulation devices are medical devices. Without a licence, Google will limit or disapprove the ads, and selling them in Canada would be illegal anyway. This is the #1 risk.
2. Legal name, NEQ, address, phone, e-mail; the name of the privacy officer.
3. Taxes on the 2,995 $ (included or not), withdrawal and refund terms, warranty (`conditions.html`).
4. Contraindication list confirmed against the devices' instructions for use.
5. Real domain (`perinea.ca` is a placeholder in the canonical URL, JSON-LD and privacy page).

## Tracking setup

- Replace `AW-XXXXXXXXXX` (in `index.html`, `merci.html`, `paiement-confirme.html`) with the account's tag ID.
- Four conversions: "Lead" (`LEAD_CONVERSION` in `main.js`, secondary), "RDV réservé" (`merci.html`, **primary**), "Achat" (`paiement-confirme.html`, value 2995 CAD), "Appel" (`TEL_CONVERSION`, secondary).
- Leads carry the `gclid`: sales closed by phone can later be imported as offline conversions.
- `FORM_ENDPOINT` and `CALENDLY_URL` in `main.js`. While empty, the page runs in demo mode (nothing is sent; a fake calendar lets you test the path).
- Full flow and reminder automation: see `AUTOMATION.md`.

## Ad copy (outside this page, same rules)

No "guérir / traiter / garanti", no "Vous avez des fuites ?". Prefer "Programme de renforcement du périnée à domicile", "Entretien d'information gratuit".
In the campaign, do not use remarketing or Customer Match lists (sensitive health category).
