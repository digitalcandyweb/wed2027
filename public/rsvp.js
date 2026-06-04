    // Populate RSVP events from Worker public endpoint
    async function hydrateRsvpEvents() {
      const select = document.getElementById('event');
      try {
        const res = await fetch('/api/events', { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('Events fetch failed: ' + res.status);
        const data = await res.json();
        const events = Array.isArray(data) ? data : (data.events || []);

        select.innerHTML = '<option value="">Please select…</option>';
        for (const ev of events) {
          const opt = document.createElement('option');
          opt.value = ev.id;
          const dateText = ev.date ? ` – ${ev.date}` : '';
          opt.textContent = `${ev.name || ev.id}${dateText}`;
          select.appendChild(opt);
        }
      } catch (e) {
        select.innerHTML = '<option value="">Unable to load events</option>';
        console.error(e);
      }
    }

    hydrateRsvpEvents();

    // AJAX submit (easier testing)
    document.getElementById('rsvpForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const status = document.getElementById('rsvpStatus');
      status.style.display = 'block';
      status.textContent = 'Submitting…';

      try {
        const body = new URLSearchParams(new FormData(form));
        const res = await fetch('/rsvp-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
          body
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(out?.error || `Submit failed (${res.status})`);
        status.textContent = 'Thank you! Your RSVP has been recorded.';
        form.reset();
        // Re-hydrate events because reset clears select
        await hydrateRsvpEvents();
      } catch (err) {
        status.textContent = 'Sorry — we could not submit your RSVP. Please try again.';
        console.error(err);
      }
    });