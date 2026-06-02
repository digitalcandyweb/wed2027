let expenses = [];
let expenseToDelete = null;

let tableBody;
let addBtn;

let modal;
let idInput;
let categoryInput;
let descriptionInput;
let amountInput;
let dateInput;
let paidInput;
let notesInput;

let saveBtn;
let cancelBtn;

let deleteModal;
let confirmDeleteBtn;
let cancelDeleteBtn;

async function loadBudget() {
  if (!tableBody) return;
  try {
    const res = await fetch("/admin/api/budget", { credentials: "include" });
    const data = await res.json();
    expenses = Array.isArray(data) ? data : [];
    expenses.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderTable();
  } catch (err) {
    console.error("Failed to load budget", err);
  }
}

function renderTable() {
  tableBody.innerHTML = "";

  if (!expenses.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8" style="text-align:center; padding:12px; color:var(--text-muted);">No expenses recorded yet.</td>`;
    tableBody.appendChild(row);
    return;
  }

  expenses.forEach(e => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${e.order ?? "—"}</td>
      <td>${e.category}</td>
      <td>${e.description}</td>
      <td>£${Number(e.amount).toFixed(2)}</td>
      <td>${e.paid ? "Yes" : "No"}</td>
      <td>${e.date || "—"}</td>
      <td>${e.notes || "—"}</td>
      <td>
        <button class="button edit-btn" data-edit="${e.id}">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zM17.3 6.3c.4-.4.4-1 0-1.4l-2.2-2.2a1 1 0 0 0-1.4 0l-1.8 1.8 3.6 3.6 1.8-1.8z" fill="currentColor"/>
          </svg>
        </button>
        <button class="button delete-btn" data-delete="${e.id}">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z" fill="currentColor"/>
            <path d="M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z" fill="currentColor"/>
          </svg>
        </button>
      </td>

    `;

    tableBody.appendChild(row);
  });

  attachRowHandlers();
}

function attachRowHandlers() {
  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openEdit(btn.dataset.edit));
  });

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => openDelete(btn.dataset.delete));
  });
}

function openAdd() {
  if (!modal) return;
  idInput.value = "";
  categoryInput.value = "";
  descriptionInput.value = "";
  amountInput.value = "";
  dateInput.value = "";
  paidInput.checked = false;
  notesInput.value = "";

  modal.classList.remove("hidden");
}

function openEdit(id) {
  if (!modal) return;
  const e = expenses.find(x => x.id === id);
  if (!e) return;

  idInput.value = e.id;
  categoryInput.value = e.category;
  descriptionInput.value = e.description;
  amountInput.value = e.amount;
  dateInput.value = e.date;
  paidInput.checked = !!e.paid;
  notesInput.value = e.notes || "";

  modal.classList.remove("hidden");
}

function openDelete(id) {
  if (!deleteModal) return;
  expenseToDelete = id;
  deleteModal.classList.remove("hidden");
}

async function saveExpense() {
  const body = {
    id: idInput.value || null,
    category: categoryInput.value,
    description: descriptionInput.value,
    amount: parseFloat(amountInput.value || 0),
    date: dateInput.value,
    paid: paidInput.checked,
    notes: notesInput.value
  };

  try {
    await fetch("/admin/api/budget/save", {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include"
    });

    modal.classList.add("hidden");
    await loadBudget();
  } catch (err) {
    console.error("Failed to save expense", err);
    alert("Error saving expense.");
  }
}

async function deleteExpense() {
  if (!expenseToDelete) return;

  try {
    await fetch(`/admin/api/budget/delete/${encodeURIComponent(expenseToDelete)}`, {
      method: "POST",
      credentials: "include"
    });

    deleteModal.classList.add("hidden");
    await loadBudget();
  } catch (err) {
    console.error("Failed to delete expense", err);
    alert("Error deleting expense.");
  }
}

export function initBudget() {
  tableBody = document.getElementById("budget-table-body");
  addBtn = document.getElementById("add-expense-btn");

  modal = document.getElementById("budget-modal");
  idInput = document.getElementById("expense-id");
  categoryInput = document.getElementById("expense-category");
  descriptionInput = document.getElementById("expense-description");
  amountInput = document.getElementById("expense-amount");
  dateInput = document.getElementById("expense-date");
  paidInput = document.getElementById("expense-paid");
  notesInput = document.getElementById("expense-notes");

  saveBtn = document.getElementById("save-expense-btn");
  cancelBtn = document.getElementById("cancel-expense-btn");

  deleteModal = document.getElementById("delete-expense-modal");
  confirmDeleteBtn = document.getElementById("confirm-delete-expense-btn");
  cancelDeleteBtn = document.getElementById("cancel-delete-expense-btn");

  if (!tableBody || !addBtn || !modal) return;

  addBtn.addEventListener("click", openAdd);
  saveBtn.addEventListener("click", saveExpense);
  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

  if (confirmDeleteBtn && cancelDeleteBtn && deleteModal) {
    confirmDeleteBtn.addEventListener("click", deleteExpense);
    cancelDeleteBtn.addEventListener("click", () => deleteModal.classList.add("hidden"));
  }

  loadBudget();
}
