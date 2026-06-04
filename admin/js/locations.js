
import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let locations = [];
let tableBody, addBtn;
let modal, modalTitle;
let idEl, nameEl, areaEl, descEl, mapsEl, webEl, photosEl;
let saveBtn, cancelBtn;
let deleteModal, confirmDeleteBtn, cancelDeleteBtn;
let deleteId = null;
let editingId = null;

const ICON_PENCIL = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg>";
const ICON_BIN = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg>";

async function loadLocations() {
  const data = await apiGet('/admin/api/locations', { loadingLabel: 'Loading locations…' });
  locations = Array.isArray(data) ? data : [];
  locations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  render();
  bus.emit('locations:updated', locations);
}

function render() {
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!locations.length) {
    tableBody.innerHTML = `<tr class="empty"><td colspan="5" class="empty">No locations yet — add your first venue.</td></tr>`;
    return;
  }

  locations.forEach(loc => {
    const web = loc.website ? `<a href="${escapeAttr(loc.website)}" target="_blank" rel="noreferrer">Website</a>` : '—';
    const maps = loc.mapsUrl ? `<a href="${escapeAttr(loc.mapsUrl)}" target="_blank" rel="noreferrer">Maps</a>` : '—';
    const photosCount = Array.isArray(loc.photoUrls) ? loc.photoUrls.length : (typeof loc.photoUrls === 'string' ? loc.photoUrls.split(/?
/).filter(Boolean).length : 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(loc.name ?? '')}${loc.area ? `<div class="muted" style="font-size:12px;">${escapeHtml(loc.area)}</div>` : ''}</td>
      <td>${web}</td>
      <td>${maps}</td>
      <td>${photosCount ? `${photosCount}` : '—'}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${loc.id}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="button delete-btn" data-action="del" data-id="${loc.id}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openAdd() {
  editingId = null;
  modalTitle.textContent = 'Add Location';
  idEl.value = '';
  nameEl.value = '';
  areaEl.value = '';
  descEl.value = '';
  mapsEl.value = '';
  webEl.value = '';
  photosEl.value = '';
  openModal(modal);
}

function openEdit(id) {
  const loc = locations.find(x => x.id === id);
  if (!loc) return;
  editingId = loc.id;
  modalTitle.textContent = 'Edit Location';
  idEl.value = loc.id;
  nameEl.value = loc.name ?? '';
  areaEl.value = loc.area ?? '';
  descEl.value = loc.description ?? '';
  mapsEl.value = loc.mapsUrl ?? '';
  webEl.value = loc.website ?? '';
  photosEl.value = Array.isArray(loc.photoUrls) ? loc.photoUrls.join('\n') : (loc.photoUrls ?? '');
  openModal(modal);
}

async function save() {
  const body = {
    id: editingId,
    name: nameEl.value.trim(),
    area: areaEl.value.trim(),
    description: descEl.value.trim(),
    mapsUrl: mapsEl.value.trim(),
    website: webEl.value.trim(),
    photoUrls: photosEl.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  };

  if (!body.name) {
    toast('Location name is required', { type: 'warn' });
    return;
  }

  await apiPost('/admin/api/locations/save', body, { loadingLabel: 'Saving location…' });
  toast('Location saved', { type: 'success' });
  closeModal(modal);
  await loadLocations();
}

function askDelete(id) {
  deleteId = id;
  openModal(deleteModal);
}

async function confirmDelete() {
  if (!deleteId) return;
  await apiPost(`/admin/api/locations/delete/${encodeURIComponent(deleteId)}`, {}, { loadingLabel: 'Deleting location…' });
  toast('Location deleted', { type: 'success' });
  closeModal(deleteModal);
  deleteId = null;
  await loadLocations();
}

function onTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openEdit(id);
  if (action === 'del') askDelete(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/\s+/g, ' ').trim();
}

export async function initLocations() {
  tableBody = document.getElementById('locations-table-body');
  addBtn = document.getElementById('add-location-btn');
  modal = document.getElementById('location-modal');
  deleteModal = document.getElementById('location-delete-modal');
  modalTitle = document.getElementById('location-modal-title');

  idEl = document.getElementById('location-id');
  nameEl = document.getElementById('location-name');
  areaEl = document.getElementById('location-area');
  descEl = document.getElementById('location-description');
  mapsEl = document.getElementById('location-maps');
  webEl = document.getElementById('location-website');
  photosEl = document.getElementById('location-photos');

  saveBtn = document.getElementById('location-save');
  cancelBtn = document.getElementById('location-cancel');

  confirmDeleteBtn = document.getElementById('location-confirm-delete');
  cancelDeleteBtn = document.getElementById('location-cancel-delete');

  if (!tableBody || !addBtn) return;

  addBtn.addEventListener('click', openAdd);
  saveBtn?.addEventListener('click', save);
  cancelBtn?.addEventListener('click', () => closeModal(modal));
  confirmDeleteBtn?.addEventListener('click', confirmDelete);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  tableBody.addEventListener('click', onTableClick);

  await loadLocations();
}
