// ===============================
// THEME TOGGLE
// ===============================
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


// ===============================
// USER MENU
// ===============================
(function () {
  const toggle = document.getElementById("user-menu-toggle");
  const menu = document.getElementById("user-menu");

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const visible = menu.style.display === "flex";
    menu.style.display = visible ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = "none";
    }
  });
})();


// ===============================
// SIDEBAR COLLAPSE
// ===============================
(function () {
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  if (!sidebar || !toggle) return;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
})();


// ===============================
// MODULE LOADER
// ===============================
async function loadSection(section) {
  const container = document.getElementById("content");
  if (!container) return;

  try {
    // Load HTML fragment
    const htmlRes = await fetch(`./sections/${section}.html`);
    const html = await htmlRes.text();
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Failed to load section: ${section}</p>`;
    console.error(err);
  }
}


// ===============================
// NAVIGATION + TITLE UPDATES
// ===============================
(function () {
  const navItems = document.querySelectorAll(".nav-item");

  const contentTitle = document.getElementById("content-title");
  const contentSubtitle = document.getElementById("content-subtitle");
  const topbarChip = document.getElementById("topbar-chip-text");
  const rsvpSummary = document.getElementById("rsvp-summary");

  const meta = {
    dashboard: {
      title: "Dashboard overview",
      subtitle: "High-level view of attendance and events.",
      chip: "Dashboard",
      showSummary: false
    },
    rsvp: {
      title: "RSVP Manager",
      subtitle: "View, filter and export guest responses for all events.",
      chip: "Guests & responses",
      showSummary: true
    },
    events: {
      title: "Events",
      subtitle: "Manage event names, dates, locations and visibility.",
      chip: "Event configuration",
      showSummary: false
    },
    edit: {
      title: "Edit Website Content",
      subtitle: "Update hero text, event details, travel info and more.",
      chip: "Copy & layout",
      showSummary: false
    },
    budget: {
      title: "Budget & Cost Tracker",
      subtitle: "Track all wedding-related expenses.",
      chip: "Money & commitments",
      showSummary: false
    },
    planner: {
      title: "Planner & Timeline",
      subtitle: "Organise tasks, due dates and timelines.",
      chip: "Tasks & milestones",
      showSummary: false
    }
  };

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const section = item.getAttribute("data-section");

      // Update active state
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Update titles
      const m = meta[section];
      if (m) {
        contentTitle.textContent = m.title;
        contentSubtitle.textContent = m.subtitle;
        topbarChip.textContent = m.chip;
        rsvpSummary.style.display = m.showSummary ? "flex" : "none";
      }

      // Load module
      loadSection(section);
    });
  });

  // ⭐ Load dashboard by default
  loadSection("dashboard");
})();
