import { apiGet, apiPost } from './api.js';
import { toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let coupleEl, emailEl, phoneEl;
let dateLondonEl, dateLondon2El, datePerthEl;
let locLondonEl, locPerthEl, notesEl;

async function loadWedding() {
  const data = await apiGet('/admin/api/wedding', { loadingLabel: 'Loading wedding settings…' });
  const w = data || {};

  coupleEl.value = w.couple || '';
  emailEl.value = w.contactEmail || '';
  phoneEl.value = w.contactPhone || '';

  dateLondonEl.value = w.dateLondon || '';
  dateLondon2El.value = w.dateLondon2 || '';
  datePerthEl.value = w.datePerth || '';

  locLondonEl.value = w.locLondon || '';
  locPerthEl.value = w.locPerth || '';
  notesEl.value = w.notes || '';
}

async function saveWedding() {
  const body = {
    couple: coupleEl.value.trim(),
    contactEmail: emailEl.value.trim(),
    contactPhone: phoneEl.value.trim(),
    dateLondon: dateLondonEl.value || null,
    dateLondon2: dateLondon2El.value || null,
    datePerth: datePerthEl.value || null,
    locLondon: locLondonEl.value.trim(),
    locPerth: locPerthEl.value.trim(),
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

function initAccordion() {
  document.querySelectorAll('.settings-accordion').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const panel = btn.nextElementSibling;
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });
  });
}

export function initWedding() {
  initAccordion();

  coupleEl = document.getElementById('wed-couple');
  emailEl = document.getElementById('wed-contact-email');
  phoneEl = document.getElementById('wed-contact-phone');

  dateLondonEl = document.getElementById('wed-date-london');
  dateLondon2El = document.getElementById('wed-date-london2');
  datePerthEl = document.getElementById('wed-date-perth');

  locLondonEl = document.getElementById('wed-loc-london');
  locPerthEl = document.getElementById('wed-loc-perth');
  notesEl = document.getElementById('wed-notes');

  document.getElementById('wed-save')?.addEventListener('click', saveWedding);
  document.getElementById('wed-reset')?.addEventListener('click', resetWedding);

  loadWedding();
}
