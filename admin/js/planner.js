// PLANNER MODULE
let tasks = [];
let events = [];
let taskToDelete = null;

let tableBody;
let addBtn;

let modal;
let modalTitle;

let idInput;
let titleInput;
let descInput;
let dueInput;
let assignedInput;
let priorityInput;
let statusInput;
let eventInput;
let notesInput;

let saveBtn;
let cancelBtn;

let deleteModal;
let confirmDeleteBtn;
let cancelDeleteBtn;

let statusFilter;
let assignedFilter;

async function loadEvents() {
  try {
    const res = await fetch("/admin/api/events", { credentials: "include" });
    const data = await res.json();
    events = Array.isArray(data) ? data : [];

    if (!eventInput) return;
    eventInput.innerHTML = `<option value="">None</option>`;
    events.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = ev.name;
      eventInput.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load events", err);
  }
}

async function loadTasks() {
  try {
    const res = await fetch("/admin/api/planner", { credentials: "include" });
    const data = await res.json();
    tasks = Array.isArray(data) ? data : [];
    renderTable();
  } catch (err) {
    console.error("Failed to load tasks", err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="7" class="planner-error">Error loading tasks.</td></tr>`;
    }
  }
}

function renderTable() {
  if (!tableBody) return;
  tableBody.innerHTML = "";

  const filtered = tasks.filter(t => {
    const matchStatus = !statusFilter.value || t.status === statusFilter.value;
    const matchAssigned = !assignedFilter.value || t.assigned === assignedFilter.value;
    return matchStatus && matchAssigned;
  });

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="planner-empty">No tasks match your filters.</td></tr>`;
    return;
  }

  filtered.forEach(t => {
    const overdue = t.due && new Date(t.due) < new Date() && t.status !== "done";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="planner-task-title">${t.title}</div>
        <div class="planner-task-desc">${t.description || ""}</div>
      </td>
      <td class="${overdue ? "planner-overdue" : ""}">${t.due || "—"}</td>
      <td>${t.assigned}</td>
      <td>${t.priority}</td>
      <td>${t.status}</td>
      <td>${getEventName(t.event)}</td>
      <td style="text-align:right;">
        <button class="button edit-btn" data-edit="${t.id}">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 13.5V16h2.5l7.4-7.4-2.5-2.5L4 13.5zM17.3 6.3c.4-.4.4-1 0-1.4l-2.2-2.2a1 1 0 0 0-1.4 0l-1.8 1.8 3.6 3.6 1.8-1.8z" fill="currentColor"/>
          </svg>
        </button>
        <button class="button delete-btn" data-delete="${t.id}">
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

function getEventName(id) {
  const ev = events.find(e => e.id === id);
  return ev ? ev.name : "—";
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
  idInput.value = "";
  titleInput.value = "";
  descInput.value = "";
  dueInput.value = "";
  assignedInput.value = "brad";
  priorityInput.value = "medium";
  statusInput.value = "todo";
  eventInput.value = "";
  notesInput.value = "";

  modalTitle.textContent = "Add Task";
  modal.classList.remove("hidden");
}

function openEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  idInput.value = t.id;
  titleInput.value = t.title;
  descInput.value = t.description;
  dueInput.value = t.due;
  assignedInput.value = t.assigned;
  priorityInput.value = t.priority;
  statusInput.value = t.status;
  eventInput.value = t.event || "";
  notesInput.value = t.notes || "";

  modalTitle.textContent = "Edit Task";
  modal.classList.remove("hidden");
}
function duplicateItem(item) {
  const copy = { ...item, id: crypto.randomUUID() };
  items.push(copy);
  saveItems();
  renderTable();
}
function openDelete(id) {
  taskToDelete = id;
  deleteModal.classList.remove("hidden");
}

async function saveTask() {
  const body = {
    id: idInput.value || null,
    title: titleInput.value,
    description: descInput.value,
    due: dueInput.value,
    assigned: assignedInput.value,
    priority: priorityInput.value,
    status: statusInput.value,
    event: eventInput.value || null,
    notes: notesInput.value
  };

  try {
    await fetch("/admin/api/planner/save", {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include"
    });

    modal.classList.add("hidden");
    await loadTasks();
  } catch (err) {
    console.error("Failed to save task", err);
    alert("Error saving task.");
  }
}

async function deleteTask() {
  if (!taskToDelete) return;

  try {
    await fetch(`/admin/api/planner/delete/${encodeURIComponent(taskToDelete)}`, {
      method: "POST",
      credentials: "include"
    });

    deleteModal.classList.add("hidden");
    await loadTasks();
  } catch (err) {
    console.error("Failed to delete task", err);
    alert("Error deleting task.");
  }
}

export function initPlanner() {
  tableBody = document.getElementById("planner-table-body");
  addBtn = document.getElementById("add-task-btn");

  modal = document.getElementById("planner-modal");
  modalTitle = document.getElementById("planner-modal-title");

  idInput = document.getElementById("task-id");
  titleInput = document.getElementById("task-title");
  descInput = document.getElementById("task-description");
  dueInput = document.getElementById("task-due");
  assignedInput = document.getElementById("task-assigned");
  priorityInput = document.getElementById("task-priority");
  statusInput = document.getElementById("task-status");
  eventInput = document.getElementById("task-event");
  notesInput = document.getElementById("task-notes");

  saveBtn = document.getElementById("save-task-btn");
  cancelBtn = document.getElementById("cancel-task-btn");

  deleteModal = document.getElementById("planner-delete-modal");
  confirmDeleteBtn = document.getElementById("confirm-delete-task-btn");
  cancelDeleteBtn = document.getElementById("cancel-delete-task-btn");

  statusFilter = document.getElementById("planner-status-filter");
  assignedFilter = document.getElementById("planner-assigned-filter");

  if (!tableBody || !addBtn || !modal) return;

  addBtn.addEventListener("click", openAdd);
  saveBtn.addEventListener("click", saveTask);
  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

  confirmDeleteBtn.addEventListener("click", deleteTask);
  cancelDeleteBtn.addEventListener("click", () => deleteModal.classList.add("hidden"));

  statusFilter.addEventListener("change", renderTable);
  assignedFilter.addEventListener("change", renderTable);

  loadEvents();
  loadTasks();
}
