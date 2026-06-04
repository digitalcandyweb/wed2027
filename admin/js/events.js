import { apiGet, apiPost } from './api.js';
import { openModal, closeModal, toast } from '../core/ui.js';
import { bus } from '../core/bus.js';

let events = [];
let vendors = [];
let rsvps = [];
let locations = [];

let tableBody, addBtn, modal, form, cancelBtn, modalTitle, vendorsSelect;
let locationSelect, locationCustomWrap;
let editingId = null;
let unsubVendors = null;
let unsubLocations = null;
let unsubRsvps = null;

const ICON_PENCIL = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M3 14.5V17h2.5L15.6 6.9l-2.5-2.5L3 14.5z' fill='currentColor'/><path d='M16.7 5.8a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1z' fill='currentColor'/></svg>";
const ICON_COPY = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M7 3h9v11H7V3z' stroke='currentColor' stroke-width='2'/><path d='M4 6H3v11h9v-1' stroke='currentColor' stroke-width='2'/></svg>";
const ICON_BIN = "<svg viewBox='0 0 20 20' fill='none' aria-hidden='true'><path d='M6 7h1v9H6V7zm3 0h1v9H9V7zm3 0h1v9h-1V7z' fill='currentColor'/><path d='M3 5h14v1H3V5zm2-2h8v1H5V3zm2 3h6v11H7V6z' fill='currentColor'/></svg>";

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString();
}

async function loadVendors() {
  const data = await apiGet('/admin/api/vendors', { loadingLabel: 'Loading vendors…' });
  vendors = Array.isArray(data) ? data : [];
  vendors.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  populateVendorsSelect([]);
}

async function loadLocations() {
  const data = await apiGet('/admin/api/locations', { loadingLabel: 'Loading locations…' });
  locations = Array.isArray(data) ? data : [];
  locations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  populateLocationSelect();
}

async function loadRsvps() {
  const data = await apiGet('/admin/api/list', { loadingLabel: 'Loading RSVPs…' });
  rsvps = Array.isArray(data) ? data : [];
}

function populateVendorsSelect(selectedIds) {
  if (!vendorsSelect) return;
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds : []);
  vendorsSelect.innerHTML = '';
  vendors.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name ?? v.id;
    opt.selected = selected.has(v.id);
    vendorsSelect.appendChild(opt);
  });
}

function selectedVendorIds() {
  if (!vendorsSelect) return [];
  return Array.from(vendorsSelect.selectedOptions).map(o => o.value);
}

function populateLocationSelect(selectedId) {
  if (!locationSelect) return;
  locationSelect.innerHTML = '';

  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = 'Select a location…';
  locationSelect.appendChild(optNone);

  locations.forEach(loc => {
    const opt = document.createElement('option');
    opt.value = loc.id;
    opt.textContent = loc.name ?? loc.id;
    locationSelect.appendChild(opt);
  });

  const optCustom = document.createElement('option');
  optCustom.value = '__custom__';
  optCustom.textContent = 'Custom…';
  locationSelect.appendChild(optCustom);

  if (selectedId) locationSelect.value = selectedId;
}

function onLocationChange() {
  const v = locationSelect.value;
  locationCustomWrap.style.display = (v === '__custom__') ? 'block' : 'none';
}

function countAttending(eventId) {
  return rsvps
    .filter(r => r && r.event === eventId && r.attending === true)
    .reduce((sum, r) => {
      const g = typeof r.guests === 'number' ? r.guests : parseInt(r.guests ?? '1', 10);
      return sum + (isNaN(g) ? 1 : g);
    }, 0);
}

function capacityLabel(eventObj) {
  const attending = countAttending(eventObj.id);
  const cap = (eventObj.capacity === 0 || eventObj.capacity) ? Number(eventObj.capacity) : null;
  if (!cap) return `${attending}`;
  return `${attending} / ${cap}`;
}

function capacityStyle(eventObj) {
  const cap = (eventObj.capacity === 0 || eventObj.capacity) ? Number(eventObj.capacity) : null;
  if (!cap) return '';
  const attending = countAttending(eventObj.id);
  const ratio = cap ? (attending / cap) : 0;
  if (ratio >= 1) return 'color: var(--danger); font-weight:700;';
  if (ratio >= 0.85) return 'color: #f59e0b; font-weight:700;';
  return 'color: #16a34a; font-weight:700;';
}

function locationNameForEvent(e) {
  if (e.locationId) {
    const loc = locations.find(x => x.id === e.locationId);
    if (loc && loc.name) return loc.name;
  }
  return e.location ?? '';
}

async function loadEvents() {
  if (!tableBody) return;
  const data = await apiGet('/admin/api/events', { loadingLabel: 'Loading events…' });
  events = Array.isArray(data) ? data : [];
  events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  renderTable();
  bus.emit('events:updated', events);
}

function renderTable() {
  tableBody.innerHTML = '';
  if (!events.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center; padding:40px 10px;">No events configured yet.</td></tr>`;
    return;
  }

  events.forEach((e, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.order ?? (idx + 1)}</td>
      <td>${escapeHtml(e.name ?? '')}</td>
      <td>${e.date ? formatDate(e.date) : '—'}</td>
      <td>${escapeHtml(locationNameForEvent(e))}</td>
      <td>${e.visible === false ? 'No' : 'Yes'}</td>
      <td style="${capacityStyle(e)}">${capacityLabel(e)}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="button edit-btn" data-action="edit" data-id="${e.id}" aria-label="Edit">${ICON_PENCIL}</button>
        <button class="button dup-btn" data-action="dup" data-id="${e.id}" aria-label="Duplicate">${ICON_COPY}</button>
        <button class="button delete-btn" data-action="del" data-id="${e.id}" aria-label="Delete">${ICON_BIN}</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openAdd() {
  editingId = null;
  modalTitle && (modalTitle.textContent = 'Add Event');

  form.reset();
  form.visible.checked = true;

  // Ensure these fields reset cleanly
  if (form.description) form.description.value = '';
  if (form.photos) form.photos.value = '';
  if (form.timeline) form.timeline.value = '';

  populateVendorsSelect([]);
  populateLocationSelect('');
  locationSelect.value = '';
  onLocationChange();
  openModal(modal);
}

function timelineToText(timeline) {
  if (!Array.isArray(timeline)) return '';
  return timeline.map(item => {
    if (typeof item === 'string') return item;
    const time = item && item.time ? String(item.time) : '';
    const label = item && item.label ? String(item.label) : '';
    return time ? `${time} - ${label}`.trim() : label;
  }).join('\n');
}

function parseUrlLines(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function urlsToText(list) {
  return Array.isArray(list) ? list.join('\n') : '';
}

function parseTimeline(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    const m = line.match(/^([0-2]?\d:[0-5]\d)\s*-\s*(.+)$/);
    if (m) return { time: m[1], label: m[2] };
    return { time: '', label: line };
  });
}

function openEdit(id) {
  const e = events.find(ev => ev.id === id);
  if (!e) return;
  editingId = e.id;
  modalTitle && (modalTitle.textContent = 'Edit Event');

  form.name.value = e.name ?? '';
  form.date.value = e.date ?? '';
  form.venue.value = e.venue ?? '';
  form.capacity.value = (e.capacity === 0 || e.capacity) ? String(e.capacity) : '';
  form.visible.checked = e.visible !== false;

  if (form.descriptionform.photos) form.photos.value = urlsToText(e.photoUrls);if (form.description) form.description.value = e.description ?? '';

  form.timeline.value = timelineToText(e.timeline);
  populateVendorsSelect(e.vendorIds);


  // Locations
  populateLocationSelect(e.locationId || '');
  locationSelect.value = e.locationId || (e.location ? '__custom__' : '');
  form.location.value = e.location ?? '';
  onLocationChange();

  openModal(modal);
}

async function saveEvent(ev) {
  ev.preventDefault();

  const locChoice = locationSelect.value;
  const locId = (locChoice && locChoice !== '__custom__') ? locChoice : null;
  const locName = locId ? (locations.find(x => x.id === locId)?.name || '') : form.location.value.trim();

  const body = {
	id: editingId,
	name: form.name.value.trim(),
	date: form.date.value ?? null,
	locationId: locId,
	location: locName,
	venue: form.venue.value.trim(),
	description: form.description ? form.description.value.trim() : '',
	photoUrls: form.photos ? parseUrlLines(form.photos.value) : [],
	visible: form.visible.checked,
	capacity: form.capacity.value !== '' ? Number(form.capacity.value) : null,
	vendorIds: selectedVendorIds(),
	timeline: parseTimeline(form.timeline.value)
};

  await apiPost('/admin/api/events/save', body, { loadingLabel: 'Saving event…' });
  toast('Event saved', { type: 'success' });
  closeModal(modal);
  await loadEvents();
}

async function deleteEvent(id) {
  if (!id) return;
  if (!confirm('Delete this event?')) return;
  await apiPost(`/admin/api/events/delete/${encodeURIComponent(id)}`, {}, { loadingLabel: 'Deleting event…' });
  toast('Event deleted', { type: 'success' });
  await loadEvents();
}

async function duplicateEvent(id) {
  const original = events.find(e => e.id === id);
  if (!original) return;
  const maxOrder = events.reduce((m, x) => Math.max(m, Number(x.order ?? 0)), 0);
  const copy = {
    ...original,
    id: crypto.randomUUID(),
    name: `${original.name ?? 'Event'} (copy)`,
    order: maxOrder + 1
  };
  await apiPost('/admin/api/events/save', copy, { loadingLabel: 'Duplicating event…' });
  toast('Event duplicated', { type: 'success' });
  await loadEvents();
}

function onTableClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openEdit(id);
  if (action === 'del') deleteEvent(id);
  if (action === 'dup') duplicateEvent(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export async function initEvents() {
  tableBody = document.getElementById('events-table-body');
  addBtn = document.getElementById('add-event-btn');
  modal = document.getElementById('event-modal');
  form = document.getElementById('event-form');
  cancelBtn = document.getElementById('event-cancel');
  modalTitle = document.getElementById('event-modal-title');
  vendorsSelect = document.getElementById('event-vendors');
  locationSelect = document.getElementById('event-location-id');
  locationCustomWrap = document.getElementById('event-location-custom-wrap');

  if (!tableBody || !addBtn || !modal || !form) return;

  addBtn.addEventListener('click', openAdd);
  cancelBtn?.addEventListener('click', () => closeModal(modal));
  form.addEventListener('submit', saveEvent);
  tableBody.addEventListener('click', onTableClick);

  locationSelect?.addEventListener('change', onLocationChange);

  await Promise.all([loadVendors(), loadLocations(), loadRsvps()]);
  await loadEvents();
  
  unsubVendors?.();
  unsubLocations?.();
  unsubRsvps?.();

  unsubVendors = bus.on('vendors:updated', (v) => {
	vendors = Array.isArray(v) ? v : vendors;
	populateVendorsSelect(selectedVendorIds());
});

  unsubLocations = bus.on('locations:updated', (l) => {
	locations = Array.isArray(l) ? l : locations;
	populateLocationSelect(locationSelect?.value);
	renderTable();
});

  unsubRsvps = bus.on('rsvp:updated', (list) => {
	rsvps = Array.isArray(list) ? list : rsvps;
	renderTable();
});
}