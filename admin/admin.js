/* --------------------------------------------------
   SIDEBAR NAVIGATION
-------------------------------------------------- */

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    // Update active state
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Show correct section
    const target = btn.dataset.section;
    document.querySelectorAll(".admin-section").forEach(sec => {
      sec.classList.toggle("hidden", sec.id !== target);
    });
  });
});

/* --------------------------------------------------
   RSVP MANAGER
-------------------------------------------------- */

let rsvpData = [];
let eventsList = [];

async function loadRSVPs() {
  try {
    const res = await fetch("/admin/api/list");
    rsvpData = await res.json();
    renderRSVPTable();
  } catch (err) {
    console.error("Failed to load RSVPs", err);
  }
}

async function loadEventsForFilters() {
  try {
    const res = await fetch("/admin/api/events");
    eventsList = await res.json();

    const filter = document.getElementById("rsvp-event-filter");
    filter.innerHTML = `<option value="all">All events</option>`;

    eventsList.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = ev.name;
      filter.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load events", err);
  }
}

function renderRSVPTable() {
  const tbody = document.getElementById("rsvp-table-body");
  tbody.innerHTML = "";

  const search = document.getElementById("rsvp-search").value.toLowerCase();
  const eventFilter = document.getElementById("rsvp-event-filter").value;
  const statusFilter = document.getElementById("rsvp-status-filter").value;

  let filtered = rsvpData.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(search) ||
      r.email.toLowerCase().includes(search);

    const matchesEvent =
      eventFilter === "all" || r.eventId === eventFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "attending" && r.attending === true) ||
      (statusFilter === "not-attending" && r.attending === false) ||
      (statusFilter === "no-response" && r.attending === null);

    return matchesSearch && matchesEvent && matchesStatus;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6">No results found.</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    const tr = document.createElement("tr");

    const eventName = eventsList.find(e => e.id === r.eventId)?.name || "—";
    const submitted = r.submitted ? new Date(r.submitted).toLocaleString() : "—";

    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.email}</td>
      <td>${eventName}</td>
      <td>${r.guests || 1}</td>
      <td>${submitted}</td>
      <td>
        <button class="btn-link" data-view="${r.id}">View</button>
        <button class="btn-link danger" data-delete="${r.id}">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Delete handler
  tbody.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.delete;
      if (!confirm("Delete this RSVP?")) return;

      await fetch(`/admin/api/list/${id}`, { method: "DELETE" });
      loadRSVPs();
    });
  });
}

// Search + filters
document.getElementById("rsvp-search").addEventListener("input", renderRSVPTable);
document.getElementById("rsvp-event-filter").addEventListener("change", renderRSVPTable);
document.getElementById("rsvp-status-filter").addEventListener("change", renderRSVPTable);

// CSV Export
document.getElementById("export-csv").addEventListener("click", () => {
  const rows = [
    ["Guest", "Email", "Event", "Guests", "Submitted"]
  ];

  rsvpData.forEach(r => {
    const eventName = eventsList.find(e => e.id === r.eventId)?.name || "—";
    rows.push([
      r.name,
      r.email,
      eventName,
      r.guests || 1,
      r.submitted || ""
    ]);
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "rsvps.csv";
  a.click();
});

/* --------------------------------------------------
   EVENTS MANAGER
-------------------------------------------------- */

let events = [];
let eventToDelete = null;

async function loadEvents() {
  try {
    const res = await fetch("/admin/api/events");
    events = await res.json();
    renderEvents();
  } catch (err) {
    console.error("Failed to load events", err);
  }
}

function renderEvents() {
  const tbody = document.getElementById("events-table-body");
  tbody.innerHTML = "";

  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="7">No events yet.</td></tr>`;
    return;
  }

  events
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(ev => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${ev.order}</td>
        <td>${ev.name}</td>
        <td>${ev.date || ""}</td>
        <td>${ev.location || ""}</td>
        <td>${ev.venue || ""}</td>
        <td>${ev.visible ? "Yes" : "No"}</td>
        <td>
          <button class="btn-link" data-edit="${ev.id}">Edit</button>
          <button class="btn-link" data-dup="${ev.id}">Duplicate</button>
          <button class="btn-link danger" data-del="${ev.id}">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

  // Edit
  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ev = events.find(e => e.id === btn.dataset.edit);
      openEventModal(ev);
    });
  });

  // Delete
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      eventToDelete = events.find(e => e.id === btn.dataset.del);
      openDeleteModal(eventToDelete);
    });
  });

  // Duplicate
  tbody.querySelectorAll("[data-dup]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ev = events.find(e => e.id === btn.dataset.dup);
      duplicateEvent(ev);
    });
  });
}

/* --------------------------------------------------
   EVENT MODAL
-------------------------------------------------- */

function openEventModal(ev = null) {
  const modal = document.getElementById("event-modal");
  modal.classList.remove("hidden");

  document.getElementById("event-modal-title").textContent = ev ? "Edit Event" : "Add Event";

  document.getElementById("event-id").value = ev?.id || "";
  document.getElementById("event-name").value = ev?.name || "";
  document.getElementById("event-date").value = ev?.date || "";
  document.getElementById("event-location").value = ev?.location || "";
  document.getElementById("event-venue").value = ev?.venue || "";
  document.getElementById("event-visible").checked = ev?.visible ?? true;
  document.getElementById("event-notes").value = ev?.notes || "";
}

function closeEventModal() {
  document.getElementById("event-modal").classList.add("hidden");
}

document.querySelectorAll("[data-close-event-modal]").forEach(btn =>
  btn.addEventListener("click", closeEventModal)
);

/* --------------------------------------------------
   SAVE EVENT
-------------------------------------------------- */

async function saveEvent() {
  const id = document.getElementById("event-id").value.trim();
  const name = document.getElementById("event-name").value.trim();
  if (!name) return;

  const payload = {
    name,
    date: document.getElementById("event-date").value || "",
    location: document.getElementById("event-location").value || "",
    venue: document.getElementById("event-venue").value || "",
    visible: document.getElementById("event-visible").checked,
    notes: document.getElementById("event-notes").value || ""
  };

  if (id) {
    await fetch(`/admin/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`/admin/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  closeEventModal();
  loadEvents();
}

document.getElementById("save-event-btn").addEventListener("click", saveEvent);

/* --------------------------------------------------
   DELETE EVENT
-------------------------------------------------- */

function openDeleteModal(ev) {
  document.getElementById("delete-event-message").textContent =
    `Are you sure you want to delete "${ev.name}"? This cannot be undone.`;

  document.getElementById("delete-event-modal").classList.remove("hidden");
}

function closeDeleteModal() {
  document.getElementById("delete-event-modal").classList.add("hidden");
  eventToDelete = null;
}

document.querySelectorAll("[data-close-delete-event-modal]").forEach(btn =>
  btn.addEventListener("click", closeDeleteModal)
);

document.getElementById("confirm-delete-event-btn").addEventListener("click", async () => {
  if (!eventToDelete) return;

  await fetch(`/admin/api/events/${eventToDelete.id}`, { method: "DELETE" });

  closeDeleteModal();
  loadEvents();
});

/* --------------------------------------------------
   DUPLICATE EVENT
-------------------------------------------------- */

async function duplicateEvent(ev) {
  const copy = {
    ...ev,
    name: ev.name + " (copy)"
  };

  delete copy.id;

  await fetch(`/admin/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(copy)
  });

  loadEvents();
}

/* --------------------------------------------------
   REORDER EVENTS
-------------------------------------------------- */

function openReorderModal() {
  const modal = document.getElementById("reorder-events-modal");
  const list = document.getElementById("reorder-events-list");

  list.innerHTML = "";

  events
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach(ev => {
      const li = document.createElement("li");
      li.textContent = ev.name;
      li.draggable = true;
      li.dataset.id = ev.id;

      li.addEventListener("dragstart", () => li.classList.add("dragging"));
      li.addEventListener("dragend", () => li.classList.remove("dragging"));

      list.appendChild(li);
    });

  list.addEventListener("dragover", e => {
    e.preventDefault();
    const dragging = list.querySelector(".dragging");
    const after = getDragAfterElement(list, e.clientY);
    if (!after) list.appendChild(dragging);
    else list.insertBefore(dragging, after);
  });

  modal.classList.remove("hidden");
}

function closeReorderModal() {
  document.getElementById("reorder-events-modal").classList.add("hidden");
}

document.querySelectorAll("[data-close-reorder-events-modal]").forEach(btn =>
  btn.addEventListener("click", closeReorderModal)
);

function getDragAfterElement(container, y) {
  const items = [...container.querySelectorAll("li:not(.dragging)")];

  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

document.getElementById("reorder-events-btn").addEventListener("click", openReorderModal);

document.getElementById("save-events-order-btn").addEventListener("click", async () => {
  const list = document.querySelectorAll("#reorder-events-list li");

  const newOrder = [];
  list.forEach((li, index) => {
    newOrder.push({
      id: li.dataset.id,
      order: index + 1
    });
  });

  await fetch(`/admin/api/events/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newOrder)
  });

  closeReorderModal();
  loadEvents();
});

/* --------------------------------------------------
   INIT
-------------------------------------------------- */

async function init() {
  await loadEventsForFilters();
  await loadRSVPs();
  await loadEvents();
}

document.addEventListener("DOMContentLoaded", init);
