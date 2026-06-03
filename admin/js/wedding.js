import { apiGet, apiPost } from './api.js';
import { toast, openModal, closeModal } from '../core/ui.js';
import { bus } from '../core/bus.js';

let coupleEl, emailEl, phoneEl;
let dateEngagementEl, dateWeddingEl, dateCelebrationEl;
let notesEl;

let locations = [];
let locationsTbody;
let locModal, locModalTitle;
let locIdEl, locNameEl, locMapsEl, locWebEl;
let locAddBtn, locSaveBtn, locCancelBtn;
let editingLocId = null;

const ICON_PENCIL = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg>";
const ICON_BIN = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg>";

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

  // New fields (with backward-compatible fallbacks)
  dateEngagementEl.value = w.dateEngagement || '';
  dateWeddingEl.value = w.dateWedding || w.dateLondon || '';
  dateCelebrationEl.value = w.dateCelebration || w.dateLondon2 || w.datePerth || '';

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

// -------- Locations manager --------
async function loadLocations() {
  const data = await apiGet('/admin/api/locations', { loadingLabel: 'Loading locations…' });
  locations = Array.isArray(data) ? data : [];
  locations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderLocations();
  bus.emit('locations:updated', locations);
}

function renderLocations() {
  if (!locationsTbody) return;
  locationsTbody.innerHTML = '';

  if (!locations.length) {
    locationsTbody.innerHTML = `<tr><td colspan="4" class="muted" style="text-align:center; padding:20px 10px;">No locations yet. Use + to add one.</td></tr>`;
    return;
  }

  locations.forEach(loc => {
    const tr = document.createElement('tr');
    const maps = loc.mapsUrl ? `<a href="${escapeAttr(loc.mapsUrl)}" target="_blank" rel="noreferrer">Maps</a>` : '—';
    const web = loc.website ? `<a href="${escapeAttr(loc.website)}" target="_blank" rel="noreferrer">Website</a>` : '—';

    tr.innerHTML = `
      <td>${escapeHtml(loc.name ?? '')}</td>
      <td>${maps}</td>
      <td>${web}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${loc.id}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="button delete-btn" data-action="del" data-id="${loc.id}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;

    locationsTbody.appendChild(tr);
  });
}

function openLocAdd() {
  editingLocId = null;
  locModalTitle.textContent = 'Add Location';
  locIdEl.value = '';
  locNameEl.value = '';
  locMapsEl.value = '';
  locWebEl.value = '';
  openModal(locModal);
}

function openLocEdit(id) {
  const loc = locations.find(x => x.id === id);
  if (!loc) return;
  editingLocId = loc.id;
  locModalTitle.textContent = 'Edit Location';
  locIdEl.value = loc.id;
  locNameEl.value = loc.name ?? '';
  locMapsEl.value = loc.mapsUrl ?? '';
  locWebEl.value = loc.website ?? '';
  openModal(locModal);
}

async function saveLocation() {
  const body = {
    id: editingLocId,
    name: locNameEl.value.trim(),
    mapsUrl: locMapsEl.value.trim(),
    website: locWebEl.value.trim()
  };

  if (!body.name) {
    toast('Location name is required', { type: 'warn' });
    return;
  }

  await apiPost('/admin/api/locations/save', body, { loadingLabel: 'Saving location…' });
  toast('Location saved', { type: 'success' });
  closeModal(locModal);
  await loadLocations();
}

async function deleteLocation(id) {
  if (!id) return;
  if (!confirm('Delete this location?')) return;
  await apiPost(`/admin/api/locations/delete/${encodeURIComponent(id)}`, {}, { loadingLabel: 'Deleting location…' });
  toast('Location deleted', { type: 'success' });
  await loadLocations();
}

function onLocationsClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openLocEdit(id);
  if (action === 'del') deleteLocation(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
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

  // Locations
  locationsTbody = document.getElementById('locations-table-body');
  locAddBtn = document.getElementById('add-location-btn');
  locModal = document.getElementById('location-modal');
  locModalTitle = document.getElementById('location-modal-title');
  locIdEl = document.getElementById('location-id');
  locNameEl = document.getElementById('location-name');
  locMapsEl = document.getElementById('location-maps');
  locWebEl = document.getElementById('location-website');
  locSaveBtn = document.getElementById('location-save');
  locCancelBtn = document.getElementById('location-cancel');

  locAddBtn?.addEventListener('click', openLocAdd);
  locSaveBtn?.addEventListener('click', saveLocation);
  locCancelBtn?.addEventListener('click', () => closeModal(locModal));
  locationsTbody?.addEventListener('click', onLocationsClick);

  loadWedding();
  loadLocations();
}
