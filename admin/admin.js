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
        return: document.getElementById("section-return"),
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
        },
        return: {
          topbarTitle: "Return to Main Site",
          chip: "Public view",
          contentTitle: "Return to Main Site",
          contentSubtitle: "Jump back to the public wedding site or add quick status info here.",
          badge: "Public site link"
        }
      };

      function setActive(sectionKey) {
        navItems.forEach(item => {
          const key = item.getAttribute("data-section");
          item.classList.toggle("active", key === sectionKey);
        });

        Object.entries(sections).forEach(([key, el]) => {
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

	
	// EVENT MANAGER (Modal-based)
(function () {
  const eventsList = document.getElementById("events-list");
  const addEventBtn = document.getElementById("add-event-btn");

  const modal = document.getElementById("event-modal");
  const modalTitle = document.getElementById("event-modal-title");
  const form = document.getElementById("event-form");
  const cancelBtn = document.getElementById("event-cancel");

  let editingId = null;

  function openModal(mode, eventData = null) {
    modal.classList.remove("hidden");

    if (mode === "add") {
      editingId = null;
      modalTitle.textContent = "Add Event";
      form.reset();
      form.visible.checked = true;
    }

    if (mode === "edit") {
      editingId = eventData.id;
      modalTitle.textContent = "Edit Event";

      form.name.value = eventData.name;
      form.date.value = eventData.date;
      form.location.value = eventData.location;
      form.venue.value = eventData.venue || "";
      form.visible.checked = eventData.visible !== false;
    }
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  cancelBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  async function loadEvents() {
    eventsList.innerHTML = `<div class="loading">Loading events…</div>`;

    const res = await fetch("/admin/api/events", { credentials: "include" });
    const events = await res.json();

    if (!events.length) {
      eventsList.innerHTML = `<div class="loading">No events configured yet.</div>`;
      return;
    }

    eventsList.innerHTML = "";

    events.forEach(ev => {
      const card = document.createElement("div");
      card.className = "event-card";

      card.innerHTML = `
        <div class="event-info">
          <div class="event-name">${ev.name}</div>
          <div class="event-meta">${ev.date} — ${ev.location}</div>
        </div>
        <div class="event-actions">
          <button class="link-button" data-action="edit" data-id="${ev.id}">Edit</button>
          <button class="link-button" data-action="delete" data-id="${ev.id}" style="color:var(--danger);">Delete</button>
        </div>
      `;

      eventsList.appendChild(card);
    });
  }

  // Add Event
  addEventBtn.addEventListener("click", () => openModal("add"));

  // Edit/Delete actions
  eventsList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "edit") {
      const res = await fetch("/admin/api/events", { credentials: "include" });
      const events = await res.json();
      const ev = events.find(e => e.id === id);
      openModal("edit", ev);
    }

    if (action === "delete") {
      if (!confirm("Delete this event?")) return;

      await fetch(`/admin/api/events/delete/${id}`, {
        method: "POST",
        credentials: "include"
      });

      loadEvents();
    }
  });

  // Save Event
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      id: editingId,
      name: form.name.value,
      date: form.date.value,
      location: form.location.value,
      venue: form.venue.value,
      visible: form.visible.checked
    };

    await fetch("/admin/api/events/save", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    closeModal();
    loadEvents();
  });

  // Auto-load when section becomes active
  const observer = new MutationObserver(() => {
    const section = document.getElementById("section-events");
    if (section.classList.contains("active")) {
      loadEvents();
    }
  });

  observer.observe(document.body, { attributes: true, subtree: true });
})();





      searchInput.addEventListener("input", applyFilters);
      eventFilter.addEventListener("change", applyFilters);
      attendanceFilter.addEventListener("change", applyFilters);
      exportButton.addEventListener("click", exportCsv);

      (async function init() {
        await fetchEvents();
        await fetchRsvps();
      })();
    })();
