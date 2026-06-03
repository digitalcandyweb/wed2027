import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let events = [];
let tableBody, addBtn, modal, form, cancelBtn, modalTitle;
let editingId = null;

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString();
  } catch {
    return iso;
  }
}

async function loadEvents() {
  if (!tableBody) return;
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  events = Array.isArray(data) ? data : [];
  events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderTable();
  bus.emit('events:updated', events);
}

function renderTable() {
  tableBody.innerHTML = '';

  if (!events.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7" class="muted" style="text-align:center; padding:40px 10px;">No events configured yet.</td>`;
    tableBody.appendChild(row);
    return;
  }

  events.forEach((e, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${e.order ?? (idx + 1)}</td>
      <td>${escapeHtml(e.name ?? '')}</td>
      <td>${e.date ? formatDate(e.date) : '—'}</td>
      <td>${escapeHtml(e.location ?? '')}</td>
      <td>${e.visible === false ? 'No' : 'Yes'}</td>
      <td>${escapeHtml(e.notes ?? '—')}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${e.id}" aria-label="Edit"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg></button>
        <button class="button dup-btn" data-action="dup" data-id="${e.id}" aria-label="Duplicate"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 3h9v11H7V3z' stroke='currentColor' stroke-width='2'/><path d='M4 6H3v11h9v-1' stroke='currentColor' stroke-width='2'/></svg></button>
        <button class="button delete-btn" data-action="del" data-id="${e.id}" aria-label="Delete"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg></button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function openAdd() {
  editingId = null;
  if (modalTitle) modalTitle.textContent = 'Add Event';
  form.reset();
  form.visible.checked = true;
  openModal(modal);
}

function openEdit(id) {
  const e = events.find(ev => ev.id === id);
  if (!e) return;
  editingId = e.id;
  if (modalTitle) modalTitle.textContent = 'Edit Event';
  form.name.value = e.name ?? '';
  form.date.value = e.date ?? '';
  form.location.value = e.location ?? '';
  form.venue.value = e.venue ?? '';
  form.visible.checked = e.visible !== false;
  openModal(modal);
}

async function saveEvent(ev) {
  ev.preventDefault();
  const body = {
    id: editingId,
    name: form.name.value.trim(),
    date: form.date.value || null,
    location: form.location.value.trim(),
    venue: form.venue.value.trim(),
    visible: form.visible.checked
  };

  await apiPost('/admin/api/events/save', body, { loadingLabel: 'Saving event…' });
  toast('Event saved', { type: 'success' });
  closeModal(modal);
  await loadEvents();
}

async function deleteEvent(id) {
  if (!id) return;
  if (!confirm('Delete this event?')) return;
  await apiPost(`/admin/api/events/delete/${encodeURIComponent(id)}`, {}, { loadingLabel: 'Deleting event…' });
  toast('Event deleted', { type: 'success' });
  await loadEvents();
}

async function duplicateEvent(id) {
  const original = events.find(e => e.id === id);
  if (!original) return;

  const copy = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name ?? 'Event'} (copy)`,
    order: (events.length ? Math.max(...events.map(x => x.order ?? 0)) : 0) + 1
  };

  await apiPost('/admin/api/events/save', copy, { loadingLabel: 'Duplicating event…' });
  toast('Event duplicated', { type: 'success' });
  await loadEvents();
}

function onTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openEdit(id);
  if (action === 'del') deleteEvent(id);
  if (action === 'dup') duplicateEvent(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

export function initEvents() {
  tableBody = document.getElementById('events-table-body');
  addBtn = document.getElementById('add-event-btn');
  modal = document.getElementById('event-modal');
  form = document.getElementById('event-form');
  cancelBtn = document.getElementById('event-cancel');
  modalTitle = document.getElementById('event-modal-title');

  if (!tableBody || !addBtn || !modal || !form) return;

  addBtn.addEventListener('click', openAdd);
  cancelBtn?.addEventListener('click', () => closeModal(modal));
  form.addEventListener('submit', saveEvent);
  tableBody.addEventListener('click', onTableClick);

  loadEvents();
}
