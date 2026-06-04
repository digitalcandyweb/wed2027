(async function () {
  const container = document.getElementById("events-list");
  if (!container) return;

  try {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to load events");

    const events = await res.json();

    if (!events.length) {
      container.innerHTML = "<p class='muted'>No events announced yet.</p>";
      return;
    }

    container.innerHTML = "";

    for (const ev of events) {
      const el = document.createElement("article");
      el.className = "event-card";

      el.innerHTML = `
        <h3>${ev.name}</h3>
        <p class="event-meta">
          ${ev.date ? ev.date : ""}${ev.location ? " · " + ev.location : ""}
        </p>
        ${ev.venue ? `<p>${ev.venue}</p>` : ""}
      `;

      container.appendChild(el);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML =
      "<p class='muted'>Events are temporarily unavailable.</p>";
  }
})();
