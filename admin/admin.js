// THEME
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");

  function applyTheme(mode) {
    root.setAttribute("data-theme", mode);
    toggle.setAttribute("data-mode", mode);
  }

  const stored = localStorage.getItem("wedding-admin-theme");
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  } else {
    applyTheme("light");
  }

  toggle.addEventListener("click", () => {
    const current = toggle.getAttribute("data-mode") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("wedding-admin-theme", next);
  });
})();

// USER MENU
(function () {
  const toggle = document.getElementById("user-menu-toggle");
  const menu = document.getElementById("user-menu");

  toggle.addEventListener("click", () => {
    const visible = menu.style.display === "flex";
    menu.style.display = visible ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = "none";
    }
  });
})();

// NAV + SECTION SWITCHING
(function () {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = {
    rsvp: document.getElementById("section-rsvp"),
    events: document.getElementById("section-events"),
    edit: document.getElementById("section-edit"),
    budget: document.getElementById("section-budget"),
    planner: document.getElementById("section-planner"),
  };

  const topbarTitle = document.getElementById("topbar-title-text");
  const topbarChip = document.getElementById("topbar-chip-text");
  const contentTitle = document.getElementById("content-title");
  const contentSubtitle = document.getElementById("content-subtitle");
  const badgeText = document.getElementById("badge-text");

  const meta = {
    rsvp: {
      topbarTitle: "RSVP Manager",
      chip: "Guests & responses",
      contentTitle: "RSVP Manager",
      contentSubtitle: "View, filter and export guest responses for all events.",
      badge: "Live data connected"
    },
    events: {
      topbarTitle: "Events",
      chip: "Event configuration",
      contentTitle: "Events",
      contentSubtitle: "Manage event names, dates, locations and visibility.",
      badge: "Config-driven"
    },
    edit: {
      topbarTitle: "Edit Website Content",
      chip: "Copy & layout",
      contentTitle: "Edit Website Content",
      contentSubtitle: "Update hero text, event details, travel info and more without redeploying.",
      badge: "Config-driven content"
    },
    budget: {
      topbarTitle: "Budget & Cost Tracker",
      chip: "Money & commitments",
      contentTitle: "Budget & Cost Tracker",
      contentSubtitle: "Track all wedding-related expenses and compare against your planned budget.",
      badge: "Private to admin"
    },
    planner: {
      topbarTitle: "Planner & Timeline",
      chip: "Tasks & milestones",
      contentTitle: "Planner & Timeline",
      contentSubtitle: "Organise tasks, due dates and timelines for all events.",
      badge: "Planning workspace"
    }
  };

  function setActive(sectionKey) {
    navItems.forEach(item => {
      const key = item.getAttribute("data-section");
      item.classList.toggle("active", key === sectionKey);
    });

    Object.entries(sections).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle("active", key === sectionKey);
    });

    const m = meta[sectionKey];
    if (m) {
      topbarTitle.textContent = m.topbarTitle;
      topbarChip.textContent = m.chip;
      contentTitle.textContent = m.contentTitle;
      contentSubtitle.textContent = m.contentSubtitle;
      badgeText.textContent = m.badge;
    }
  }

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const key = item.getAttribute("data-section");
      setActive(key);
    });
  });

  setActive("rsvp");
})();

// Events Manager
const EventsManager = (() => {
  let events = [];
  let eventToDelete = null;

  const tableBody = document.getElementById("events-table-body");
  const addBtn = document.getElementById("add-event-btn");

  const modal = document.getElementById("event-modal");
  const deleteModal = document.getElementById("delete-event-modal");

  const idInput = document.getElementById("event-id");
  const nameInput = document.getElementById("event-name");
  const dateInput = document.getElementById("event-date");
  const locationInput = document.getElementById("event-location");
  const venueInput = document.getElementById("event-venue");
  const notesInput = document.getElementById("event-notes");
  const visibleInput = document.getElementById("event-visible");

  const saveBtn = document.getElementById("save-event-btn");
  const cancelBtn = document.getElementById("cancel-event-btn");

  const confirmDeleteBtn = document.getElementById("confirm-delete-event-btn");
  const cancelDeleteBtn = document.getElementById("cancel-delete-event-btn");

  async function loadEvents() {
    try {
      const res = await fetch("/admin/api/events", { credentials: "include" });
      const data = await res.json();
      events = Array.isArray(data) ? data : [];
      events.sort((a, b) => a.order - b.order);
      renderTable();
    } catch (e) {
      console.error("Failed to load events", e);
    }
  }

  function renderTable() {
    tableBody.innerHTML = "";
    if (!events.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="6" style="text-align:center; color:var(--text-muted); padding:12px;">No events configured yet.</td>`;
      tableBody.appendChild(row);
      return;
    }

    events.forEach(e => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${e.order}</td>
        <td>${e.name}</td>
        <td>${e.date}</td>
        <td>${e.location}</td>
        <td>${e.visible ? "Yes" : "No"}</td>
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
    idInput.value = "";
    nameInput.value = "";
    dateInput.value = "";
    locationInput.value = "";
    venueInput.value = "";
    notesInput.value = "";
    visibleInput.checked = true;

    modal.classList.remove("hidden");
  }

  function openEdit(id) {
    const e = events.find(ev => ev.id === id);
    if (!e) return;

    idInput.value = e.id;
    nameInput.value = e.name;
    dateInput.value = e.date;
    locationInput.value = e.location;
    venueInput.value = e.venue || "";
    notesInput.value = e.notes || "";
    visibleInput.checked = !!e.visible;

    modal.classList.remove("hidden");
  }

  function openDelete(id) {
    eventToDelete = id;
    deleteModal.classList.remove("hidden");
  }

  async function saveEvent() {
    const body = {
      id: idInput.value || null,
      name: nameInput.value,
      date: dateInput.value,
      location: locationInput.value,
      venue: venueInput.value,
      notes: notesInput.value,
      visible: visibleInput.checked
    };

    try {
      await fetch("/admin/api/events/save", {
        method: "POST",
        body: JSON.stringify(body),
        credentials: "include"
      });
      modal.classList.add("hidden");
      await loadEvents();
    } catch (e) {
      console.error("Failed to save event", e);
      alert("Error saving event.");
    }
  }

  async function deleteEvent() {
    if (!eventToDelete) return;
    try {
      await fetch(`/admin/api/events/delete/${encodeURIComponent(eventToDelete)}`, {
        method: "POST",
        credentials: "include"
      });
      deleteModal.classList.add("hidden");
      await loadEvents();
    } catch (e) {
      console.error("Failed to delete event", e);
      alert("Error deleting event.");
    }
  }

  function init() {
    if (!tableBody || !addBtn) return;

    addBtn.addEventListener("click", openAdd);
    saveBtn.addEventListener("click", saveEvent);
    cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

    confirmDeleteBtn.addEventListener("click", deleteEvent);
    cancelDeleteBtn.addEventListener("click", () => deleteModal.classList.add("hidden"));

    loadEvents();
  }

  return { init };
})();

// RSVP MANAGER
(function () {
  const tableBody = document.getElementById("rsvp-table-body");
  const searchInput = document.getElementById("rsvp-search");
  const eventFilter = document.getElementById("rsvp-event-filter");
  const attendanceFilter = document.getElementById("rsvp-attendance-filter");
  const exportButton = document.getElementById("rsvp-export");

  let allEvents = [];
  let allRsvps = [];
  let filteredRsvps = [];

  async function fetchEvents() {
    try {
      const res = await fetch("/admin/api/events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      allEvents = Array.isArray(data) ? data : [];
      populateEventFilter();
    } catch (err) {
      console.error(err);
    }
  }

  function populateEventFilter() {
    eventFilter.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All events";
    eventFilter.appendChild(optAll);

    allEvents.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev.id;
      opt.textContent = ev.name || ev.id;
      eventFilter.appendChild(opt);
    });
  }

  async function fetchRsvps() {
    try {
      tableBody.innerHTML = '<tr><td colspan="6" class="rsvp-loading">Loading RSVPs…</td></tr>';
      const res = await fetch("/admin/api/list", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load RSVPs");
      const data = await res.json();
      allRsvps = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="6" class="rsvp-error">Error loading RSVPs.</td></tr>';
    }
  }

  function getEventName(id) {
    const ev = allEvents.find(e => e.id === id);
    return ev ? (ev.name || ev.id) : (id || "—");
  }

  function formatDate(ts) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="rsvp-empty">No RSVPs match your filters yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");

      const attending = r.attending === true;
      const statusLabel = attending ? "Attending" : "Not attending";

      tr.innerHTML = `
        <td>
          <div style="font-weight:500;">${r.name || "—"}</div>
          <div style="margin-top:2px;">
            <span class="rsvp-tag ${attending ? "attending" : "not-attending"}">${statusLabel}</span>
          </div>
        </td>
        <td>${r.email || "—"}</td>
        <td>${getEventName(r.event)}</td>
        <td>${typeof r.guests === "number" ? r.guests : (r.guests || "—")}</td>
        <td>${formatDate(r.timestamp)}</td>
        <td>
          <div class="rsvp-actions">
            <button class="link-button" type="button" data-action="view" data-id="${r.id || ""}">View</button>
            <button class="link-button" type="button" data-action="delete" data-id="${r.id || ""}" style="color:var(--danger);">Delete</button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  }

  function applyFilters() {
    const q = (searchInput.value || "").toLowerCase();
    const ev = eventFilter.value;
    const att = attendanceFilter.value;

    filteredRsvps = allRsvps.filter(r => {
      const matchesSearch =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q));

      const matchesEvent = !ev || r.event === ev;

      const status = r.attending === true ? "attending" : "not_attending";
      const matchesAttendance = !att || status === att;

      return matchesSearch && matchesEvent && matchesAttendance;
    });

    renderTable(filteredRsvps);
  }

  async function deleteRsvp(id) {
    if (!id) return;
    const confirmDelete = window.confirm("Delete this RSVP? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/admin/api/delete/${encodeURIComponent(id)}`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete RSVP");
      allRsvps = allRsvps.filter(r => r.id !== id);
      applyFilters();
    } catch (err) {
      console.error(err);
      alert("Error deleting RSVP.");
    }
  }

  function exportCsv() {
    const rows = filteredRsvps.length ? filteredRsvps : allRsvps;
    if (!rows.length) {
      alert("No RSVPs to export.");
      return;
    }

    const header = ["id", "name", "email", "event", "guests", "attending", "timestamp"];
    const lines = [header.join(",")];

    rows.forEach(r => {
      const attending = r.attending === true ? "attending" : "not_attending";
      const line = [
        r.id || "",
        (r.name || "").replace(/"/g, '""'),
        (r.email || "").replace(/"/g, '""'),
        getEventName(r.event).replace(/"/g, '""'),
        typeof r.guests === "number" ? r.guests : (r.guests || ""),
        attending,
        r.timestamp || ""
      ].map(v => `"${v}"`).join(",");
      lines.push(line);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `wedding-rsvps-${now}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (action === "delete") {
      deleteRsvp(id);
    } else if (action === "view") {
      const r = allRsvps.find(x => x.id === id);
      if (!r) return;
      const attending = r.attending === true ? "Attending" : "Not attending";
      alert(
        `Name: ${r.name || "—"}\n` +
        `Email: ${r.email || "—"}\n` +
        `Event: ${getEventName(r.event)}\n` +
        `Guests: ${r.guests || "—"}\n` +
        `Attending: ${attending}\n` +
        `Submitted: ${formatDate(r.timestamp)}\n\n` +
        (r.notes ? `Notes: ${r.notes}` : "")
      );
    }
  });

  searchInput.addEventListener("input", applyFilters);
  eventFilter.addEventListener("change", applyFilters);
  attendanceFilter.addEventListener("change", applyFilters);
  exportButton.addEventListener("click", exportCsv);

  (async function init() {
    await fetchEvents();
    await fetchRsvps();
  })();
})();

document.addEventListener("DOMContentLoaded", () => {
  EventsManager.init();
});
