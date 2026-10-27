import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, expr } from '@n8n/workflow-sdk';

const leadsTable = { __rl: true, mode: 'list', value: 'lxGNYKzMWVWxUBTq', cachedResultName: 'perinea_leads' };
const rdvTable = { __rl: true, mode: 'list', value: 'oAVbMpQieRG7QkOy', cachedResultName: 'perinea_rdv' };

const leadWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Lead du site Périnéa',
    parameters: {
      httpMethod: 'POST',
      path: 'perinea-leads',
      responseMode: 'onReceived',
      options: { allowedOrigins: '*' }
    }
  },
  output: [{ body: { type: 'lead', leadId: '3a8a2971-7050-489b-b8b7-a5df743c53d7', prenom: 'Marie', nom: 'Tremblay', courriel: 'marie@example.com', telephone: '+15145551234', situation: 'Après un accouchement', deja_essaye: ['Exercices seule'], delai: 'Dans le mois', gclid: 'TEST123', utm_source: 'google', date: '2026-10-27T14:00:00.000Z' } }]
});

const normalizeLead = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normaliser le lead',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'l-type', name: 'type', value: expr('{{ $json.body?.type ?? $json.type ?? "" }}'), type: 'string' },
          { id: 'l-id', name: 'lead_id', value: expr('{{ $json.body?.leadId ?? $json.leadId ?? "" }}'), type: 'string' },
          { id: 'l-prenom', name: 'prenom', value: expr('{{ $json.body?.prenom ?? "" }}'), type: 'string' },
          { id: 'l-nom', name: 'nom', value: expr('{{ $json.body?.nom ?? "" }}'), type: 'string' },
          { id: 'l-courriel', name: 'courriel', value: expr('{{ $json.body?.courriel ?? "" }}'), type: 'string' },
          { id: 'l-tel', name: 'telephone', value: expr('{{ $json.body?.telephone ?? "" }}'), type: 'string' },
          { id: 'l-situation', name: 'situation', value: expr('{{ $json.body?.situation ?? "" }}'), type: 'string' },
          { id: 'l-essaye', name: 'deja_essaye', value: expr('{{ [].concat($json.body?.deja_essaye ?? []).join(", ") }}'), type: 'string' },
          { id: 'l-delai', name: 'delai', value: expr('{{ $json.body?.delai ?? "" }}'), type: 'string' },
          { id: 'l-gclid', name: 'gclid', value: expr('{{ $json.body?.gclid ?? "" }}'), type: 'string' },
          { id: 'l-src', name: 'utm_source', value: expr('{{ $json.body?.utm_source ?? "" }}'), type: 'string' },
          { id: 'l-camp', name: 'utm_campaign', value: expr('{{ $json.body?.utm_campaign ?? "" }}'), type: 'string' },
          { id: 'l-term', name: 'utm_term', value: expr('{{ $json.body?.utm_term ?? "" }}'), type: 'string' },
          { id: 'l-recu', name: 'recu_le', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    }
  },
  output: [{ type: 'lead', lead_id: '3a8a2971-7050-489b-b8b7-a5df743c53d7', prenom: 'Marie', nom: 'Tremblay', courriel: 'marie@example.com', telephone: '+15145551234', situation: 'Après un accouchement', deja_essaye: 'Exercices seule', delai: 'Dans le mois', gclid: 'TEST123', utm_source: 'google', utm_campaign: '', utm_term: '', recu_le: '2026-10-27T10:00:00.000-04:00' }]
});

const routeLead = switchCase({
  version: 3.2,
  config: {
    name: 'Lead ou réservation ?',
    parameters: {
      rules: {
        values: [
          { outputKey: 'lead', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.type }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'lead' }], combinator: 'and' } },
          { outputKey: 'booking', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.type }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'booking' }], combinator: 'and' } }
        ]
      },
      options: {}
    }
  }
});

const saveLead = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Enregistrer le lead',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: leadsTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'lead_id', condition: 'eq', keyValue: expr('{{ $json.lead_id }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          lead_id: expr('{{ $json.lead_id }}'),
          prenom: expr('{{ $json.prenom }}'),
          nom: expr('{{ $json.nom }}'),
          courriel: expr('{{ $json.courriel }}'),
          telephone: expr('{{ $json.telephone }}'),
          situation: expr('{{ $json.situation }}'),
          deja_essaye: expr('{{ $json.deja_essaye }}'),
          delai: expr('{{ $json.delai }}'),
          statut: 'nouveau',
          gclid: expr('{{ $json.gclid }}'),
          utm_source: expr('{{ $json.utm_source }}'),
          utm_campaign: expr('{{ $json.utm_campaign }}'),
          utm_term: expr('{{ $json.utm_term }}'),
          recu_le: expr('{{ $json.recu_le }}')
        },
        matchingColumns: [],
        schema: [
          { id: 'lead_id', displayName: 'lead_id', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'prenom', displayName: 'prenom', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'nom', displayName: 'nom', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'courriel', displayName: 'courriel', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'telephone', displayName: 'telephone', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'situation', displayName: 'situation', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'deja_essaye', displayName: 'deja_essaye', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'delai', displayName: 'delai', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'statut', displayName: 'statut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'gclid', displayName: 'gclid', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'utm_source', displayName: 'utm_source', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'utm_campaign', displayName: 'utm_campaign', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'utm_term', displayName: 'utm_term', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'recu_le', displayName: 'recu_le', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true }
        ]
      },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-10-27T14:00:00.000Z', updatedAt: '2026-10-27T14:00:00.000Z' }]
});

const alertTeam = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: "Alerter l'équipe de vente",
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'send',
      fromEmail: placeholder('Expéditeur, ex. Périnéa <bonjour@perinea.ca>'),
      toEmail: placeholder("Courriel de l'équipe de vente"),
      subject: expr("Nouveau lead Périnéa : {{ $('Normaliser le lead').item.json.prenom }} {{ $('Normaliser le lead').item.json.nom }}"),
      emailFormat: 'html',
      html: expr("<p><b>{{ $('Normaliser le lead').item.json.prenom }} {{ $('Normaliser le lead').item.json.nom }}</b> vient de remplir le questionnaire.</p>" +
        "<ul><li>Téléphone : <a href=\"tel:{{ $('Normaliser le lead').item.json.telephone }}\">{{ $('Normaliser le lead').item.json.telephone }}</a></li>" +
        "<li>Courriel : {{ $('Normaliser le lead').item.json.courriel }}</li>" +
        "<li>Ce qui l'amène : {{ $('Normaliser le lead').item.json.situation }}</li>" +
        "<li>Déjà essayé : {{ $('Normaliser le lead').item.json.deja_essaye }}</li>" +
        "<li>Souhaite commencer : {{ $('Normaliser le lead').item.json.delai }}</li></ul>" +
        "<p>Si aucun rendez-vous Calendly n'arrive dans l'heure, appelez-la.</p>"),
      options: { appendAttribution: false }
    },
    credentials: { smtp: newCredential('SMTP Périnéa') }
  },
  output: [{ accepted: ['equipe@perinea.ca'] }]
});

const markLeadBooked = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lead : RDV réservé (site)',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: leadsTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'lead_id', condition: 'eq', keyValue: expr('{{ $json.lead_id }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: { statut: 'rdv_reserve' },
        matchingColumns: [],
        schema: [{ id: 'statut', displayName: 'statut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true }]
      },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-10-27T14:00:00.000Z', updatedAt: '2026-10-27T14:05:00.000Z' }]
});

const calendlyTrigger = trigger({
  type: 'n8n-nodes-base.calendlyTrigger',
  version: 2,
  config: {
    name: 'Calendly : RDV réservé ou annulé',
    parameters: { scope: 'user', events: ['invitee.created', 'invitee.canceled'] },
    credentials: { calendlyOAuth2Api: newCredential('Calendly Périnéa') }
  },
  output: [{ event: 'invitee.created', payload: { uri: 'https://api.calendly.com/scheduled_events/AAA/invitees/BBB', name: 'Marie Tremblay', first_name: 'Marie', last_name: 'Tremblay', email: 'marie@example.com', created_at: '2026-10-27T14:05:00.000000Z', reschedule_url: 'https://calendly.com/reschedulings/BBB', cancel_url: 'https://calendly.com/cancellations/BBB', status: 'active', questions_and_answers: [{ question: 'Cellulaire (WhatsApp)', answer: '+1 514-555-1234', position: 0 }, { question: 'Notes', answer: 'Situation : Après un accouchement', position: 1 }], tracking: { utm_content: '3a8a2971-7050-489b-b8b7-a5df743c53d7' }, scheduled_event: { start_time: '2026-10-30T14:00:00.000000Z', end_time: '2026-10-30T14:30:00.000000Z' } } }]
});

const normalizeBooking = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normaliser le RDV',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'b-event', name: 'event', value: expr('{{ $json.event }}'), type: 'string' },
          { id: 'b-uri', name: 'invitee_uri', value: expr('{{ $json.payload.uri }}'), type: 'string' },
          { id: 'b-lead', name: 'lead_id', value: expr('{{ $json.payload.tracking?.utm_content ?? "" }}'), type: 'string' },
          { id: 'b-prenom', name: 'prenom', value: expr('{{ $json.payload.first_name || ($json.payload.name || "").split(" ")[0] }}'), type: 'string' },
          { id: 'b-nom', name: 'nom', value: expr('{{ $json.payload.last_name || ($json.payload.name || "").split(" ").slice(1).join(" ") }}'), type: 'string' },
          { id: 'b-courriel', name: 'courriel', value: expr('{{ $json.payload.email }}'), type: 'string' },
          { id: 'b-wa', name: 'whatsapp', value: expr('{{ (() => { const qa = $json.payload.questions_and_answers || []; const hit = qa.find(q => /whatsapp|cellulaire/i.test(q.question)) || qa.find(q => q.position === 0) || {}; const d = String(hit.answer || $json.payload.text_reminder_number || "").replace(/[^0-9]/g, ""); return d.length === 10 ? "1" + d : d; })() }}'), type: 'string' },
          { id: 'b-debut', name: 'debut', value: expr('{{ $json.payload.scheduled_event?.start_time ?? "" }}'), type: 'string' },
          { id: 'b-reserve', name: 'reserve_le', value: expr('{{ $json.payload.created_at ?? $now.toISO() }}'), type: 'string' },
          { id: 'b-resched', name: 'reprogrammer_url', value: expr('{{ $json.payload.reschedule_url ?? "" }}'), type: 'string' },
          { id: 'b-cancel', name: 'annuler_url', value: expr('{{ $json.payload.cancel_url ?? "" }}'), type: 'string' },
          { id: 'b-date', name: 'date_texte', value: expr('{{ DateTime.fromISO($json.payload.scheduled_event?.start_time ?? "").setZone("America/Toronto").setLocale("fr").toFormat("cccc d LLLL") }}'), type: 'string' },
          { id: 'b-heure', name: 'heure_texte', value: expr('{{ DateTime.fromISO($json.payload.scheduled_event?.start_time ?? "").setZone("America/Toronto").toFormat("H\'h\'mm") }}'), type: 'string' }
        ]
      }
    }
  },
  output: [{ event: 'invitee.created', invitee_uri: 'https://api.calendly.com/scheduled_events/AAA/invitees/BBB', lead_id: '3a8a2971-7050-489b-b8b7-a5df743c53d7', prenom: 'Marie', nom: 'Tremblay', courriel: 'marie@example.com', whatsapp: '15145551234', debut: '2026-10-30T14:00:00.000000Z', reserve_le: '2026-10-27T14:05:00.000000Z', reprogrammer_url: 'https://calendly.com/reschedulings/BBB', annuler_url: 'https://calendly.com/cancellations/BBB', date_texte: 'jeudi 30 octobre', heure_texte: '10h00' }]
});

const routeCalendly = switchCase({
  version: 3.2,
  config: {
    name: 'Réservé ou annulé ?',
    parameters: {
      rules: {
        values: [
          { outputKey: 'reserve', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.event }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'invitee.created' }], combinator: 'and' } },
          { outputKey: 'annule', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $json.event }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'invitee.canceled' }], combinator: 'and' } }
        ]
      },
      options: {}
    }
  }
});

const saveRdv = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Enregistrer le RDV',
    parameters: {
      resource: 'row',
      operation: 'upsert',
      dataTableId: rdvTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'invitee_uri', condition: 'eq', keyValue: expr('{{ $json.invitee_uri }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          invitee_uri: expr('{{ $json.invitee_uri }}'),
          lead_id: expr('{{ $json.lead_id }}'),
          prenom: expr('{{ $json.prenom }}'),
          nom: expr('{{ $json.nom }}'),
          courriel: expr('{{ $json.courriel }}'),
          whatsapp: expr('{{ $json.whatsapp }}'),
          debut: expr('{{ $json.debut }}'),
          reserve_le: expr('{{ $json.reserve_le }}'),
          reprogrammer_url: expr('{{ $json.reprogrammer_url }}'),
          annuler_url: expr('{{ $json.annuler_url }}'),
          statut: 'actif',
          rappel_veille: false,
          rappel_2h: false
        },
        matchingColumns: [],
        schema: [
          { id: 'invitee_uri', displayName: 'invitee_uri', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'lead_id', displayName: 'lead_id', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'prenom', displayName: 'prenom', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'nom', displayName: 'nom', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'courriel', displayName: 'courriel', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'whatsapp', displayName: 'whatsapp', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'debut', displayName: 'debut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'reserve_le', displayName: 'reserve_le', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'reprogrammer_url', displayName: 'reprogrammer_url', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'annuler_url', displayName: 'annuler_url', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'statut', displayName: 'statut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'rappel_veille', displayName: 'rappel_veille', type: 'boolean', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'rappel_2h', displayName: 'rappel_2h', type: 'boolean', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true }
        ]
      },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-10-27T14:05:00.000Z', updatedAt: '2026-10-27T14:05:00.000Z' }]
});

const linkLead = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lead : RDV réservé (Calendly)',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: leadsTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'lead_id', condition: 'eq', keyValue: expr("{{ $('Normaliser le RDV').item.json.lead_id || 'aucun' }}") }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          statut: 'rdv_reserve',
          rdv_debut: expr("{{ $('Normaliser le RDV').item.json.debut }}")
        },
        matchingColumns: [],
        schema: [
          { id: 'statut', displayName: 'statut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'rdv_debut', displayName: 'rdv_debut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true }
        ]
      },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-10-27T14:00:00.000Z', updatedAt: '2026-10-27T14:05:00.000Z' }]
});

const whatsappConfirm = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WhatsApp : confirmation',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'sendTemplate',
      phoneNumberId: placeholder('ID du numéro WhatsApp Business (Meta)'),
      recipientPhoneNumber: expr("{{ $('Normaliser le RDV').item.json.whatsapp }}"),
      template: placeholder('Modèle approuvé de confirmation, ex. perinea_confirmation|fr'),
      components: {
        component: [{
          type: 'body',
          bodyParameters: {
            parameter: [
              { type: 'text', text: expr("{{ $('Normaliser le RDV').item.json.prenom }}") },
              { type: 'text', text: expr("le {{ $('Normaliser le RDV').item.json.date_texte }}") },
              { type: 'text', text: expr("{{ $('Normaliser le RDV').item.json.heure_texte }}") },
              { type: 'text', text: expr("+{{ $('Normaliser le RDV').item.json.whatsapp }}") },
              { type: 'text', text: expr("{{ $('Normaliser le RDV').item.json.reprogrammer_url }}") }
            ]
          }
        }]
      }
    },
    credentials: { whatsAppApi: newCredential('WhatsApp Périnéa') }
  },
  output: [{ messaging_product: 'whatsapp', messages: [{ id: 'wamid.XXX' }] }]
});

const cancelRdv = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Marquer le RDV annulé',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: rdvTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'invitee_uri', condition: 'eq', keyValue: expr('{{ $json.invitee_uri }}') }] },
      columns: {
        mappingMode: 'defineBelow',
        value: { statut: 'annule' },
        matchingColumns: [],
        schema: [{ id: 'statut', displayName: 'statut', type: 'string', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true }]
      },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-10-27T14:05:00.000Z', updatedAt: '2026-10-28T09:00:00.000Z' }]
});

const everyTenMinutes = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Toutes les 10 minutes',
    parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 10 }] } }
  },
  output: [{}]
});

const getActiveRdv = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'RDV actifs',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: rdvTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'statut', condition: 'eq', keyValue: 'actif' }] },
      returnAll: true
    }
  },
  output: [{ id: 1, invitee_uri: 'https://api.calendly.com/scheduled_events/AAA/invitees/BBB', prenom: 'Marie', courriel: 'marie@example.com', whatsapp: '15145551234', debut: '2026-10-30T14:00:00.000000Z', reserve_le: '2026-10-27T14:05:00.000000Z', reprogrammer_url: 'https://calendly.com/reschedulings/BBB', statut: 'actif', rappel_veille: false, rappel_2h: false }]
});

const computeDue = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Calculer les rappels dus',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `const TZ = 'America/Toronto';
const now = DateTime.now().setZone(TZ);
const out = [];

for (const item of $input.all()) {
  const r = item.json;
  const start = DateTime.fromISO(r.debut).setZone(TZ).setLocale('fr');
  if (!start.isValid || start <= now) continue;

  const minutesLeft = start.diff(now, 'minutes').minutes;
  const booked = r.reserve_le ? DateTime.fromISO(r.reserve_le) : now;
  const hoursBookedAhead = start.diff(booked, 'hours').hours;

  let type = null;
  let envoyer = false;
  if (!r.rappel_2h && minutesLeft <= 120) {
    type = '2h';
    // Pas de rappel H-2 si le RDV a été pris moins de 3 h avant : la confirmation vient de partir
    envoyer = hoursBookedAhead >= 3 && minutesLeft >= 10;
  } else if (!r.rappel_veille && minutesLeft <= 24 * 60) {
    type = 'veille';
    // Pas de rappel J-1 si le RDV a été pris moins de 26 h avant
    envoyer = hoursBookedAhead >= 26;
  }
  if (!type) continue;

  const quand = start.hasSame(now, 'day')
    ? "aujourd'hui"
    : start.hasSame(now.plus({ days: 1 }), 'day')
      ? 'demain, ' + start.toFormat('cccc d LLLL')
      : 'le ' + start.toFormat('cccc d LLLL');

  out.push({
    json: {
      id: r.id,
      type,
      envoyer,
      prenom: r.prenom,
      courriel: r.courriel,
      whatsapp: String(r.whatsapp || '').replace(/[^0-9]/g, ''),
      quand,
      heure: start.toFormat("H'h'mm"),
      reprogrammer_url: r.reprogrammer_url,
      rappel_veille: true,
      rappel_2h: type === '2h' ? true : !!r.rappel_2h
    }
  });
}

return out;`
    }
  },
  output: [{ id: 1, type: 'veille', envoyer: true, prenom: 'Marie', courriel: 'marie@example.com', whatsapp: '15145551234', quand: 'demain, jeudi 30 octobre', heure: '10h00', reprogrammer_url: 'https://calendly.com/reschedulings/BBB', rappel_veille: true, rappel_2h: false }]
});

const shouldSend = ifElse({
  version: 2.2,
  config: {
    name: 'Rappel à envoyer ?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.envoyer }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const whatsappReminder = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WhatsApp : rappel',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'sendTemplate',
      phoneNumberId: placeholder('ID du numéro WhatsApp Business (Meta)'),
      recipientPhoneNumber: expr("{{ $('Calculer les rappels dus').item.json.whatsapp }}"),
      template: placeholder('Modèle approuvé de rappel, ex. perinea_rappel|fr'),
      components: {
        component: [{
          type: 'body',
          bodyParameters: {
            parameter: [
              { type: 'text', text: expr("{{ $('Calculer les rappels dus').item.json.prenom }}") },
              { type: 'text', text: expr("{{ $('Calculer les rappels dus').item.json.quand }}") },
              { type: 'text', text: expr("{{ $('Calculer les rappels dus').item.json.heure }}") },
              { type: 'text', text: expr("+{{ $('Calculer les rappels dus').item.json.whatsapp }}") },
              { type: 'text', text: expr("{{ $('Calculer les rappels dus').item.json.reprogrammer_url }}") }
            ]
          }
        }]
      }
    },
    credentials: { whatsAppApi: newCredential('WhatsApp Périnéa') }
  },
  output: [{ messaging_product: 'whatsapp', messages: [{ id: 'wamid.YYY' }] }]
});

const emailReminder = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: 'Courriel : rappel',
    onError: 'continueRegularOutput',
    parameters: {
      operation: 'send',
      fromEmail: placeholder('Expéditeur, ex. Périnéa <bonjour@perinea.ca>'),
      toEmail: expr("{{ $('Calculer les rappels dus').item.json.courriel }}"),
      subject: expr("Rappel : votre entretien Périnéa {{ $('Calculer les rappels dus').item.json.quand }} à {{ $('Calculer les rappels dus').item.json.heure }}"),
      emailFormat: 'html',
      html: expr("<div style=\"font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#2a2f45;max-width:560px\">" +
        "<p>Bonjour {{ $('Calculer les rappels dus').item.json.prenom }},</p>" +
        "<p>Petit rappel : votre entretien d'information Périnéa a lieu <b>{{ $('Calculer les rappels dus').item.json.quand }} à {{ $('Calculer les rappels dus').item.json.heure }}</b> (heure du Québec).</p>" +
        "<p>Un membre de l'équipe vous appellera au <b>+{{ $('Calculer les rappels dus').item.json.whatsapp }}</b>. L'échange dure environ 30 minutes : prévoyez un moment au calme.</p>" +
        "<p>Un empêchement ? <a href=\"{{ $('Calculer les rappels dus').item.json.reprogrammer_url }}\" style=\"color:#e0375f\">Déplacez votre rendez-vous ici</a>.</p>" +
        "<p>À très bientôt,<br>L'équipe Périnéa</p>" +
        "<p style=\"font-size:12px;color:#646a82\">Cet échange est uniquement consacré à la présentation du programme Périnéa. Il ne constitue pas une consultation médicale.</p></div>"),
      options: { appendAttribution: false }
    },
    credentials: { smtp: newCredential('SMTP Périnéa') }
  },
  output: [{ accepted: ['marie@example.com'] }]
});

const markReminder = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Noter le rappel comme fait',
    parameters: {
      resource: 'row',
      operation: 'update',
      dataTableId: rdvTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: expr("{{ $('Calculer les rappels dus').item.json.id }}") }] },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          rappel_veille: expr("{{ $('Calculer les rappels dus').item.json.rappel_veille }}"),
          rappel_2h: expr("{{ $('Calculer les rappels dus').item.json.rappel_2h }}")
        },
        matchingColumns: [],
        schema: [
          { id: 'rappel_veille', displayName: 'rappel_veille', type: 'boolean', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true },
          { id: 'rappel_2h', displayName: 'rappel_2h', type: 'boolean', required: false, display: true, defaultMatch: false, canBeUsedToMatch: true }
        ]
      },
      options: {}
    }
  },
  output: [{ id: 1, createdAt: '2026-10-27T14:05:00.000Z', updatedAt: '2026-10-29T14:00:00.000Z' }]
});

const setupNote = sticky(
  '## Périnéa : leads, RDV et rappels\n\n' +
  '**À brancher avant d\'activer :**\n' +
  '1. Credentials : SMTP Périnéa, Calendly Périnéa (forfait payant, nécessaire aux webhooks), WhatsApp Périnéa (Meta Cloud API).\n' +
  '2. Les champs jaunes : expéditeur, courriel de l\'équipe, ID du numéro WhatsApp, noms des 2 modèles WhatsApp approuvés.\n' +
  '3. Copier l\'URL de production du webhook « Lead du site Périnéa » dans FORM_ENDPOINT (main.js du site).\n\n' +
  '**Modèles WhatsApp (catégorie Utilité), 5 variables :** {{1}} prénom, {{2}} quand, {{3}} heure, {{4}} numéro, {{5}} lien pour déplacer.\n\n' +
  'Rappels : 24 h et 2 h avant le RDV, par WhatsApp et courriel. Données dans les tables perinea_leads et perinea_rdv.',
  [],
  { color: 4, width: 520, height: 340 }
);

export default workflow('perinea-leads-rdv-rappels', 'Périnéa — leads, RDV et rappels WhatsApp/courriel')
  .add(leadWebhook)
  .to(normalizeLead)
  .to(routeLead
    .onCase(0, saveLead.to(alertTeam))
    .onCase(1, markLeadBooked))
  .add(calendlyTrigger)
  .to(normalizeBooking)
  .to(routeCalendly
    .onCase(0, saveRdv.to(whatsappConfirm).to(linkLead))
    .onCase(1, cancelRdv))
  .add(everyTenMinutes)
  .to(getActiveRdv)
  .to(computeDue)
  .to(shouldSend
    .onTrue(whatsappReminder.to(emailReminder).to(markReminder))
    .onFalse(markReminder))
  .add(setupNote)
  .group('Leads du site', [normalizeLead, routeLead, saveLead, alertTeam, markLeadBooked], {
    description: 'Enregistre chaque lead du questionnaire, alerte la vente, puis marque le lead quand il réserve'
  })
  .group('Rendez-vous Calendly', [normalizeBooking, routeCalendly, saveRdv, whatsappConfirm, linkLead, cancelRdv], {
    description: 'Enregistre le RDV, le relie au lead, envoie la confirmation WhatsApp ; marque les annulations'
  })
  .group('Rappels J-1 et H-2', [getActiveRdv, computeDue, shouldSend, whatsappReminder, emailReminder, markReminder], {
    description: 'Toutes les 10 min : rappel WhatsApp + courriel 24 h et 2 h avant chaque RDV actif, une seule fois'
  });
