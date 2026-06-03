import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let contacts = [];

let tableBody, addBtn, importBtn, importFile;
let modal, deleteModal;
let modalTitle;
let idEl, nameEl, roleEl, emailEl, phoneEl, notesEl;
let saveBtn, cancelBtn, confirmDeleteBtn, cancelDeleteBtn;
let deleteId = null;

const ICON_PENCIL = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg>";
const ICON_COPY = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 3h9v11H7V3z' stroke='currentColor' stroke-width='2'/><path d='M4 6H3v11h9v-1' stroke='currentColor' stroke-width='2'/></svg>";
const ICON_BIN = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg>";

async function loadContacts() {
  const data = await apiGet('/admin/api/contacts', { loadingLabel: 'Loading contacts…' });
  contacts = Array.isArray(data) ? data : [];
  contacts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  render();
  bus.emit('contacts:updated', contacts);
}

function render() {
  tableBody.innerHTML = '';
  if (!contacts.length) {
    tableBody.innerHTML = `<tr><td colspan="5" class="muted" style="text-align:center; padding:40px 10px;">No contacts added yet.</td></tr>`;
    return;
  }

  contacts.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.name ?? '')}</td>
      <td>${escapeHtml(c.role ?? '')}</td>
      <td>${escapeHtml(c.email ?? '—')}</td>
      <td>${escapeHtml(c.phone ?? '—')}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${c.id}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="button dup-btn" data-action="dup" data-id="${c.id}" aria-label="Duplicate">${ICON_COPY}</button>
        <button class="button delete-btn" data-action="del" data-id="${c.id}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openAdd() {
  idEl.value = '';
  modalTitle.textContent = 'Add Contact';
  nameEl.value = '';
  roleEl.value = '';
  emailEl.value = '';
  phoneEl.value = '';
  notesEl.value = '';
  openModal(modal);
}

function openEdit(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  idEl.value = c.id;
  modalTitle.textContent = 'Edit Contact';
  nameEl.value = c.name ?? '';
  roleEl.value = c.role ?? '';
  emailEl.value = c.email ?? '';
  phoneEl.value = c.phone ?? '';
  notesEl.value = c.notes ?? '';
  openModal(modal);
}

async function save() {
  const body = {
    id: idEl.value || null,
    name: nameEl.value.trim(),
    role: roleEl.value.trim(),
    email: emailEl.value.trim(),
    phone: phoneEl.value.trim(),
    notes: notesEl.value
  };
  await apiPost('/admin/api/contacts/save', body, { loadingLabel: 'Saving contact…' });
  toast('Contact saved', { type: 'success' });
  closeModal(modal);
  await loadContacts();
}

async function duplicate(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  const maxOrder = contacts.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), 0);
  const copy = { ...c, id: crypto.randomUUID(), name: `${c.name ?? 'Contact'} (copy)`, order: maxOrder + 1 };
  await apiPost('/admin/api/contacts/save', copy, { loadingLabel: 'Duplicating contact…' });
  toast('Contact duplicated', { type: 'success' });
  await loadContacts();
}

function askDelete(id) {
  deleteId = id;
  openModal(deleteModal);
}

async function confirmDelete() {
  if (!deleteId) return;
  await apiPost(`/admin/api/contacts/delete/${encodeURIComponent(deleteId)}`, {}, { loadingLabel: 'Deleting contact…' });
  toast('Contact deleted', { type: 'success' });
  closeModal(deleteModal);
  deleteId = null;
  await loadContacts();
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

function parseCsv(text) {
  const out = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      field = '';
      // trim CR
      row = row.map(v => (v.endsWith('\r') ? v.slice(0, -1) : v));
      // ignore empty trailing lines
      if (row.some(v => String(v).trim() !== '')) out.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  row.push(field);
  row = row.map(v => (v.endsWith('\r') ? v.slice(0, -1) : v));
  if (row.some(v => String(v).trim() !== '')) out.push(row);
  return out;
}

function normaliseHeader(h) {
  return String(h || '').trim().toLowerCase();
}

async function importContactsFromCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) {
    toast('CSV is empty', { type: 'warn' });
    return;
  }

  const headers = rows[0].map(normaliseHeader);
  const idx = {
    name: headers.indexOf('name'),
    role: headers.indexOf('role'),
    email: headers.indexOf('email'),
    phone: headers.indexOf('phone'),
    notes: headers.indexOf('notes')
  };

  if (idx.name === -1) {
    toast('CSV must include a name column', { type: 'error' });
    return;
  }

  const maxOrder = contacts.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), 0);
  let order = maxOrder;
  const newItems = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[idx.name] ?? '').trim();
    if (!name) continue;

    const item = {
      id: crypto.randomUUID(),
      name,
      role: idx.role >= 0 ? String(r[idx.role] ?? '').trim() : '',
      email: idx.email >= 0 ? String(r[idx.email] ?? '').trim() : '',
      phone: idx.phone >= 0 ? String(r[idx.phone] ?? '').trim() : '',
      notes: idx.notes >= 0 ? String(r[idx.notes] ?? '').trim() : '',
      order: ++order
    };

    newItems.push(item);
  }

  if (!newItems.length) {
    toast('No rows imported (check CSV values)', { type: 'warn' });
    return;
  }

  // save each item (spreads writes, avoids hot-key patterns)
  for (const item of newItems) {
    await apiPost('/admin/api/contacts/save', item, { loadingLabel: 'Importing contacts…' });
  }

  toast(`Imported ${newItems.length} contact(s)`, { type: 'success' });
  await loadContacts();
}

function onImportClick() {
  importFile.value = '';
  importFile.click();
}

async function onImportFileChange() {
  const file = importFile.files && importFile.files[0];
  if (!file) return;
  if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
    toast('Please choose a .csv file', { type: 'warn' });
    return;
  }
  await importContactsFromCsv(file);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export async function initContacts() {
  tableBody = document.getElementById('contacts-table-body');
  addBtn = document.getElementById('add-contact-btn');
  importBtn = document.getElementById('import-contacts-btn');
  importFile = document.getElementById('contacts-import-file');

  modal = document.getElementById('contact-modal');
  deleteModal = document.getElementById('contact-delete-modal');
  modalTitle = document.getElementById('contact-modal-title');

  idEl = document.getElementById('contact-id');
  nameEl = document.getElementById('contact-name');
  roleEl = document.getElementById('contact-role');
  emailEl = document.getElementById('contact-email');
  phoneEl = document.getElementById('contact-phone');
  notesEl = document.getElementById('contact-notes');

  saveBtn = document.getElementById('contact-save');
  cancelBtn = document.getElementById('contact-cancel');
  confirmDeleteBtn = document.getElementById('contact-confirm-delete');
  cancelDeleteBtn = document.getElementById('contact-cancel-delete');

  if (!tableBody || !addBtn) return;

  addBtn.addEventListener('click', openAdd);
  importBtn?.addEventListener('click', onImportClick);
  importFile?.addEventListener('change', onImportFileChange);

  saveBtn?.addEventListener('click', save);
  cancelBtn?.addEventListener('click', () => closeModal(modal));

  confirmDeleteBtn?.addEventListener('click', confirmDelete);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  tableBody.addEventListener('click', onTableClick);

  loadContacts();
}
