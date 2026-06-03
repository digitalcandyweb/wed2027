// EVENTS MANAGER MODULE
let events = [];

let tableBody;
let addBtn;
let modal;
let form;
let cancelBtn;
let modalTitle;

let editingId = null;

async function loadEvents() {
  if (!tableBody) return;
  try {
    const res = await fetch("/admin/api/events", { credentials: "include" });
    const data = await res.json();
    events = Array.isArray(data) ? data : [];
    events.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderTable();
  } catch (e) {
    console.error("Failed to load events", e);
  }
}

function renderTable() {
  tableBody.innerHTML = "";
  if (!events.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7" style="text-align:center; color:var(--text-muted); padding:12px;">No events configured yet.</td>`;
    tableBody.appendChild(row);
    return;
  }

  events.forEach(e => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${e.order ?? "—"}</td>
      <td>${e.name}</td>
	  <td>${e.date ? formatDate(e.date) : "—"}</td>
      <td>${e.location}</td>
      <td>${e.visible ? "Yes" : "No"}</td>
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
    btn.addEventListener("click", () => deleteEvent(btn.dataset.delete));
  });
}

function openAdd() {
  if (!modal || !form) return;
  editingId = null;
  modalTitle.textContent = "Add Event";
  form.name.value = "";
  form.date.value = "";
  form.location.value = "";
  form.venue.value = "";
  form.visible.checked = true;
  modal.classList.remove("hidden");
}

function openEdit(id) {
  if (!modal || !form) return;
  const e = events.find(ev => ev.id === id);
  if (!e) return;

  editingId = e.id;
  modalTitle.textContent = "Edit Event";
  form.name.value = e.name || "";
  form.date.value = e.date || "";
  form.location.value = e.location || "";
  form.venue.value = e.venue || "";
  form.visible.checked = e.visible !== false;
  modal.classList.remove("hidden");
}

async function saveEvent(e) {
  e.preventDefault();
  if (!form) return;

  const body = {
    id: editingId,
    name: form.name.value,
    date: form.date.value || null,
    location: form.location.value,
    venue: form.venue.value,
    visible: form.visible.checked
  };

  try {
    await fetch("/admin/api/events/save", {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include"
    });
    modal.classList.add("hidden");
    await loadEvents();
  } catch (err) {
    console.error("Failed to save event", err);
    alert("Error saving event.");
  }
}
function duplicateItem(item) {
  const copy = { ...item, id: crypto.randomUUID() };
  items.push(copy);
  saveItems();
  renderTable();
}
async function deleteEvent(id) {
  if (!id) return;
  if (!confirm("Delete this event?")) return;

  try {
    await fetch(`/admin/api/events/delete/${encodeURIComponent(id)}`, {
      method: "POST",
      credentials: "include"
    });
    await loadEvents();
  } catch (err) {
    console.error("Failed to delete event", err);
    alert("Error deleting event.");
  }
}

export function initEvents() {
  tableBody = document.getElementById("events-table-body");
  addBtn = document.getElementById("add-event-btn");
  modal = document.getElementById("event-modal");
  form = document.getElementById("event-form");
  cancelBtn = document.getElementById("event-cancel");
  modalTitle = document.getElementById("event-modal-title");

  if (!tableBody || !addBtn || !form || !modal) return;

  addBtn.addEventListener("click", openAdd);
  form.addEventListener("submit", saveEvent);
  cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));
  
  cancelBtn.addEventListener("click", (e) => {
  e.preventDefault(); // stop validation
  eventModal.classList.add("hidden");
  form.reset();
});


  loadEvents();
}
