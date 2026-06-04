
import { apiGet, apiPost } from './api.js';
import { toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let coupleEl, emailEl, phoneEl;
let dateEngagementEl, dateWeddingEl, dateCelebrationEl;
let notesEl;

function initAccordion() {
  document.querySelectorAll('.settings-accordion').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const panel = btn.nextElementSibling;
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });
  });
}

async function loadWedding() {
  const data = await apiGet('/admin/api/wedding', { loadingLabel: 'Loading wedding settings…' });
  const w = data || {};
  coupleEl.value = w.couple || '';
  emailEl.value = w.contactEmail || '';
  phoneEl.value = w.contactPhone || '';
  dateEngagementEl.value = w.dateEngagement || '';
  dateWeddingEl.value = w.dateWedding || '';
  dateCelebrationEl.value = w.dateCelebration || '';
  notesEl.value = w.notes || '';
}

async function saveWedding() {
  const body = {
    couple: coupleEl.value.trim(),
    contactEmail: emailEl.value.trim(),
    contactPhone: phoneEl.value.trim(),
    dateEngagement: dateEngagementEl.value || null,
    dateWedding: dateWeddingEl.value || null,
    dateCelebration: dateCelebrationEl.value || null,
    notes: notesEl.value
  };
  await apiPost('/admin/api/wedding/save', body, { loadingLabel: 'Saving wedding settings…' });
  toast('Wedding settings saved', { type: 'success' });
  bus.emit('wedding:updated', body);
}

async function resetWedding() {
  await apiPost('/admin/api/wedding/reset', {}, { loadingLabel: 'Restoring defaults…' });
  toast('Wedding settings reset', { type: 'success' });
  await loadWedding();
}

export function initWedding() {
  initAccordion();

  coupleEl = document.getElementById('wed-couple');
  emailEl = document.getElementById('wed-contact-email');
  phoneEl = document.getElementById('wed-contact-phone');
  dateEngagementEl = document.getElementById('wed-date-engagement');
  dateWeddingEl = document.getElementById('wed-date-wedding');
  dateCelebrationEl = document.getElementById('wed-date-celebration');
  notesEl = document.getElementById('wed-notes');

  document.getElementById('wed-save')?.addEventListener('click', saveWedding);
  document.getElementById('wed-reset')?.addEventListener('click', resetWedding);

  loadWedding();
}
