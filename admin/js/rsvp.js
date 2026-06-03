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
    tableBody.innerHTML = `<tr><td colspan="6" class="rsvp-empty">No RSVPs match your filters yet.</td></tr>`;
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
        <button class="button edit-btn" data-action="view" data-id="${r.id}" aria-label="View"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M10 4c4.5 0 7.7 4.2 8 6-.3 1.8-3.5 6-8 6S2.3 11.8 2 10c.3-1.8 3.5-6 8-6z' stroke='currentColor' stroke-width='2'/><circle cx='10' cy='10' r='2' fill='currentColor'/></svg></button>
        <button class="button delete-btn" data-action="delete" data-id="${r.id}" aria-label="Delete"><svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg></button>
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

  if (action === 'delete') deleteRsvp(id);

  if (action === 'view') {
    const r = allRsvps.find(x => x.id === id);
    if (!r) return;
    const attending = r.attending === true ? 'Attending' : 'Not attending';
    alert(
      `Name: ${r.name ?? '—'}
` +
      `Email: ${r.email ?? '—'}
` +
      `Event: ${getEventName(r.event)}
` +
      `Guests: ${r.guests ?? '—'}
` +
      `Attending: ${attending}
` +
      `Submitted: ${formatDate(r.timestamp)}

` +
      (r.notes ? `Notes: ${r.notes}` : '')
    );
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
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

  bus.on('events:updated', async (evs) => {
    allEvents = Array.isArray(evs) ? evs : allEvents;
    populateEventFilter();
    applyFilters();
  });
}
