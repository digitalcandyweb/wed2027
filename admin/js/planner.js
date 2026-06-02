// PLANNER MODULE
let tasks = [];
let events = [];
let taskToDelete = null;

const tableBody = document.getElementById("planner-table-body");
const addBtn = document.getElementById("add-task-btn");

const modal = document.getElementById("planner-modal");
const modalTitle = document.getElementById("planner-modal-title");

const idInput = document.getElementById("task-id");
const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-description");
const dueInput = document.getElementById("task-due");
const assignedInput = document.getElementById("task-assigned");
const priorityInput = document.getElementById("task-priority");
const statusInput = document.getElementById("task-status");
const eventInput = document.getElementById("task-event");
const notesInput = document.getElementById("task-notes");

const saveBtn = document.getElementById("save-task-btn");
const cancelBtn = document.getElementById("cancel-task-btn");

const deleteModal = document.getElementById("planner-delete-modal");
const confirmDeleteBtn = document.getElementById("confirm-delete-task-btn");
const cancelDeleteBtn = document.getElementById("cancel-delete-task-btn");

const statusFilter = document.getElementById("planner-status-filter");
const assignedFilter = document.getElementById("planner-assigned-filter");

async function loadEvents() {
  try {
    const res = await fetch("/admin/api/events", { credentials: "include" });
    const data = await res.json();
    events = Array.isArray(data) ? data : [];

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
    tableBody.innerHTML = `<tr><td colspan="7" class="planner-error">Error loading tasks.</td></tr>`;
  }
}

function renderTable() {
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
        <button class="small-btn" data-edit="${t.id}">Edit</button>
        <button class="small-btn danger" data-delete="${t.id}">Delete</button>
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
