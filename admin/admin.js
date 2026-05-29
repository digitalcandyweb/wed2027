// Simple section navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.admin-section');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-section-target');

      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      sections.forEach(sec => {
        sec.classList.toggle('hidden', sec.id !== targetId);
      });
    });
  });
}

// Account menu
function initAccountMenu() {
  const button = document.getElementById('account-menu-button');
  const dropdown = document.getElementById('account-menu-dropdown');
  if (!button || !dropdown) return;

  button.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!button.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// Events manager
const EventsManager = (() => {
  let events = [];
  let eventToDelete = null;

  let eventsTableBody;
  let addEventBtn;
  let reorderEventsBtn;

  let eventModal;
  let deleteEventModal;
  let reorderEventsModal;

  let eventIdInput;
  let eventNameInput;
  let eventDateInput;
  let eventLocationInput;
  let eventVenueInput;
  let eventVisibleInput;
  let eventNotesInput;
  let eventModalTitle;

  let saveEventBtn;
  let confirmDeleteEventBtn;
  let reorderEventsList;
  let saveEventsOrderBtn;

  function init() {
    eventsTableBody = document.getElementById('events-table-body');
    if (!eventsTableBody) return;

    addEventBtn = document.getElementById('add-event-btn');
    reorderEventsBtn = document.getElementById('reorder-events-btn');

    eventModal = document.getElementById('event-modal');
    deleteEventModal = document.getElementById('delete-event-modal');
    reorderEventsModal = document.getElementById('reorder-events-modal');

    eventIdInput = document.getElementById('event-id');
    eventNameInput = document.getElementById('event-name');
    eventDateInput = document.getElementById('event-date');
    eventLocationInput = document.getElementById('event-location');
    eventVenueInput = document.getElementById('event-venue');
    eventVisibleInput = document.getElementById('event-visible');
    eventNotesInput = document.getElementById('event-notes');
    eventModalTitle = document.getElementById('event-modal-title');

    saveEventBtn = document.getElementById('save-event-btn');
    confirmDeleteEventBtn = document.getElementById('confirm-delete-event-btn');
    reorderEventsList = document.getElementById('reorder-events-list');
    saveEventsOrderBtn = document.getElementById('save-events-order-btn');

    addEventBtn.addEventListener('click', () => openEventModal());
    reorderEventsBtn.addEventListener('click', openReorderModal);
    saveEventBtn.addEventListener('click', onSaveEvent);
    confirmDeleteEventBtn.addEventListener('click', onConfirmDelete);
    saveEventsOrderBtn.addEventListener('click', onSaveOrder);

    document.querySelectorAll('[data-close-event-modal]').forEach(btn =>
      btn.addEventListener('click', closeEventModal)
    );
    document.querySelectorAll('[data-close-delete-event-modal]').forEach(btn =>
      btn.addEventListener('click', closeDeleteModal)
    );
    document.querySelectorAll('[data-close-reorder-events-modal]').forEach(btn =>
      btn.addEventListener('click', closeReorderModal)
    );

    // Initial load (stubbed for now)
    fetchEvents();
  }

  async function fetchEvents() {
    // TODO: replace with real Worker call:
    // const res = await fetch('/admin/api/events');
    // events = await res.json();

    // Temporary: start with empty list
    events = events.sort((a, b) => (a.order || 0) - (b.order || 0));
    renderEventsTable();
  }

  function renderEventsTable() {
    eventsTableBody.innerHTML = '';

    if (!events.length) {
      eventsTableBody.innerHTML = `
        <tr><td colspan="7" class="empty-state">No events yet. Click "Add event" to create one.</td></tr>
      `;
      return;
    }

    events.forEach((event, index) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${event.order ?? index + 1}</td>
        <td>${escapeHtml(event.name)}</td>
        <td>${event.date || ''}</td>
        <td>${escapeHtml(event.location || '')}</td>
        <td>${escapeHtml(event.venue || '')}</td>
        <td>
          <span class="badge ${event.visible ? 'visible' : 'hidden'}">
            ${event.visible ? 'Visible' : 'Hidden'}
          </span>
        </td>
        <td>
          <button class="btn-link" data-edit-event="${event.id}">Edit</button>
          <button class="btn-link" data-duplicate-event="${event.id}">Duplicate</button>
          <button class="btn-link danger" data-delete-event="${event.id}">Delete</button>
        </td>
      `;

      eventsTableBody.appendChild(tr);
    });

    eventsTableBody.querySelectorAll('[data-edit-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-event');
        const ev = events.find(e => e.id === id);
        if (ev) openEventModal(ev);
      });
    });

    eventsTableBody.querySelectorAll('[data-delete-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-event');
        eventToDelete = events.find(e => e.id === id) || null;
        if (eventToDelete) openDeleteModal(eventToDelete);
      });
    });

    eventsTableBody.querySelectorAll('[data-duplicate-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-duplicate-event');
        const ev = events.find(e => e.id === id);
        if (ev) duplicateEvent(ev);
      });
    });
  }

  function openEventModal(event = null) {
    if (event) {
      eventModalTitle.textContent = 'Edit event';
      eventIdInput.value = event.id;
      eventNameInput.value = event.name || '';
      eventDateInput.value = event.date || '';
      eventLocationInput.value = event.location || '';
      eventVenueInput.value = event.venue || '';
      eventVisibleInput.checked = !!event.visible;
      eventNotesInput.value = event.notes || '';
    } else {
      eventModalTitle.textContent = 'Add event';
      eventIdInput.value = '';
      eventNameInput.value = '';
      eventDateInput.value = '';
      eventLocationInput.value = '';
      eventVenueInput.value = '';
      eventVisibleInput.checked = true;
      eventNotesInput.value = '';
    }

    eventModal.classList.remove('hidden');
  }

  function closeEventModal() {
    eventModal.classList.add('hidden');
  }

  function openDeleteModal(event) {
    const msg = document.getElementById('delete-event-message');
    msg.textContent = `Delete "${event.name}"? This cannot be undone.`;
    deleteEventModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    deleteEventModal.classList.add('hidden');
    eventToDelete = null;
  }

  function openReorderModal() {
    reorderEventsList.innerHTML = '';

    events
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(ev => {
        const li = document.createElement('li');
        li.setAttribute('draggable', 'true');
        li.dataset.id = ev.id;
        li.innerHTML = `
          <span class="reorder-handle">☰</span>
          <span>${escapeHtml(ev.name)}</span>
        `;
        addDragHandlers(li);
        reorderEventsList.appendChild(li);
      });

    reorderEventsModal.classList.remove('hidden');
  }

  function closeReorderModal() {
    reorderEventsModal.classList.add('hidden');
  }

  function addDragHandlers(li) {
    li.addEventListener('dragstart', () => {
      li.classList.add('dragging');
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
    });

    reorderEventsList.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = reorderEventsList.querySelector('.dragging');
      if (!dragging) return;

      const afterElement = getDragAfterElement(reorderEventsList, e.clientY);
      if (afterElement == null) {
        reorderEventsList.appendChild(dragging);
      } else {
        reorderEventsList.insertBefore(dragging, afterElement);
      }
    });
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  async function onSaveEvent(e) {
    e.preventDefault();

    const id = eventIdInput.value.trim();
    const name = eventNameInput.value.trim();
    if (!name) return;

    const now = new Date().toISOString();
    let event;

    if (id) {
      event = events.find(ev => ev.id === id);
      if (!event) return;
      Object.assign(event, {
        name,
        date: eventDateInput.value || '',
        location: eventLocationInput.value || '',
        venue: eventVenueInput.value || '',
        visible: eventVisibleInput.checked,
        notes: eventNotesInput.value || '',
        updatedAt: now
      });
      // TODO: PUT /admin/api/events/:id
    } else {
      const newId = slugify(name, events);
      const maxOrder = events.reduce((max, ev) => Math.max(max, ev.order || 0), 0);
      event = {
        id: newId,
        name,
        date: eventDateInput.value || '',
        location: eventLocationInput.value || '',
        venue: eventVenueInput.value || '',
        visible: eventVisibleInput.checked,
        notes: eventNotesInput.value || '',
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now
      };
      events.push(event);
      // TODO: POST /admin/api/events
    }

    renderEventsTable();
    closeEventModal();
  }

  async function onConfirmDelete() {
    if (!eventToDelete) return;

    const id = eventToDelete.id;
    // TODO: DELETE /admin/api/events/:id
    events = events.filter(ev => ev.id !== id);
    renderEventsTable();
    closeDeleteModal();
  }

  async function onSaveOrder() {
    const items = [...reorderEventsList.querySelectorAll('li')];
    items.forEach((li, index) => {
      const id = li.dataset.id;
      const ev = events.find(e => e.id === id);
      if (ev) ev.order = index + 1;
    });

    // TODO: PUT /admin/api/events/order
    renderEventsTable();
    closeReorderModal();
  }

  function duplicateEvent(ev) {
    const now = new Date().toISOString();
    const copyName = `${ev.name} (copy)`;
    const newId = slugify(copyName, events);
    const maxOrder = events.reduce((max, e) => Math.max(max, e.order || 0), 0);

    const clone = {
      ...ev,
      id: newId,
      name: copyName,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    };

    events.push(clone);
    // TODO: POST /admin/api/events
    renderEventsTable();
  }

  function slugify(name, existingEvents) {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'event';

    let slug = base;
    let counter = 2;
    const ids = new Set(existingEvents.map(e => e.id));
    while (ids.has(slug)) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, c => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[c] || c;
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAccountMenu();
  EventsManager.init();
  // RSVP + Guests wiring will be added when we hook up the Worker + attendance model.
});
