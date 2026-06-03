import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let vendors = [];
let events = [];

let tableBody, addBtn;
let modal, deleteModal;
let modalTitle;
let idEl, nameEl, catEl, emailEl, phoneEl, webEl, notesEl;
let saveBtn, cancelBtn, confirmDeleteBtn, cancelDeleteBtn;
let deleteId = null;

const ICON_PENCIL = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg>";
const ICON_COPY = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 3h9v11H7V3z' stroke='currentColor' stroke-width='2'/><path d='M4 6H3v11h9v-1' stroke='currentColor' stroke-width='2'/></svg>";
const ICON_BIN = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg>";

async function loadVendors() {
  const data = await apiGet('/admin/api/vendors', { loadingLabel: 'Loading vendors…' });
  vendors = Array.isArray(data) ? data : [];
  vendors.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  render();
  bus.emit('vendors:updated', vendors);
}

async function loadEvents() {
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  events = Array.isArray(data) ? data : [];
  events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function assignedEventNames(vendorId) {
  const names = events
    .filter(e => Array.isArray(e.vendorIds) && e.vendorIds.includes(vendorId))
    .map(e => e.name ?? e.id);
  return names.length ? names.join(', ') : '—';
}

function render() {
  tableBody.innerHTML = '';
  if (!vendors.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center; padding:40px 10px;">No vendors added yet.</td></tr>`;
    return;
  }

  vendors.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(v.name ?? '')}</td>
      <td>${escapeHtml(v.category ?? '')}</td>
      <td>${escapeHtml(v.email ?? '—')}</td>
      <td>${escapeHtml(v.phone ?? '—')}</td>
      <td>${escapeHtml(assignedEventNames(v.id))}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${v.id}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="button dup-btn" data-action="dup" data-id="${v.id}" aria-label="Duplicate">${ICON_COPY}</button>
        <button class="button delete-btn" data-action="del" data-id="${v.id}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openAdd() {
  idEl.value = '';
  modalTitle.textContent = 'Add Vendor';
  nameEl.value = '';
  catEl.value = '';
  emailEl.value = '';
  phoneEl.value = '';
  webEl.value = '';
  notesEl.value = '';
  openModal(modal);
}

function openEdit(id) {
  const v = vendors.find(x => x.id === id);
  if (!v) return;
  idEl.value = v.id;
  modalTitle.textContent = 'Edit Vendor';
  nameEl.value = v.name ?? '';
  catEl.value = v.category ?? '';
  emailEl.value = v.email ?? '';
  phoneEl.value = v.phone ?? '';
  webEl.value = v.website ?? '';
  notesEl.value = v.notes ?? '';
  openModal(modal);
}

async function save() {
  const body = {
    id: idEl.value || null,
    name: nameEl.value.trim(),
    category: catEl.value.trim(),
    email: emailEl.value.trim(),
    phone: phoneEl.value.trim(),
    website: webEl.value.trim(),
    notes: notesEl.value
  };
  await apiPost('/admin/api/vendors/save', body, { loadingLabel: 'Saving vendor…' });
  toast('Vendor saved', { type: 'success' });
  closeModal(modal);
  await loadVendors();
}

async function duplicate(id) {
  const v = vendors.find(x => x.id === id);
  if (!v) return;
  const maxOrder = vendors.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), 0);
  const copy = { ...v, id: crypto.randomUUID(), name: `${v.name ?? 'Vendor'} (copy)`, order: maxOrder + 1 };
  await apiPost('/admin/api/vendors/save', copy, { loadingLabel: 'Duplicating vendor…' });
  toast('Vendor duplicated', { type: 'success' });
  await loadVendors();
}

function askDelete(id) {
  deleteId = id;
  openModal(deleteModal);
}

async function confirmDelete() {
  if (!deleteId) return;
  await apiPost(`/admin/api/vendors/delete/${encodeURIComponent(deleteId)}`, {}, { loadingLabel: 'Deleting vendor…' });
  toast('Vendor deleted', { type: 'success' });
  closeModal(deleteModal);
  deleteId = null;
  await loadVendors();
}

function onTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openEdit(id);
  if (action === 'dup') duplicate(id);
  if (action === 'del') askDelete(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export async function initVendors() {
  tableBody = document.getElementById('vendors-table-body');
  addBtn = document.getElementById('add-vendor-btn');

  modal = document.getElementById('vendor-modal');
  deleteModal = document.getElementById('vendor-delete-modal');
  modalTitle = document.getElementById('vendor-modal-title');

  idEl = document.getElementById('vendor-id');
  nameEl = document.getElementById('vendor-name');
  catEl = document.getElementById('vendor-category');
  emailEl = document.getElementById('vendor-email');
  phoneEl = document.getElementById('vendor-phone');
  webEl = document.getElementById('vendor-website');
  notesEl = document.getElementById('vendor-notes');

  saveBtn = document.getElementById('vendor-save');
  cancelBtn = document.getElementById('vendor-cancel');
  confirmDeleteBtn = document.getElementById('vendor-confirm-delete');
  cancelDeleteBtn = document.getElementById('vendor-cancel-delete');

  if (!tableBody || !addBtn) return;

  addBtn.addEventListener('click', openAdd);
  saveBtn?.addEventListener('click', save);
  cancelBtn?.addEventListener('click', () => closeModal(modal));

  confirmDeleteBtn?.addEventListener('click', confirmDelete);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  tableBody.addEventListener('click', onTableClick);

  await loadEvents();
  await loadVendors();

  bus.on('events:updated', (evs) => {
    events = Array.isArray(evs) ? evs : events;
    render();
  });
}
