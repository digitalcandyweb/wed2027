import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let tasks = [];
let events = [];
let taskToDelete = null;

let tableBody, addBtn, modal, modalTitle;
let idInput, titleInput, descInput, dueInput, assignedInput, priorityInput, statusInput, eventInput, notesInput;
let saveBtn, cancelBtn;
let deleteModal, confirmDeleteBtn, cancelDeleteBtn;
let statusFilter, assignedFilter;

async function loadEvents() {
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  events = Array.isArray(data) ? data : [];
  events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (eventInput) {
    eventInput.innerHTML = `<option value="">None</option>`;
    events.forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev.id;
      opt.textContent = ev.name ?? ev.id;
      eventInput.appendChild(opt);
    });
  }
}

async function loadTasks() {
  if (!tableBody) return;
  const data = await apiGet('/admin/api/planner', { loadingLabel: 'Loading tasks…' });
  tasks = Array.isArray(data) ? data : [];
  tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderTable();
}

function getEventName(id) {
  const ev = events.find(e => e.id === id);
  return ev ? ev.name : '—';
}

function renderTable() {
  if (!tableBody) return;
  const statusVal = statusFilter?.value || '';
  const assignedVal = assignedFilter?.value || '';

  const filtered = tasks.filter(t => {
    const matchStatus = !statusVal || t.status === statusVal;
    const matchAssigned = !assignedVal || t.assigned === assignedVal;
    return matchStatus && matchAssigned;
  });

  tableBody.innerHTML = '';
  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center; padding:40px 10px;">No tasks match your filters.</td></tr>`;
    return;
  }

  filtered.forEach(t => {
    const overdue = t.due && new Date(t.due) < new Date() && t.status !== 'done';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(t.title ?? '')}${overdue ? ' <span class="pill" style="border-color:var(--danger);color:var(--danger);">Overdue</span>' : ''}</td>
      <td>${t.due ?? '—'}</td>
      <td>${escapeHtml(t.assigned ?? '—')}</td>
      <td>${escapeHtml(t.priority ?? '—')}</td>
      <td>${escapeHtml(t.status ?? '—')}</td>
      <td>${escapeHtml(getEventName(t.event))}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${t.id}" aria-label="Edit"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg></button>
        <button class="button dup-btn" data-action="dup" data-id="${t.id}" aria-label="Duplicate"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 3h9v11H7V3z' stroke='currentColor' stroke-width='2'/><path d='M4 6H3v11h9v-1' stroke='currentColor' stroke-width='2'/></svg></button>
        <button class="button delete-btn" data-action="del" data-id="${t.id}" aria-label="Delete"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg></button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function openAdd() {
  if (modalTitle) modalTitle.textContent = 'Add Task';
  idInput.value = '';
  titleInput.value = '';
  descInput.value = '';
  dueInput.value = '';
  assignedInput.value = 'brad';
  priorityInput.value = 'medium';
  statusInput.value = 'todo';
  eventInput.value = '';
  notesInput.value = '';
  openModal(modal);
}

function openEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  if (modalTitle) modalTitle.textContent = 'Edit Task';
  idInput.value = t.id;
  titleInput.value = t.title ?? '';
  descInput.value = t.description ?? '';
  dueInput.value = t.due ?? '';
  assignedInput.value = t.assigned ?? 'brad';
  priorityInput.value = t.priority ?? 'medium';
  statusInput.value = t.status ?? 'todo';
  eventInput.value = t.event ?? '';
  notesInput.value = t.notes ?? '';
  openModal(modal);
}

async function saveTask() {
  const body = {
    id: idInput.value || null,
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    due: dueInput.value || null,
    assigned: assignedInput.value,
    priority: priorityInput.value,
    status: statusInput.value,
    event: eventInput.value || null,
    notes: notesInput.value.trim()
  };
  await apiPost('/admin/api/planner/save', body, { loadingLabel: 'Saving task…' });
  toast('Task saved', { type: 'success' });
  closeModal(modal);
  await loadTasks();
}

function openDelete(id) {
  taskToDelete = id;
  openModal(deleteModal);
}

async function deleteTask() {
  if (!taskToDelete) return;
  await apiPost(`/admin/api/planner/delete/${encodeURIComponent(taskToDelete)}`, {}, { loadingLabel: 'Deleting task…' });
  toast('Task deleted', { type: 'success' });
  closeModal(deleteModal);
  taskToDelete = null;
  await loadTasks();
}

async function duplicateTask(id) {
  const original = tasks.find(t => t.id === id);
  if (!original) return;
  const copy = {
    ...original,
    id: crypto.randomUUID(),
    title: `${original.title ?? 'Task'} (copy)`,
    order: (tasks.length ? Math.max(...tasks.map(x => x.order ?? 0)) : 0) + 1
  };
  await apiPost('/admin/api/planner/save', copy, { loadingLabel: 'Duplicating task…' });
  toast('Task duplicated', { type: 'success' });
  await loadTasks();
}

function onTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openEdit(id);
  if (action === 'del') openDelete(id);
  if (action === 'dup') duplicateTask(id);
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

export async function initPlanner() {
  tableBody = document.getElementById('planner-table-body');
  addBtn = document.getElementById('add-task-btn');
  modal = document.getElementById('planner-modal');
  modalTitle = document.getElementById('planner-modal-title');

  idInput = document.getElementById('task-id');
  titleInput = document.getElementById('task-title');
  descInput = document.getElementById('task-description');
  dueInput = document.getElementById('task-due');
  assignedInput = document.getElementById('task-assigned');
  priorityInput = document.getElementById('task-priority');
  statusInput = document.getElementById('task-status');
  eventInput = document.getElementById('task-event');
  notesInput = document.getElementById('task-notes');

  saveBtn = document.getElementById('save-task-btn');
  cancelBtn = document.getElementById('cancel-task-btn');

  deleteModal = document.getElementById('planner-delete-modal');
  confirmDeleteBtn = document.getElementById('confirm-delete-task-btn');
  cancelDeleteBtn = document.getElementById('cancel-delete-task-btn');

  statusFilter = document.getElementById('planner-status-filter');
  assignedFilter = document.getElementById('planner-assigned-filter');

  if (!tableBody || !addBtn || !modal) return;

  addBtn.addEventListener('click', openAdd);
  saveBtn?.addEventListener('click', saveTask);
  cancelBtn?.addEventListener('click', () => closeModal(modal));

  confirmDeleteBtn?.addEventListener('click', deleteTask);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  statusFilter?.addEventListener('change', renderTable);
  assignedFilter?.addEventListener('change', renderTable);

  tableBody.addEventListener('click', onTableClick);

  await loadEvents();
  await loadTasks();

  bus.on('events:updated', async () => {
    await loadEvents();
    renderTable();
  });
}
