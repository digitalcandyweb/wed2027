import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';

let expenses = [];
let expenseToDelete = null;

let tableBody, addBtn, modal, modalTitle;
let idInput, categoryInput, descriptionInput, amountInput, dateInput, paidInput, notesInput;
let saveBtn, cancelBtn;
let deleteModal, confirmDeleteBtn, cancelDeleteBtn;

async function loadBudget() {
  if (!tableBody) return;
  const data = await apiGet('/admin/api/budget', { loadingLabel: 'Loading budget…' });
  expenses = Array.isArray(data) ? data : [];
  expenses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderTable();
}

function renderTable() {
  tableBody.innerHTML = '';
  if (!expenses.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="8" class="muted" style="text-align:center; padding:40px 10px;">No expenses recorded yet.</td>`;
    tableBody.appendChild(row);
    return;
  }

  expenses.forEach((e, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${e.order ?? (idx + 1)}</td>
      <td>${escapeHtml(e.category ?? '')}</td>
      <td>${escapeHtml(e.description ?? '')}</td>
      <td>£${Number(e.amount ?? 0).toFixed(2)}</td>
      <td>${e.paid ? 'Yes' : 'No'}</td>
      <td>${e.date ?? '—'}</td>
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
  const copy = {
    ...original,
    id: crypto.randomUUID(),
    description: `${original.description ?? 'Expense'} (copy)`,
    order: (expenses.length ? Math.max(...expenses.map(x => x.order ?? 0)) : 0) + 1
  };
  await apiPost('/admin/api/budget/save', copy, { loadingLabel: 'Duplicating expense…' });
  toast('Expense duplicated', { type: 'success' });
  await loadBudget();
}

function onTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openEdit(id);
  if (action === 'del') openDelete(id);
  if (action === 'dup') duplicateExpense(id);
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

export function initBudget() {
  tableBody = document.getElementById('budget-table-body');
  addBtn = document.getElementById('add-expense-btn');
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

  if (!tableBody || !addBtn || !modal) return;

  addBtn.addEventListener('click', openAdd);
  cancelBtn?.addEventListener('click', () => closeModal(modal));
  saveBtn?.addEventListener('click', saveExpense);

  confirmDeleteBtn?.addEventListener('click', deleteExpense);
  cancelDeleteBtn?.addEventListener('click', () => closeModal(deleteModal));

  tableBody.addEventListener('click', onTableClick);
  loadBudget();
}
