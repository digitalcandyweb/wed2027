import { apiGet, apiPost } from './api.js';
import { toast } from '../core/ui.js';
import { bus } from '../core/bus.js';
import { updateDashboard } from './dashboard.js';

let allEvents = [];
let allRsvps = [];
let filteredRsvps = [];

let tableBody;
let searchInput;
let eventFilter;
let attendanceFilter;
let exportButton;

async function fetchEvents() {
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  allEvents = Array.isArray(data) ? data : [];
  populateEventFilter();
}

function populateEventFilter() {
  if (!eventFilter) return;
  eventFilter.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'All events';
  eventFilter.appendChild(optAll);

  allEvents.forEach(ev => {
    const opt = document.createElement('option');
    opt.value = ev.id;
    opt.textContent = ev.name ?? ev.id;
    eventFilter.appendChild(opt);
  });
}

async function fetchRsvps() {
  const data = await apiGet('/admin/api/list', { loadingLabel: 'Loading RSVPs…' });
  allRsvps = Array.isArray(data) ? data : [];
  applyFilters();
  updateDashboard(allRsvps, allEvents);
}

function getEventName(id) {
  const ev = allEvents.find(e => e.id === id);
  return ev ? (ev.name ?? ev.id) : (id ?? '—');
}

function formatDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

function renderTable(rows) {
  if (!tableBody) return;
  if (!rows.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="muted">No RSVPs match your filters yet.</td></tr>`;
    return;
  }
  tableBody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.name ?? '—')}</td>
      <td>${escapeHtml(r.email ?? '—')}</td>
      <td>${escapeHtml(getEventName(r.event))}</td>
      <td>${typeof r.guests === 'number' ? r.guests : escapeHtml(r.guests ?? '—')}</td>
      <td>${formatDate(r.timestamp)}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button export-btn" data-action="view" data-id="${r.id}">View</button>
        <button class="button delete-btn" data-action="delete" data-id="${r.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function applyFilters() {
  const q = (searchInput?.value || '').toLowerCase();
  const ev = eventFilter?.value;
  const att = attendanceFilter?.value;

  filteredRsvps = allRsvps.filter(r => {
    const matchesSearch = !q ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q));

    const matchesEvent = !ev || r.event === ev;

    const status = r.attending === true ? 'attending' : 'not_attending';
    const matchesAttendance = !att || status === att;

    return matchesSearch && matchesEvent && matchesAttendance;
  });

  renderTable(filteredRsvps);
}

async function deleteRsvp(id) {
  if (!id) return;
  if (!confirm('Delete this RSVP? This cannot be undone.')) return;
  await apiPost(`/admin/api/delete/${encodeURIComponent(id)}`, {}, { loadingLabel: 'Deleting RSVP…' });
  toast('RSVP deleted', { type: 'success' });
  allRsvps = allRsvps.filter(r => r.id !== id);
  applyFilters();
  updateDashboard(allRsvps, allEvents);
}

function exportCsv() {
  const rows = filteredRsvps.length ? filteredRsvps : allRsvps;
  if (!rows.length) { toast('No RSVPs to export', { type: 'warn' }); return; }

  const header = ['id','name','email','event','guests','attending','timestamp'];
  const lines = [header.join(',')];

  rows.forEach(r => {
    const line = [
      r.id ?? '',
      (r.name ?? '').replace(/"/g,'""'),
      (r.email ?? '').replace(/"/g,'""'),
      getEventName(r.event).replace(/"/g,'""'),
      typeof r.guests === 'number' ? r.guests : (r.guests ?? ''),
      r.attending === true ? 'attending' : 'not_attending',
      r.timestamp ?? ''
    ].map(v => `"${v}"`).join(',');
    lines.push(line);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `wedding-rsvps-${now}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleRowClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'delete') {
    deleteRsvp(id);
  }

  if (action === 'view') {
    const r = allRsvps.find(x => x.id === id);
    if (!r) return;
    const attending = r.attending === true ? 'Attending' : 'Not attending';
    alert(
      `Name: ${r.name ?? '—'}\n` +
      `Email: ${r.email ?? '—'}\n` +
      `Event: ${getEventName(r.event)}\n` +
      `Guests: ${r.guests ?? '—'}\n` +
      `Attending: ${attending}\n` +
      `Submitted: ${formatDate(r.timestamp)}\n\n` +
      (r.notes ? `Notes: ${r.notes}` : '')
    );
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

export async function initRSVP() {
  tableBody = document.getElementById('rsvp-table-body');
  searchInput = document.getElementById('rsvp-search');
  eventFilter = document.getElementById('rsvp-event-filter');
  attendanceFilter = document.getElementById('rsvp-attendance-filter');
  exportButton = document.getElementById('rsvp-export');

  await fetchEvents();
  await fetchRsvps();

  searchInput?.addEventListener('input', applyFilters);
  eventFilter?.addEventListener('change', applyFilters);
  attendanceFilter?.addEventListener('change', applyFilters);
  exportButton?.addEventListener('click', exportCsv);
  tableBody?.addEventListener('click', handleRowClick);

  // cross-talk: if events updated elsewhere, refresh event filter names
  bus.on('events:updated', async (evs) => {
    allEvents = Array.isArray(evs) ? evs : allEvents;
    populateEventFilter();
    applyFilters();
  });
}
