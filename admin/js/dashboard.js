// Dashboard updater
function updateDashboard(rsvps, events) {
  const attending = rsvps.filter(r => r.attending === true).length;
  const notAttending = rsvps.filter(r => r.attending === false).length;

  const dashA = document.getElementById("dash-attending");
  const dashN = document.getElementById("dash-not-attending");
  if (dashA) dashA.textContent = attending;
  if (dashN) dashN.textContent = notAttending;

  const summaryA = document.getElementById("summary-attending");
  const summaryN = document.getElementById("summary-not-attending");
  if (summaryA) summaryA.textContent = attending;
  if (summaryN) summaryN.textContent = notAttending;

  const container = document.getElementById("dashboard-events");
  if (!container) return;

  container.innerHTML = "";

  events.forEach(ev => {
    const count = rsvps.filter(r => r.event === ev.id && r.attending === true).length;

    const card = document.createElement("div");
    card.className = "dashboard-event-card";
    card.innerHTML = `
      <div class="event-name">${ev.name}</div>
      <div class="event-count">${count}</div>
    `;
    container.appendChild(card);
  });
}

// Load data when dashboard loads
export async function initDashboard() {
  try {
    const [rsvpRes, eventsRes] = await Promise.all([
      fetch("/admin/api/list", { credentials: "include" }),
      fetch("/admin/api/events", { credentials: "include" })
    ]);

    const rsvps = await rsvpRes.json();
    const events = await eventsRes.json();

    updateDashboard(Array.isArray(rsvps) ? rsvps : [], Array.isArray(events) ? events : []);
  } catch (err) {
    console.error("Dashboard failed to load", err);
  }
})();
