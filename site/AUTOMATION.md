# Périnéa — lead → booking → reminders → payment

## The visitor's path (built, in this folder)

1. Google Ads → landing page.
2. Questionnaire: 3 questions (reason, already tried, when to start) + first name, last name, e-mail, WhatsApp mobile, 2 consents.
   → `{ type: "lead", leadId, answers, contact, gclid, utm… }` is POSTed to `FORM_ENDPOINT` **immediately**,
   so the sales team can call a lead even if they never book. Google Ads conversion "Lead" fires.
3. Calendly (30-min event) opens inline, pre-filled: name, e-mail, `a1` = WhatsApp number (E.164), `a2` = questionnaire summary.
   `utm_content` = `leadId`, so the Calendly booking can be matched to the lead.
4. Booking → `{ type: "booking", leadId, event, invitee }` POSTed → redirect to `merci.html` (conversion "RDV réservé").
5. During the call, the salesperson sends the **Stripe Payment Link** (2,995 $ CA).
   Payment → Stripe redirects to `paiement-confirme.html?session_id={CHECKOUT_SESSION_ID}` → conversion "Achat", value 2995 CAD.

### Calendly event settings
- Duration 30 min, location "Phone call (we call the invitee)".
- Invitee questions, **in this order**: 1. "Cellulaire (WhatsApp)" (phone), 2. "Notes" (multi-line). Pre-fill relies on that order.
- Time zone shown = invitee's; the team's availability in America/Toronto (Quebec).

### Stripe Payment Link settings
- Product "Programme Périnéa 12 mois", 2,995 CAD (+ taxes if applicable: enable Stripe Tax or set TPS/TVQ).
- After payment → "Don't show confirmation page" → redirect to `https://<domain>/paiement-confirme.html?session_id={CHECKOUT_SESSION_ID}`.
- Tip: add `?client_reference_id=<leadId>` to the link sent to each client, so every payment maps back to its lead (and its gclid).

## Reminders by WhatsApp and e-mail: built in n8n

Workflow **« Périnéa — leads, RDV et rappels WhatsApp/courriel »** (inactive draft):
https://mourad-mh.app.n8n.cloud/workflow/2xfyqEBuoN8YZCuh. Source copy: `../n8n/perinea-workflow.ts`.
Data tables: `perinea_leads` and `perinea_rdv` (same n8n project).

```
1. Webhook /webhook/perinea-leads (from the site)
   lead    → save in perinea_leads (status "nouveau") → e-mail alert to the sales team
   booking → lead status "rdv_reserve"
2. Calendly Trigger
   invitee.created  → save in perinea_rdv (status "actif") → WhatsApp confirmation → link to the lead (status + date)
   invitee.canceled → appointment status "annule" (a Calendly reschedule = cancel + new booking, handled)
3. Every 10 minutes
   active appointments → reminder due? → WhatsApp + e-mail → mark as sent
```

Reminder rules (tested on 8 timing cases + live in n8n):
- **24 h before** and **2 h before**, by WhatsApp and e-mail, each sent once.
- No 24 h reminder if the appointment was booked less than 26 h ahead; no 2 h reminder if booked less than 3 h ahead (the confirmation just went out).
- If n8n was down at the 24 h mark, the 2 h reminder still goes out.
- Dates and times are written in Quebec time ("demain, mardi 27 octobre à 19h50").

Two WhatsApp templates to submit to Meta (category *Utility*, French), 5 variables each:
- `perinea_confirmation`: « Bonjour {{1}}, votre entretien d'information Périnéa est confirmé {{2}} à {{3}} (heure du Québec). Nous vous appellerons au {{4}}. Pour déplacer le rendez-vous : {{5}} »
- `perinea_rappel`: « Bonjour {{1}}, petit rappel : votre entretien d'information Périnéa a lieu {{2}} à {{3}} (heure du Québec). Nous vous appellerons au {{4}}. Pour déplacer le rendez-vous : {{5}} »

### To switch it on
1. In n8n, connect the 3 credentials: **SMTP Périnéa**, **Calendly Périnéa**, **WhatsApp Périnéa**.
2. Fill the yellow fields: sender address, sales-team e-mail, WhatsApp phone number ID, the 2 template names (`name|language`).
3. Activate the workflow, then set `FORM_ENDPOINT = 'https://mourad-mh.app.n8n.cloud/webhook/perinea-leads'` in `main.js`.
4. Delete the two test rows (`TEST-0001`) from both data tables.

### What the client must provide for the automation
- Calendly **paid plan** (webhooks need Standard or higher) and the event link.
- **WhatsApp Business Platform (Meta Cloud API)**: verified Meta Business account, a dedicated phone number (not already used in the WhatsApp app), and approval of the template. Meta bills each template message.
- A sending e-mail address (domain with SPF/DKIM so reminders don't land in spam).
- Stripe account + Payment Link.

## Out of scope for now
The client's brief also asks to automate the **12-month programme itself** (personalised sessions, reminders, progress tracking, adjustments). That is a separate product: a client space or app plus scheduled messaging, not part of the landing page. To be scoped separately.
