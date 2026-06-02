let expenses = [];
let expenseToDelete = null;

const tableBody = document.getElementById("budget-table-body");
const addBtn = document.getElementById("add-expense-btn");

const modal = document.getElementById("budget-modal");
const idInput = document.getElementById("expense-id");
const categoryInput = document.getElementById("expense-category");
const descriptionInput = document.getElementById("expense-description");
const amountInput = document.getElementById("expense-amount");
const dateInput = document.getElementById("expense-date");
const paidInput = document.getElementById("expense-paid");
const notesInput = document.getElementById("expense-notes");

const saveBtn = document.getElementById("save-expense-btn");
const cancelBtn = document.getElementById("cancel-expense-btn");

const deleteModal = document.getElementById("delete-expense-modal");
const confirmDeleteBtn = document.getElementById("confirm-delete-expense-btn");
const cancelDeleteBtn = document.getElementById("cancel-delete-expense-btn");

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
        <button class="small-btn" data-edit="${e.id}">Edit</button>
        <button class="small-btn danger" data-delete="${e.id}">Delete</button>
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
