
// IMPORT MODULE INIT FUNCTIONS
import { initDashboard } from "../js/dashboard.js";
import { initRSVP } from "../js/rsvp.js";
import { initEvents } from "../js/events.js";
import { initBudget } from "../js/budget.js";
import { initPlanner } from "../js/planner.js";
import { initSettings } from "../js/settings.js";
import { initEdit } from "../js/edit.js";
import { initWedding } from "../js/wedding.js";
import { initVendors } from "../js/vendors.js";
import { initContacts } from "../js/contacts.js";
import { initLocations } from "../js/locations.js";

// Shared UI + mobile nav
import { initUI } from "./ui.js";
import { initMobileNav } from "./mobile-nav.js";

initUI();
initMobileNav();

const sectionHtmlCache = new Map();
let currentSection = null;

let currentRole = 'admin';

async function loadRole() {
  try {
    const res = await fetch('/admin/api/me', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return;
    const me = await res.json();
    currentRole = me?.role || 'none';
  } catch {}
}

function isSectionAllowed(section) {
  if (currentRole === 'admin') return true;
  if (currentRole === 'limited') return (section === 'budget' || section === 'planner');
  return false;
}

function applyNavPermissions() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const section = item.getAttribute('data-section');
    if (!section) return;
    if (!isSectionAllowed(section)) item.style.display = 'none';
  });
}

// THEME TOGGLE
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

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
  if (!toggle || !menu) return;

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


// SIDEBAR COLLAPSE (desktop)
(function () {
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.getElementById("sidebar-toggle");
  if (!sidebar || !toggle) return;
  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
})();

// HEALTH CHECK
fetch("/admin/api/health")
  .then(r => (r.ok ? r.json() : null))
  .then(d => {
    const el = document.getElementById("worker-version");
    if (el && d?.version) el.textContent = `v${d.version}`;
  })
  .catch(() => {});

// MODULE LOADER
export async function loadSection(section, { force = false } = {}) {
  const container = document.getElementById("content");
  if (!container || !section) return;

  if (!isSectionAllowed(section)) {
    container.innerHTML = `<p style="color:var(--danger);">You do not have access to this section.</p>`;
    return;
  }

  if (!force && section === currentSection) return;
  currentSection = section;

  try {
    let html = sectionHtmlCache.get(section);
    if (!html) {
      const htmlRes = await fetch(`./sections/${section}.html`, { cache: 'force-cache' });
      html = await htmlRes.text();
      sectionHtmlCache.set(section, html);
    }

    container.innerHTML = html;
	
    if (section === "dashboard") initDashboard();
    if (section === "rsvp") initRSVP();
	if (section === "events") initEvents();
	if (section === "locations") initLocations();
	if (section === "wedding") initWedding();
    if (section === "vendors") initVendors();
    if (section === "contacts") initContacts();
    if (section === "budget") initBudget();
    if (section === "planner") initPlanner();
    if (section === "settings") initSettings();
    if (section === "edit") initEdit();
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Failed to load section: ${section}</p>`;
    console.error(err);
  }
}



// NAVIGATION + TITLE UPDATES
(function () {
  const navItems = document.querySelectorAll(".nav-item");
  const contentTitle = document.getElementById("content-title");
  const contentSubtitle = document.getElementById("content-subtitle");
  const topbarChip = document.getElementById("topbar-chip-text");
  const rsvpSummary = document.getElementById("rsvp-summary");

  const meta = {
    dashboard: { title: "Dashboard overview", subtitle: "High-level view of attendance and events.", chip: "Dashboard", showSummary: false },
    rsvp: { title: "RSVP Manager", subtitle: "View, filter and export guest responses for all events.", chip: "Guests & responses", showSummary: true },
    events: { title: "Events", subtitle: "Manage event timelines, capacity, and vendor assignments.", chip: "Event manager", showSummary: false },
    wedding: { title: "Wedding Settings", subtitle: "Couple details, key dates and contact info.", chip: "Wedding", showSummary: false },
    vendors: { title: "Vendors", subtitle: "Manage suppliers and assign them to events.", chip: "Vendors", showSummary: false },
    contacts: { title: "Contacts", subtitle: "Contact list for family, friends, and suppliers.", chip: "Contacts", showSummary: false },
    budget: { title: "Budget & Cost Tracker", subtitle: "Track all wedding-related expenses.", chip: "Money & commitments", showSummary: false },
    planner: { title: "Planner & Timeline", subtitle: "Organise tasks, due dates and timelines.", chip: "Tasks & milestones", showSummary: false },
    settings: { title: "Site Settings", subtitle: "Configure site-wide options and event blocks.", chip: "Configuration", showSummary: false },
    locations: { title: "Locations", subtitle: "Reusable venues (maps, website, photos, description) for events.", chip: "Locations", showSummary: false },
	edit: { title: "Edit Website Content", subtitle: "Update hero text, event details, travel info and more.", chip: "Copy & layout", showSummary: false }
  };

  navItems.forEach(item => {
    item.setAttribute('tabindex', '0');

    item.addEventListener("click", () => {
      const section = item.getAttribute("data-section");
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const m = meta[section];
      if (m) {
        if (contentTitle) contentTitle.textContent = m.title;
        if (contentSubtitle) contentSubtitle.textContent = m.subtitle;
        if (topbarChip) topbarChip.textContent = m.chip;
        if (rsvpSummary) rsvpSummary.style.display = m.showSummary ? "flex" : "none";
      }

      loadSection(section);
		if (!isSectionAllowed(section)) {
		 const container = document.getElementById("content");
		if (container) container.innerHTML = `<p style="color:var(--danger);">You do not have access to this section.</p>`;
		 return;
		}
    });

	item.addEventListener('keydown', (e) => {
	  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
	item.click();
  }
  });
});
});

(async () => {
  await loadRole();
  applyNavPermissions();
  if (currentRole === 'limited') {
    loadSection('budget');
    return;
  }
  loadSection("dashboard");
})();


