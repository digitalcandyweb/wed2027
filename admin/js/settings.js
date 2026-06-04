import { apiGet, apiPost } from './api.js';
import { toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let settings = {};
let events = [];
let eventBlocksContainer;

function splitEmails(text) {
  return String(text || '')
    .split(/\r?\n|,/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function joinEmails(list) {
  return Array.isArray(list) ? list.join('\n') : '';
}

async function loadEvents() {
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  events = Array.isArray(data) ? data : [];
  renderEventBlocks();
}

function renderEventBlocks() {
  if (!eventBlocksContainer) return;

  const container = eventBlocksContainer;
  const hint = container.querySelector('.settings-hint');
  const actions = container.querySelector('.settings-actions');

  container.innerHTML = '';
  if (hint) container.appendChild(hint);
  if (actions) container.appendChild(actions);

  if (!events.length) {
    const p = document.createElement('p');
    p.className = 'settings-hint';
    p.textContent = 'No events found.';
    container.appendChild(p);
    return;
  }

  const blocks = settings.eventBlocks || {};
  events.forEach(ev => {
    const block = blocks[ev.id] || {};
    const wrap = document.createElement('div');
    wrap.className = 'event-block-editor';
    wrap.innerHTML = `
      <h4>${escapeHtml(ev.name ?? ev.id)}</h4>
      <label>Description</label>
      <textarea class="input event-desc" data-id="${escapeAttr(ev.id)}"></textarea>
      <label>Schedule</label>
      <textarea class="input event-schedule" data-id="${escapeAttr(ev.id)}"></textarea>
      <label>Notes</label>
      <textarea class="input event-notes" data-id="${escapeAttr(ev.id)}"></textarea>
    `;
    container.appendChild(wrap);

    wrap.querySelector('.event-desc').value = block.description || '';
    wrap.querySelector('.event-schedule').value = block.schedule || '';
    wrap.querySelector('.event-notes').value = block.notes || '';
  });
}

async function loadSettings() {
  const data = await apiGet('/admin/api/settings', { loadingLabel: 'Loading settings…' });
  settings = (data && typeof data === 'object') ? data : {};

  setVal('set-site-title', settings.siteTitle);
  setVal('set-footer-text', settings.footerText);
  setVal('set-accent', settings.accent || '#ff3366');
  setVal('set-hero-title', settings.heroTitle);
  setVal('set-hero-subtitle', settings.heroSubtitle);
  setVal('set-hero-description', settings.heroDescription);
  setVal('set-travel-overview', settings.travelOverview);
  setVal('set-travel-airports', settings.travelAirports);
  setVal('set-travel-transport', settings.travelTransport);
  setVal('set-accom-overview', settings.accomOverview);
  setVal('set-accom-hotels', settings.accomHotels);
  setVal('set-faq', settings.faq);
  setVal('set-custom-1', settings.custom1);
  setVal('set-custom-2', settings.custom2);

  // RBAC
  const rbac = settings.adminAccess || {};
  setVal('set-rbac-enabled', rbac.enabled !== false);
  setVal('set-admin-emails', joinEmails(rbac.adminEmails));
  setVal('set-limited-emails', joinEmails(rbac.limitedEmails));

  if (events.length) renderEventBlocks();
}

async function saveSettings() {
  const body = {
    ...(settings || {}),
    siteTitle: getVal('set-site-title'),
    footerText: getVal('set-footer-text'),
    accent: getVal('set-accent'),
    heroTitle: getVal('set-hero-title'),
    heroSubtitle: getVal('set-hero-subtitle'),
    heroDescription: getVal('set-hero-description'),
    travelOverview: getVal('set-travel-overview'),
    travelAirports: getVal('set-travel-airports'),
    travelTransport: getVal('set-travel-transport'),
    accomOverview: getVal('set-accom-overview'),
    accomHotels: getVal('set-accom-hotels'),
    faq: getVal('set-faq'),
    custom1: getVal('set-custom-1'),
    custom2: getVal('set-custom-2'),
    eventBlocks: {}
  };

  // RBAC config
  const enabledEl = document.getElementById('set-rbac-enabled');
  body.adminAccess = {
    enabled: enabledEl ? enabledEl.checked : true,
    adminEmails: splitEmails(getVal('set-admin-emails')),
    limitedEmails: splitEmails(getVal('set-limited-emails')),
  };

  // Preserve eventBlocks content
  events.forEach(ev => {
    body.eventBlocks[ev.id] = {
      description: document.querySelector(`.event-desc[data-id="${ev.id}"]`)?.value || '',
      schedule: document.querySelector(`.event-schedule[data-id="${ev.id}"]`)?.value || '',
      notes: document.querySelector(`.event-notes[data-id="${ev.id}"]`)?.value || ''
    };
  });

  await apiPost('/admin/api/settings/save', body, { loadingLabel: 'Saving settings…' });
  toast('Settings saved', { type: 'success' });
  settings = body;
}

async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  await apiPost('/admin/api/settings/reset', {}, { loadingLabel: 'Resetting settings…' });
  toast('Settings reset', { type: 'success' });
  await loadSettings();
}

function initAccordion() {
  document.querySelectorAll('.settings-accordion').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const panel = btn.nextElementSibling;
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });
  });
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = Boolean(val);
    return;
  }
  el.value = val ?? '';
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  if (el.type === 'checkbox') return el.checked;
  return el.value ?? '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/\s+/g, ' ').trim(); }

export function initSettings() {
  eventBlocksContainer = document.getElementById('settings-event-blocks');
  initAccordion();
  document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
  document.getElementById('settings-reset-btn')?.addEventListener('click', resetSettings);
  loadEvents();
  loadSettings();

  bus.on('events:updated', async (evs) => {
    events = Array.isArray(evs) ? evs : events;
    renderEventBlocks();
  });
}