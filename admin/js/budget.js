import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';

// Budget (mobile-first cards + desktop table)
let expenses = [];
let expenseToDelete = null;

let tableBody, cardsRoot, addBtn;
let summaryTotalEl, summaryPaidEl, summaryUnpaidEl;

let modal, modalTitle;
let idInput, categoryInput, descriptionInput, amountInput, dateInput, paidInput, notesInput;
let saveBtn, cancelBtn;

let deleteModal, confirmDeleteBtn, cancelDeleteBtn;

let viewModal, viewCloseBtn;

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

function fmtMoney(v) {
  const n = Number(v ?? 0);
  return `£${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

async function loadBudget() {
  const data = await apiGet('/admin/api/budget', { loadingLabel: 'Loading budget…' });
  expenses = Array.isArray(data) ? data : [];
  expenses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  render();
}

function totals() {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const paid = expenses.filter(e => e.paid).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const unpaid = total - paid;
  return { total, paid, unpaid };
}

function render() {
  renderTable(expenses);
  renderCards(expenses);
  renderSummary();
}

function renderSummary() {
  if (!summaryTotalEl) return;
  const { total, paid, unpaid } = totals();
  summaryTotalEl.textContent = fmtMoney(total);
  summaryPaidEl.textContent = fmtMoney(paid);
  summaryUnpaidEl.textContent = fmtMoney(unpaid);
}

function renderTable(rows) {
  if (!tableBody) return;

  tableBody.innerHTML = '';
  if (!rows.length) {
    tableBody.innerHTML = `<tr class="empty"><td colspan="7" class="empty">No entries yet — add your first.</td></tr>`;
    return;
  }

  rows.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(e.category ?? '')}</td>
      <td>${escapeHtml(e.description ?? '')}</td>
      <td>${escapeHtml(fmtMoney(e.amount))}</td>
      <td>${e.paid ? 'Yes' : 'No'}</td>
      <td>${escapeHtml(fmtDate(e.date))}</td>
      <td>${escapeHtml(e.notes ?? '—')}</td>
      <td class="actions-col">
        <button class="icon-btn" data-action="view" data-id="${escapeHtml(e.id)}" aria-label="View">${ICON_VIEW}</button>
        <button class="icon-btn" data-action="edit" data-id="${escapeHtml(e.id)}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="icon-btn" data-action="dup" data-id="${escapeHtml(e.id)}" aria-label="Duplicate">${ICON_COPY}</button>
        <button class="icon-btn danger" data-action="del" data-id="${escapeHtml(e.id)}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderCards(rows) {
  if (!cardsRoot) return;

  cardsRoot.innerHTML = '';
  if (!rows.length) {
    cardsRoot.innerHTML = `<div class="budget-empty">No entries yet — add your first.</div>`;
    return;
  }

  rows.forEach(e => {
    const card = document.createElement('div');
    card.className = `budget-card ${e.paid ? 'is-paid' : ''}`;

    card.innerHTML = `
      <div class="budget-card-top">
        <div class="budget-card-main">
          <div class="budget-card-amount">${escapeHtml(fmtMoney(e.amount))}</div>
          <div class="budget-card-title">${escapeHtml(e.description ?? '')}</div>
          <div class="budget-card-meta">
            <span class="badge">${escapeHtml(e.category ?? 'Uncategorised')}</span>
            <span class="dot">•</span>
            <span>${escapeHtml(fmtDate(e.date))}</span>
            <span class="dot">•</span>
            <span class="${e.paid ? 'paid' : 'unpaid'}">${e.paid ? 'Paid' : 'Unpaid'}</span>
          </div>
        </div>
        <div class="budget-card-actions">
          <button class="icon-btn" data-action="view" data-id="${escapeHtml(e.id)}" aria-label="View">${ICON_VIEW}</button>
          <button class="icon-btn" data-action="edit" data-id="${escapeHtml(e.id)}" aria-label="Edit">${ICON_PENCIL}</button>
        </div>
      </div>

      ${e.notes ? `<div class="budget-card-notes"><span class="label">Notes</span><div class="value">${escapeHtml(e.notes)}</div></div>` : ''}

      <div class="budget-card-footer">
        <button class="button small" data-action="dup" data-id="${escapeHtml(e.id)}" type="button">Duplicate</button>
        <button class="button small danger" data-action="del" data-id="${escapeHtml(e.id)}" type="button">Delete</button>
      </div>
    `;

    cardsRoot.appendChild(card);
  });
}

function openAdd() {
  if (modalTitle) modalTitle.textContent = 'Add Expense';
  idInput.value = '';
  categoryInput.value = '';
  descriptionInput.value = '';
  amountInput.value = '';
  dateInput.value = '';
  paidInput.checked = false;
  notesInput.value = '';
  openModal(modal);
}

function openEdit(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;
  if (modalTitle) modalTitle.textContent = 'Edit Expense';
  idInput.value = e.id;
  categoryInput.value = e.category ?? '';
  descriptionInput.value = e.description ?? '';
  amountInput.value = e.amount ?? '';
  dateInput.value = e.date ?? '';
  paidInput.checked = !!e.paid;
  notesInput.value = e.notes ?? '';
  openModal(modal);
}

function openView(id) {
  const e = expenses.find(x => x.id === id);
  if (!e) return;

  viewModal.querySelector('[data-view="amount"]').textContent = fmtMoney(e.amount);
  viewModal.querySelector('[data-view="category"]').textContent = e.category ?? '—';
  viewModal.querySelector('[data-view="description"]').textContent = e.description ?? '—';
  viewModal.querySelector('[data-view="date"]').textContent = fmtDate(e.date);
  viewModal.querySelector('[data-view="paid"]').textContent = e.paid ? 'Paid' : 'Unpaid';
  viewModal.querySelector('[data-view="notes"]').textContent = e.notes ? e.notes : '—';

  openModal(viewModal);
}

async function saveExpense() {
  const body = {
    id: idInput.value || null,
    category: categoryInput.value.trim(),
    description: descriptionInput.value.trim(),
    amount: parseFloat(amountInput.value || '0'),
    date: dateInput.value || null,
    paid: paidInput.checked,
    notes: notesInput.value.trim()
  };

  if (!body.description) {
    toast('Description is required', { type: 'warn' });
    return;
  }

  await apiPost('/admin/api/budget/save', body, { loadingLabel: 'Saving expense…' });
  toast('Expense saved', { type: 'success' });
  closeModal(modal);
  await loadBudget();
}

function openDelete(id) {
  expenseToDelete = id;
  openModal(deleteModal);
}

async function deleteExpense() {
  if (!expenseToDelete) return;
  await apiPost(`/admin/api/budget/delete/${encodeURIComponent(expenseToDelete)}`, {}, { loadingLabel: 'Deleting expense…' });
  toast('Expense deleted', { type: 'success' });
  closeModal(deleteModal);
  expenseToDelete = null;
  await loadBudget();
}

async function duplicateExpense(id) {
  const original = expenses.find(x => x.id === id);
  if (!original) return;

  const maxOrder = expenses.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), 0);
  const copy = {
    ...original,
    id: crypto.randomUUID(),
    description: `${original.description ?? 'Expense'} (copy)`,
    order: maxOrder + 1
  };

  await apiPost('/admin/api/budget/save', copy, { loadingLabel: 'Duplicating expense…' });
  toast('Expense duplicated', { type: 'success' });
  await loadBudget();
}

function onActionClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'view') openView(id);
  if (action === 'edit') openEdit(id);
  if (action === 'dup') duplicateExpense(id);
  if (action === 'del') openDelete(id);
}

export function initBudget() {
  addBtn = document.getElementById('add-expense-btn');
  tableBody = document.getElementById('budget-table-body');
  cardsRoot = document.getElementById('budget-cards');

  summaryTotalEl = document.getElementById('budget-total');
  summaryPaidEl = document.getElementById('budget-paid');
  summaryUnpaidEl = document.getElementById('budget-unpaid');

  modal = document.getElementById('budget-modal');
  modalTitle = document.getElementById('budget-modal-title');
  idInput = document.getElementById('expense-id');
  categoryInput = document.getElementById('expense-category');
  descriptionInput = document.getElementById('expense-description');
  amountInput = document.getElementById('expense-amount');
  dateInput = document.getElementById('expense-date');
  paidInput = document.getElementById('expense-paid');
  notesInput = document.getElementById('expense-notes');
  saveBtn = document.getElementById('save-expense-btn');
  cancelBtn = document.getElementById('cancel-expense-btn');

  deleteModal = document.getElementById('delete-expense-modal');
  confirmDeleteBtn = document.getElementById('confirm-delete-expense-btn');
  cancelDeleteBtn = document.getElementById('cancel-delete-expense-btn');

  viewModal = document.getElementById('budget-view-modal');
  viewCloseBtn = document.getElementById('close-expense-view-btn');

  if (!addBtn || !tableBody || !cardsRoot || !modal || !deleteModal || !viewModal) return;

  addBtn.addEventListener('click', openAdd);
  cancelBtn?.addEventListener('click', () => closeModal(modal));
  saveBtn?.addEventListener('click', saveExpense);

  confirmDeleteBtn?.addEventListener('click', deleteExpense);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  viewCloseBtn?.addEventListener('click', () => closeModal(viewModal));

  tableBody.addEventListener('click', onActionClick);
  cardsRoot.addEventListener('click', onActionClick);

  loadBudget();
}
