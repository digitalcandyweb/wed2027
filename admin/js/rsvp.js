// RSVP MANAGER MODULE
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
      updateDashboard(allRsvps, allEvents);
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
      updateDashboard(allRsvps, allEvents);
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

  export async function initRSVP() {
    await fetchEvents();
    await fetchRsvps();
  })();
})();
