// Webhook qui reçoit les leads et les réservations.
// Workflow n8n « Périnéa — leads, RDV et rappels » une fois activé :
// https://mourad-mh.app.n8n.cloud/webhook/perinea-leads
// Vide = mode démo : rien n'est envoyé.
const FORM_ENDPOINT = '';

// Lien de l'événement Calendly de 30 minutes, ex. https://calendly.com/perinea/entretien-30-min
// Vide = mode démo : un faux calendrier permet de tester le parcours.
const CALENDLY_URL = '';

// Étiquettes de conversion Google Ads.
const LEAD_CONVERSION = 'AW-XXXXXXXXXX/LLLLLLLLLLLLLLLLLLL'; // questionnaire terminé
const TEL_CONVERSION = 'AW-XXXXXXXXXX/XXXXXXXXXXXXXXXXXXX';  // clic sur le téléphone
// La conversion « rendez-vous réservé » est dans merci.html, l'achat dans paiement-confirme.html.

const CONSENT_KEY = 'perinea-consent';
const ATTR_KEY = 'perinea-attr';

function readConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

function applyConsent(choice) {
  const v = choice === 'grant' ? 'granted' : 'denied';
  // ad_personalization reste refusé : pas de remarketing sur un sujet de santé (politique Google).
  gtag('consent', 'update', {
    ad_storage: v, ad_user_data: v, analytics_storage: v, ad_personalization: 'denied'
  });
}

// Bandeau témoins
const bar = document.getElementById('consent-bar');
const saved = readConsent();
if (saved) applyConsent(saved);
else if (bar) bar.hidden = false;

document.querySelectorAll('[data-consent]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const choice = btn.dataset.consent;
    try { localStorage.setItem(CONSENT_KEY, choice); } catch {}
    applyConsent(choice);
    bar.hidden = true;
  });
});

document.querySelectorAll('[data-open-consent]').forEach((btn) => {
  btn.addEventListener('click', () => { bar.hidden = false; });
});

// Clics sur le téléphone
document.querySelectorAll('[data-track="tel"]').forEach((a) => {
  a.addEventListener('click', () => {
    gtag('event', 'conversion', { send_to: TEL_CONVERSION });
  });
});

// Provenance de la visite (gclid, utm) : gardée pour la session et envoyée avec le lead,
// pour pouvoir importer plus tard les ventes conclues par téléphone dans Google Ads.
const ATTR_PARAMS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
let attribution = {};
try { attribution = JSON.parse(sessionStorage.getItem(ATTR_KEY)) || {}; } catch {}
const qs = new URLSearchParams(location.search);
ATTR_PARAMS.forEach((k) => { if (qs.get(k)) attribution[k] = qs.get(k); });
try { sessionStorage.setItem(ATTR_KEY, JSON.stringify(attribution)); } catch {}

function post(data) {
  if (!FORM_ENDPOINT) return Promise.resolve();
  return fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true
  });
}

// Numéro au format international (+1…) pour WhatsApp
function phoneE164(value) {
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return null;
}

// Questionnaire en 4 étapes
const form = document.getElementById('lead-form');
const steps = [...form.querySelectorAll('.step')];
const msg = form.querySelector('.form__msg');
const prevBtn = form.querySelector('[data-prev]');
const nextBtn = form.querySelector('[data-next]');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
let current = 0;
let leadId = null;
let lead = null;

function showStep(i) {
  current = i;
  steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
  prevBtn.hidden = i === 0;
  nextBtn.firstChild.textContent = i === steps.length - 1 ? 'Choisir mon créneau ' : 'Continuer ';
  progressBar.style.width = `${((i + 1) / (steps.length + 1)) * 100}%`;
  progressLabel.textContent = `Étape ${i + 1} sur ${steps.length + 1}`;
  msg.textContent = '';
}

function stepError(i) {
  const s = steps[i];
  if (i === 0 && !form.situation.value) return 'Choisissez une réponse.';
  if (i === 1 && !s.querySelector('input:checked')) return 'Choisissez au moins une réponse.';
  if (i === 2 && !form.delai.value) return 'Choisissez une réponse.';
  if (i === 3) {
    const errors = [];
    const check = (input, ok, label) => {
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok) errors.push(label);
    };
    check(form.prenom, !!form.prenom.value.trim(), 'votre prénom');
    check(form.nom, !!form.nom.value.trim(), 'votre nom');
    check(form.courriel, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.courriel.value.trim()), 'un courriel valide');
    check(form.telephone, !!phoneE164(form.telephone.value), 'un numéro de cellulaire valide');
    [form.consentement, form.rappels].forEach((c) => {
      c.closest('.consent').classList.toggle('is-invalid', !c.checked);
      if (!c.checked) errors.push('votre accord');
    });
    if (errors.length) return `Merci d'indiquer ${[...new Set(errors)].join(', ')}.`;
  }
  return '';
}

// Les questions à choix unique passent toutes seules à l'étape suivante
form.querySelectorAll('input[type="radio"]').forEach((r) => {
  r.addEventListener('change', () => setTimeout(() => goNext(), 220));
});

// Une erreur corrigée disparaît tout de suite
form.addEventListener('input', (e) => {
  e.target.removeAttribute('aria-invalid');
  e.target.closest('.consent')?.classList.remove('is-invalid');
  msg.textContent = '';
});

prevBtn.addEventListener('click', () => showStep(current - 1));
form.addEventListener('submit', (e) => { e.preventDefault(); goNext(); });

function goNext() {
  const err = stepError(current);
  if (err) { msg.textContent = err; return; }
  if (current < steps.length - 1) { showStep(current + 1); return; }
  if (form.site_web.value) return; // robot
  submitLead();
}

function submitLead() {
  const fd = new FormData(form);
  leadId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  lead = {
    type: 'lead',
    leadId,
    prenom: fd.get('prenom').trim(),
    nom: fd.get('nom').trim(),
    courriel: fd.get('courriel').trim(),
    telephone: phoneE164(fd.get('telephone')),
    situation: fd.get('situation'),
    deja_essaye: fd.getAll('deja_essaye'),
    delai: fd.get('delai'),
    consentement_rappels: true,
    page: location.origin + location.pathname,
    date: new Date().toISOString(),
    ...attribution
  };

  // Le lead est envoyé tout de suite : même sans réservation, l'équipe peut rappeler.
  post(lead).catch(() => {});
  gtag('event', 'conversion', { send_to: LEAD_CONVERSION });
  try { sessionStorage.setItem('perinea-lead', JSON.stringify({ leadId, prenom: lead.prenom })); } catch {}

  form.hidden = true;
  progressBar.style.width = '100%';
  progressLabel.textContent = `Étape ${steps.length + 1} sur ${steps.length + 1}`;
  document.querySelector('[data-prenom]').textContent = lead.prenom;
  document.getElementById('booking').hidden = false;
  document.getElementById('parcours').scrollIntoView({ behavior: 'smooth', block: 'start' });
  openCalendar();
}

function openCalendar() {
  const box = document.getElementById('calendly');
  if (!CALENDLY_URL) {
    box.classList.add('demo-cal');
    box.innerHTML = '<p><strong>Mode démo</strong> : le calendrier Calendly s\'affichera ici dès que CALENDLY_URL sera renseigné dans main.js.</p>' +
      '<button type="button" class="btn btn--navy">Simuler une réservation</button>';
    box.querySelector('button').addEventListener('click', () => onBooked({}));
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://assets.calendly.com/assets/external/widget.js';
  s.onload = () => {
    Calendly.initInlineWidget({
      url: CALENDLY_URL + (CALENDLY_URL.includes('?') ? '&' : '?') + 'hide_gdpr_banner=1&locale=fr',
      parentElement: box,
      prefill: {
        name: `${lead.prenom} ${lead.nom}`,
        firstName: lead.prenom,
        lastName: lead.nom,
        email: lead.courriel,
        // Questions de l'événement Calendly, dans cet ordre : 1. cellulaire WhatsApp, 2. notes
        customAnswers: {
          a1: lead.telephone,
          a2: `Souhaite découvrir : ${lead.situation} · Déjà essayé : ${lead.deja_essaye.join(', ')} · Commencer : ${lead.delai}`
        }
      },
      utm: {
        utmSource: attribution.utm_source,
        utmMedium: attribution.utm_medium,
        utmCampaign: attribution.utm_campaign,
        utmTerm: attribution.utm_term,
        utmContent: leadId
      }
    });
  };
  document.head.appendChild(s);
}

// Calendly prévient la page quand le rendez-vous est réservé
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://calendly.com' || e.data?.event !== 'calendly.event_scheduled') return;
  onBooked(e.data.payload || {});
});

function onBooked(payload) {
  post({
    type: 'booking',
    leadId,
    event: payload.event?.uri || null,
    invitee: payload.invitee?.uri || null,
    date: new Date().toISOString()
  }).catch(() => {}).finally(() => { location.href = 'merci.html'; });
}

// La barre d'action mobile n'apparaît qu'une fois les boutons du haut dépassés,
// et disparaît pendant que la visiteuse remplit le questionnaire
const mbar = document.querySelector('.mbar');
if (mbar && 'IntersectionObserver' in window) {
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    mbar.classList.toggle('is-off', visible.size > 0);
  });
  io.observe(document.querySelector('.hero__cta'));
  io.observe(document.getElementById('entretien'));
} else if (mbar) {
  mbar.classList.remove('is-off');
}

showStep(0);
document.getElementById('y').textContent = new Date().getFullYear();
