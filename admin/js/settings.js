// SETTINGS MODULE
let settings = {};
let events = [];

let eventBlocksContainer;

async function loadEvents() {
  try {
    const res = await fetch("/admin/api/events", { credentials: "include" });
    const data = await res.json();
    events = Array.isArray(data) ? data : [];
    renderEventBlocks();
  } catch (err) {
    console.error("Failed to load events", err);
  }
}

function renderEventBlocks() {
  if (!eventBlocksContainer) return;
  const container = eventBlocksContainer;
  container.innerHTML = "";

  if (!events.length) {
    container.innerHTML = `<p class="settings-hint">No events found.</p>`;
    return;
  }

  events.forEach(ev => {
    const wrap = document.createElement("div");
    wrap.className = "event-block-editor";

    wrap.innerHTML = `
      <h4>${ev.name}</h4>
      <label>Description</label>
      <textarea class="input event-desc" data-id="${ev.id}"></textarea>

      <label>Schedule</label>
      <textarea class="input event-schedule" data-id="${ev.id}"></textarea>

      <label>Notes</label>
      <textarea class="input event-notes" data-id="${ev.id}"></textarea>
    `;

    container.appendChild(wrap);
  });

  if (settings.eventBlocks) {
    Object.keys(settings.eventBlocks).forEach(id => {
      const block = settings.eventBlocks[id];
      const desc = container.querySelector(`.event-desc[data-id="${id}"]`);
      const sched = container.querySelector(`.event-schedule[data-id="${id}"]`);
      const notes = container.querySelector(`.event-notes[data-id="${id}"]`);

      if (desc) desc.value = block.description || "";
      if (sched) sched.value = block.schedule || "";
      if (notes) notes.value = block.notes || "";
    });
  }
}

async function loadSettings() {
  try {
    const res = await fetch("/admin/api/settings", { credentials: "include" });
    const data = await res.json();
    settings = data || {};

    document.getElementById("set-site-title").value = settings.siteTitle || "";
    document.getElementById("set-footer-text").value = settings.footerText || "";
    document.getElementById("set-accent").value = settings.accent || "#ff3366";

    document.getElementById("set-hero-title").value = settings.heroTitle || "";
    document.getElementById("set-hero-subtitle").value = settings.heroSubtitle || "";
    document.getElementById("set-hero-description").value = settings.heroDescription || "";

    document.getElementById("set-travel-overview").value = settings.travelOverview || "";
    document.getElementById("set-travel-airports").value = settings.travelAirports || "";
    document.getElementById("set-travel-transport").value = settings.travelTransport || "";

    document.getElementById("set-accom-overview").value = settings.accomOverview || "";
    document.getElementById("set-accom-hotels").value = settings.accomHotels || "";

    document.getElementById("set-faq").value = settings.faq || "";

    document.getElementById("set-custom-1").value = settings.custom1 || "";
    document.getElementById("set-custom-2").value = settings.custom2 || "";

    if (events.length) renderEventBlocks();
  } catch (err) {
    console.error("Failed to load settings", err);
  }
}

async function saveSettings() {
  const body = {
    siteTitle: document.getElementById("set-site-title").value,
    footerText: document.getElementById("set-footer-text").value,
    accent: document.getElementById("set-accent").value,

    heroTitle: document.getElementById("set-hero-title").value,
    heroSubtitle: document.getElementById("set-hero-subtitle").value,
    heroDescription: document.getElementById("set-hero-description").value,

    travelOverview: document.getElementById("set-travel-overview").value,
    travelAirports: document.getElementById("set-travel-airports").value,
    travelTransport: document.getElementById("set-travel-transport").value,

    accomOverview: document.getElementById("set-accom-overview").value,
    accomHotels: document.getElementById("set-accom-hotels").value,

    faq: document.getElementById("set-faq").value,

    custom1: document.getElementById("set-custom-1").value,
    custom2: document.getElementById("set-custom-2").value,

    eventBlocks: {}
  };

  events.forEach(ev => {
    body.eventBlocks[ev.id] = {
      description: document.querySelector(`.event-desc[data-id="${ev.id}"]`)?.value || "",
      schedule: document.querySelector(`.event-schedule[data-id="${ev.id}"]`)?.value || "",
      notes: document.querySelector(`.event-notes[data-id="${ev.id}"]`)?.value || ""
    };
  });

  try {
    await fetch("/admin/api/settings/save", {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "include"
    });

    alert("Settings saved.");
  } catch (err) {
    console.error("Failed to save settings", err);
    alert("Error saving settings.");
  }
}

async function resetSettings() {
  if (!confirm("Reset all settings to defaults?")) return;

  try {
    await fetch("/admin/api/settings/reset", {
      method: "POST",
      credentials: "include"
    });

    alert("Settings reset.");
    await loadSettings();
  } catch (err) {
    console.error("Failed to reset settings", err);
    alert("Error resetting settings.");
  }
}

function initAccordion() {
  document.querySelectorAll(".settings-accordion").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const panel = btn.nextElementSibling;
      panel.style.display = panel.style.display === "block" ? "none" : "block";
    });
  });
}

export function initSettings() {
  eventBlocksContainer = document.getElementById("settings-event-blocks");
  initAccordion();
  loadEvents();
  loadSettings();

  document.getElementById("settings-save").addEventListener("click", saveSettings);
  document.getElementById("settings-reset").addEventListener("click", resetSettings);
}
