import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

// Planner (mobile cards + desktop table)
let tasks = [];
let events = [];
let taskToDelete = null;

let tableBody, cardsRoot, addBtn;
let modal, modalTitle;
let idInput, titleInput, descInput, dueInput, assignedInput, priorityInput, statusInput, eventInput, notesInput;
let saveBtn, cancelBtn;
let deleteModal, confirmDeleteBtn, cancelDeleteBtn;
let viewModal, viewCloseBtn;
let statusFilter, assignedFilter;

const ICON_VIEW = `<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M10 4c4.7 0 8.6 4 9 6-.4 2-4.3 6-9 6S1.4 12 1 10c.4-2 4.3-6 9-6z' stroke='currentColor' stroke-width='1.6'/><path d='M10 7.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z' fill='currentColor'/></svg>`;
const ICON_PENCIL = `<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg>`;
const ICON_COPY = `<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 3h9v11H7V3z' stroke='currentColor' stroke-width='2'/><path d='M4 6H3v11h9v-1' stroke='currentColor' stroke-width='2'/></svg>`;
const ICON_BIN = `<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg>`;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(v) {
  if (v === 'in_progress') return 'In progress';
  if (v === 'done') return 'Done';
  return 'To do';
}

function priorityLabel(v) {
  if (v === 'high') return 'High';
  if (v === 'low') return 'Low';
  return 'Medium';
}

function assignedLabel(v) {
  if (v === 'claire') return 'Claire';
  if (v === 'both') return 'Both';
  return 'Brad';
}

async function loadEvents() {
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  events = Array.isArray(data) ? data : [];
  events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (eventInput) {
    eventInput.innerHTML = '';
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = 'None';
    eventInput.appendChild(optNone);
    events.forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev.id;
      opt.textContent = ev.name ?? ev.id;
      eventInput.appendChild(opt);
    });
  }
}

async function loadTasks() {
  const data = await apiGet('/admin/api/planner', { loadingLabel: 'Loading tasks…' });
  tasks = Array.isArray(data) ? data : [];
  tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  render();
}

function getEventName(id) {
  if (!id) return '—';
  const ev = events.find(e => e.id === id);
  return ev ? (ev.name ?? ev.id) : '—';
}

function getFilteredTasks() {
  const statusVal = statusFilter?.value || '';
  const assignedVal = assignedFilter?.value || '';

  return tasks.filter(t => {
    const matchStatus = !statusVal || t.status === statusVal;
    const matchAssigned = !assignedVal || t.assigned === assignedVal;
    return matchStatus && matchAssigned;
  });
}

function render() {
  const filtered = getFilteredTasks();
  renderTable(filtered);
  renderCards(filtered);
}

function renderTable(rows) {
  if (!tableBody) return;

  tableBody.innerHTML = '';
  if (!rows.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="planner-empty">No tasks match your filters.</td></tr>`;
    return;
  }

  rows.forEach(t => {
    const overdue = t.due && new Date(t.due) < new Date() && t.status !== 'done';
    const dueText = fmtDate(t.due);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="planner-task-title">${escapeHtml(t.title ?? '')}${overdue ? ' <span class="planner-overdue">Overdue</span>' : ''}</div>
        ${t.description ? `<div class="planner-task-desc">${escapeHtml(t.description)}</div>` : ''}
      </td>
      <td>${escapeHtml(dueText)}</td>
      <td>${escapeHtml(assignedLabel(t.assigned))}</td>
      <td>${escapeHtml(priorityLabel(t.priority))}</td>
      <td>${escapeHtml(statusLabel(t.status))}</td>
      <td>${escapeHtml(getEventName(t.event))}</td>
      <td class="actions-col">
        <button class="icon-btn" data-action="view" data-id="${escapeHtml(t.id)}" aria-label="View">${ICON_VIEW}</button>
        <button class="icon-btn" data-action="edit" data-id="${escapeHtml(t.id)}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="icon-btn" data-action="dup" data-id="${escapeHtml(t.id)}" aria-label="Duplicate">${ICON_COPY}</button>
        <button class="icon-btn danger" data-action="del" data-id="${escapeHtml(t.id)}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderCards(rows) {
  if (!cardsRoot) return;

  cardsRoot.innerHTML = '';
  if (!rows.length) {
    cardsRoot.innerHTML = `<div class="planner-empty">No tasks match your filters.</div>`;
    return;
  }

  rows.forEach(t => {
    const overdue = t.due && new Date(t.due) < new Date() && t.status !== 'done';

    const card = document.createElement('div');
    card.className = `planner-card ${t.status === 'done' ? 'is-done' : ''}`;

    card.innerHTML = `
      <div class="planner-card-top">
        <div class="planner-card-main">
          <div class="planner-card-title">${escapeHtml(t.title ?? '')}</div>
          <div class="planner-card-meta">
            <span class="badge">${escapeHtml(statusLabel(t.status))}</span>
            <span class="dot">•</span>
            <span>${escapeHtml(priorityLabel(t.priority))}</span>
            <span class="dot">•</span>
            <span>${escapeHtml(assignedLabel(t.assigned))}</span>
          </div>
        </div>
        <div class="planner-card-actions">
          <button class="icon-btn" data-action="view" data-id="${escapeHtml(t.id)}" aria-label="View">${ICON_VIEW}</button>
          <button class="icon-btn" data-action="edit" data-id="${escapeHtml(t.id)}" aria-label="Edit">${ICON_PENCIL}</button>
        </div>
      </div>

      <div class="planner-card-body">
        ${t.description ? `<div class="planner-card-desc">${escapeHtml(t.description)}</div>` : ''}
        <div class="planner-card-row">
          <span class="label">Due</span>
          <span class="value ${overdue ? 'planner-overdue' : ''}">${escapeHtml(fmtDate(t.due))}</span>
        </div>
        <div class="planner-card-row">
          <span class="label">Linked event</span>
          <span class="value">${escapeHtml(getEventName(t.event))}</span>
        </div>
      </div>

      <div class="planner-card-footer">
        <button class="button small" data-action="dup" data-id="${escapeHtml(t.id)}" type="button">Duplicate</button>
        <button class="button small danger" data-action="del" data-id="${escapeHtml(t.id)}" type="button">Delete</button>
      </div>
    `;

    cardsRoot.appendChild(card);
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

function openView(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  viewModal.querySelector('[data-view="title"]').textContent = t.title ?? 'Task';
  viewModal.querySelector('[data-view="description"]').textContent = t.description ?? '—';
  viewModal.querySelector('[data-view="due"]').textContent = fmtDate(t.due);
  viewModal.querySelector('[data-view="assigned"]').textContent = assignedLabel(t.assigned);
  viewModal.querySelector('[data-view="priority"]').textContent = priorityLabel(t.priority);
  viewModal.querySelector('[data-view="status"]').textContent = statusLabel(t.status);
  viewModal.querySelector('[data-view="event"]').textContent = getEventName(t.event);
  viewModal.querySelector('[data-view="notes"]').textContent = t.notes ? t.notes : '—';

  openModal(viewModal);
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

  if (!body.title) {
    toast('Task title is required', { type: 'warn' });
    return;
  }

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

  const maxOrder = tasks.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), 0);
  const copy = {
    ...original,
    id: crypto.randomUUID(),
    title: `${original.title ?? 'Task'} (copy)`,
    order: maxOrder + 1
  };

  await apiPost('/admin/api/planner/save', copy, { loadingLabel: 'Duplicating task…' });
  toast('Task duplicated', { type: 'success' });
  await loadTasks();
}

function onActionClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'view') openView(id);
  if (action === 'edit') openEdit(id);
  if (action === 'dup') duplicateTask(id);
  if (action === 'del') openDelete(id);
}

export async function initPlanner() {
  tableBody = document.getElementById('planner-table-body');
  cardsRoot = document.getElementById('planner-cards');
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

  viewModal = document.getElementById('planner-view-modal');
  viewCloseBtn = document.getElementById('close-task-view-btn');

  statusFilter = document.getElementById('planner-status-filter');
  assignedFilter = document.getElementById('planner-assigned-filter');

  if (!tableBody || !cardsRoot || !addBtn || !modal || !deleteModal || !viewModal) return;

  addBtn.addEventListener('click', openAdd);
  saveBtn?.addEventListener('click', saveTask);
  cancelBtn?.addEventListener('click', () => closeModal(modal));

  confirmDeleteBtn?.addEventListener('click', deleteTask);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  viewCloseBtn?.addEventListener('click', () => closeModal(viewModal));

  statusFilter?.addEventListener('change', render);
  assignedFilter?.addEventListener('change', render);

  tableBody.addEventListener('click', onActionClick);
  cardsRoot.addEventListener('click', onActionClick);

  await loadEvents();
  await loadTasks();

  bus.on('events:updated', async () => {
    await loadEvents();
    render();
  });
}
