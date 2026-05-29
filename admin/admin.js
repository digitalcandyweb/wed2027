// Navigation
function initNavigation() {
  const menuBar = document.getElementById("menu-bar");
  const menuToggle = document.getElementById("menu-toggle");
  const menuItems = document.querySelectorAll(".menu-item");
  const sections = document.querySelectorAll(".admin-section");

  menuToggle.addEventListener("click", () => {
    menuBar.classList.toggle("hidden");
  });

  menuItems.forEach(btn => {
    btn.addEventListener("click", () => {
      menuItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.getAttribute("data-section-target");
      sections.forEach(sec => {
        sec.classList.toggle("hidden", sec.id !== target);
      });

      menuBar.classList.add("hidden");
    });
  });
}

// Account Menu
function initAccountMenu() {
  const button = document.getElementById("account-menu-button");
  const dropdown = document.getElementById("account-menu-dropdown");

  button.addEventListener("click", () => {
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", e => {
    if (!button.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// Events Manager
const EventsManager = (() => {
  let events = [];
  let eventToDelete = null;

  function init() {
    document.getElementById("add-event-btn").addEventListener("click", () => openEventModal());
    document.getElementById("reorder-events-btn").addEventListener("click", openReorderModal);
    document.getElementById("save-event-btn").addEventListener("click", saveEvent);
    document.getElementById("confirm-delete-event-btn").addEventListener("click", confirmDelete);

    document.querySelectorAll("[data-close-event-modal]").forEach(btn =>
      btn.addEventListener("click", closeEventModal)
    );
    document.querySelectorAll("[data-close-delete-event-modal]").forEach(btn =>
      btn.addEventListener("click", closeDeleteModal)
    );
    document.querySelectorAll("[data-close-reorder-events-modal]").forEach(btn =>
      btn.addEventListener("click", closeReorderModal)
    );

    renderEvents();
  }

  function renderEvents() {
    const tbody = document.getElementById("events-table-body");
    tbody.innerHTML = "";

    if (!events.length) {
      tbody.innerHTML = `<tr><td colspan="7">No events yet.</td></tr>`;
      return;
    }

    events.forEach((ev, i) => {
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

    tbody.querySelectorAll("[data-edit]").forEach(btn =>
      btn.addEventListener("click", () => {
        const ev = events.find(e => e.id === btn.dataset.edit);
        openEventModal(ev);
      })
    );

    tbody.querySelectorAll("[data-del]").forEach(btn =>
      btn.addEventListener("click", () => {
        eventToDelete = events.find(e => e.id === btn.dataset.del);
        openDeleteModal(eventToDelete);
      })
    );

    tbody.querySelectorAll("[data-dup]").forEach(btn =>
      btn.addEventListener("click", () => {
        const ev = events.find(e => e.id === btn.dataset.dup);
        duplicateEvent(ev);
      })
    );
  }

  function openEventModal(ev = null) {
    const modal = document.getElementById("event-modal");
    modal.classList.remove("hidden");

    document.getElementById("event-modal-title").textContent = ev ? "Edit event" : "Add event";
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

  function openDeleteModal(ev) {
    document.getElementById("delete-event-message").textContent =
      `Are you sure you want to delete "${ev.name}"? This cannot be undone.`;
    document.getElementById("delete-event-modal").classList.remove("hidden");
  }

  function closeDeleteModal() {
    document.getElementById("delete-event-modal").classList.add("hidden");
    eventToDelete = null;
  }

  function openReorderModal() {
    const list = document.getElementById("reorder-events-list");
    list.innerHTML = "";

    events
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach(ev => {
        const li = document.createElement("li");
        li.draggable = true;
        li.dataset.id = ev.id;
        li.textContent = ev.name;

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

    document.getElementById("reorder-events-modal").classList.remove("hidden");
  }

  function closeReorderModal() {
    document.getElementById("reorder-events-modal").classList.add("hidden");
  }

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

  function saveEvent() {
    const id = document.getElementById("event-id").value.trim();
    const name = document.getElementById("event-name").value.trim();
    if (!name) return;

    const now = new Date().toISOString();

    if (id) {
      // Edit existing
      const ev = events.find(e => e.id === id);
      if (!ev) return;

      ev.name = name;
      ev.date = document.getElementById("event-date").value || "";
      ev.location = document.getElementById("event-location").value || "";
      ev.venue = document.getElementById("event-venue").value || "";
      ev.visible = document.getElementById("event-visible").checked;
      ev.notes = document.getElementById("event-notes").value || "";
      ev.updatedAt = now;

      // TODO: PUT /admin/api/events/:id
    } else {
      // Create new
      const newId = slugify(name);
      const maxOrder = events.reduce((m, e) => Math.max(m, e.order), 0);

      const ev = {
        id: newId,
        name,
        date: document.getElementById("event-date").value || "",
        location: document.getElementById("event-location").value || "",
        venue: document.getElementById("event-venue").value || "",
        visible: document.getElementById("event-visible").checked,
        notes: document.getElementById("event-notes").value || "",
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now
      };

      events.push(ev);

      // TODO: POST /admin/api/events
    }

    renderEvents();
    closeEventModal();
  }

  function confirmDelete() {
    if (!eventToDelete) return;

    const id = eventToDelete.id;
    events = events.filter(e => e.id !== id);

    // TODO: DELETE /admin/api/events/:id

    renderEvents();
    closeDeleteModal();
  }

  function duplicateEvent(ev) {
    const now = new Date().toISOString();
    const copyName = `${ev.name} (copy)`;
    const newId = slugify(copyName);
    const maxOrder = events.reduce((m, e) => Math.max(m, e.order), 0);

    const clone = {
      ...ev,
      id: newId,
      name: copyName,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };

    events.push(clone);

    // TODO: POST /admin/api/events

    renderEvents();
  }

  function saveOrder() {
    const list = document.querySelectorAll("#reorder-events-list li");

    list.forEach((li, index) => {
      const ev = events.find(e => e.id === li.dataset.id);
      if (ev) ev.order = index + 1;
    });

    // TODO: PUT /admin/api/events/order

    renderEvents();
    closeReorderModal();
  }

  function slugify(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  return { init };
})();

// Init all systems
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initAccountMenu();
  EventsManager.init();
});
