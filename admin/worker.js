/**
 * wed2027 Cloudflare Worker (fixed to match your Cloudflare bindings)
 *
 * Bindings:
 *   budget_kv, events_kv, planner_kv, RSVP_KV, settings_kv
 *
 * Fixes:
 * - settings endpoints (were corrupted in ExistingWorker.js)
 * - adds RSVP endpoints required by admin: /admin/api/list and /admin/api/delete/:id
 * - adds /admin/api/settings/reset
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ------------------------------
      // EVENTS
      // ------------------------------
      if (path === "/admin/api/events" && request.method === "GET") {
        const events = await kvGet(env.events_kv, "events", []);
        return json(events);
      }

      if (path === "/admin/api/events/save" && request.method === "POST") {
        const body = await readJson(request);
        const events = await kvGet(env.events_kv, "events", []);

        if (body && body.id) {
          const idx = events.findIndex(e => e.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? events[idx].order;
            events[idx] = body;
          }
        } else {
          body.id = crypto.randomUUID();
          body.order = maxOrder(events) + 1;
          events.push(body);
        }

        events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(env.events_kv, "events", events);
        return json({ ok: true });
      }

      if (path.startsWith("/admin/api/events/delete/") && request.method === "POST") {
        const id = decodeURIComponent(path.split("/").pop());
        let events = await kvGet(env.events_kv, "events", []);
        events = events.filter(e => e.id !== id);
        await kvPut(env.events_kv, "events", events);
        return json({ ok: true });
      }

      if (path === "/admin/api/events/reorder" && request.method === "POST") {
        const newOrder = await readJson(request); // array of IDs
        let events = await kvGet(env.events_kv, "events", []);
        if (Array.isArray(newOrder)) {
          events.forEach(e => {
            const pos = newOrder.indexOf(e.id);
            if (pos >= 0) e.order = pos + 1;
          });
        }
        events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(env.events_kv, "events", events);
        return json({ ok: true });
      }

      // ------------------------------
      // BUDGET
      // ------------------------------
      if (path === "/admin/api/budget" && request.method === "GET") {
        const expenses = await kvGet(env.budget_kv, "budget", []);
        return json(expenses);
      }

      if (path === "/admin/api/budget/save" && request.method === "POST") {
        const body = await readJson(request);
        const expenses = await kvGet(env.budget_kv, "budget", []);

        if (body && body.id) {
          const idx = expenses.findIndex(e => e.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? expenses[idx].order;
            expenses[idx] = body;
          }
        } else {
          body.id = crypto.randomUUID();
          body.order = maxOrder(expenses) + 1;
          expenses.push(body);
        }

        expenses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(env.budget_kv, "budget", expenses);
        return json({ ok: true });
      }

      if (path.startsWith("/admin/api/budget/delete/") && request.method === "POST") {
        const id = decodeURIComponent(path.split("/").pop());
        let expenses = await kvGet(env.budget_kv, "budget", []);
        expenses = expenses.filter(e => e.id !== id);
        await kvPut(env.budget_kv, "budget", expenses);
        return json({ ok: true });
      }

      if (path === "/admin/api/budget/reorder" && request.method === "POST") {
        const newOrder = await readJson(request);
        let expenses = await kvGet(env.budget_kv, "budget", []);
        if (Array.isArray(newOrder)) {
          expenses.forEach(e => {
            const pos = newOrder.indexOf(e.id);
            if (pos >= 0) e.order = pos + 1;
          });
        }
        expenses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(env.budget_kv, "budget", expenses);
        return json({ ok: true });
      }

      // ------------------------------
      // SETTINGS (FIXED)
      // ------------------------------
      if (path === "/admin/api/settings" && request.method === "GET") {
        const settings = await kvGet(env.settings_kv, "settings", defaultSettings());
        return json(settings);
      }

      if (path === "/admin/api/settings/save" && request.method === "POST") {
        const body = await readJson(request);
        if (!body || typeof body !== 'object') return json({ error: 'Invalid settings object' }, 400);
        await kvPut(env.settings_kv, "settings", body);
        return json({ ok: true });
      }

      if (path === "/admin/api/settings/reset" && request.method === "POST") {
        await kvPut(env.settings_kv, "settings", defaultSettings());
        return json({ ok: true });
      }

      // ------------------------------
      // PLANNER
      // ------------------------------
      if (path === "/admin/api/planner" && request.method === "GET") {
        const tasks = await kvGet(env.planner_kv, "tasks", []);
        return json(tasks);
      }

      if (path === "/admin/api/planner/save" && request.method === "POST") {
        const body = await readJson(request);
        const tasks = await kvGet(env.planner_kv, "tasks", []);

        if (body && body.id) {
          const idx = tasks.findIndex(t => t.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? tasks[idx].order;
            tasks[idx] = body;
          }
        } else {
          body.id = crypto.randomUUID();
          body.order = maxOrder(tasks) + 1;
          tasks.push(body);
        }

        tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(env.planner_kv, "tasks", tasks);
        return json({ ok: true });
      }

      if (path.startsWith("/admin/api/planner/delete/") && request.method === "POST") {
        const id = decodeURIComponent(path.split("/").pop());
        let tasks = await kvGet(env.planner_kv, "tasks", []);
        tasks = tasks.filter(t => t.id !== id);
        await kvPut(env.planner_kv, "tasks", tasks);
        return json({ ok: true });
      }

      // ------------------------------
      // RSVP (ADMIN) — uses binding RSVP_KV
      // ------------------------------
      if (path === "/admin/api/list" && request.method === "GET") {
        const rsvps = await kvGet(env.RSVP_KV, "rsvps", []);
        return json(rsvps);
      }

      if (path.startsWith("/admin/api/delete/") && request.method === "POST") {
        const id = decodeURIComponent(path.split("/").pop());
        let rsvps = await kvGet(env.RSVP_KV, "rsvps", []);
        rsvps = rsvps.filter(r => r.id !== id);
        await kvPut(env.RSVP_KV, "rsvps", rsvps);
        return json({ ok: true });
      }

      // Public endpoint for later (public site render)
      if (path === "/api/site" && request.method === "GET") {
        const settings = await kvGet(env.settings_kv, "settings", defaultSettings());
        const events = await kvGet(env.events_kv, "events", []);
        return json({ settings, events }, 200, true);
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('worker error', err);
      return json({ error: 'Server error', detail: String(err?.message || err) }, 500);
    }
  }
};

function defaultSettings() {
  return {
    siteTitle: '', footerText: '', accent: '#ff3366',
    heroTitle: '', heroSubtitle: '', heroDescription: '',
    travelOverview: '', travelAirports: '', travelTransport: '',
    accomOverview: '', accomHotels: '',
    faq: '', custom1: '', custom2: '',
    eventBlocks: {}
  };
}

function maxOrder(arr) {
  let max = 0;
  for (const item of arr) {
    const o = Number(item?.order);
    if (!Number.isNaN(o)) max = Math.max(max, o);
  }
  return max;
}

async function kvGet(ns, key, fallback) {
  if (!ns) throw new Error(`Missing KV binding for '${key}'`);
  const val = await ns.get(key, { type: 'json' });
  return (val === null || val === undefined) ? fallback : val;
}

async function kvPut(ns, key, value) {
  if (!ns) throw new Error(`Missing KV binding for '${key}'`);
  await ns.put(key, JSON.stringify(value));
}

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

function json(data, status = 200, cachePublic = false) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  headers['Cache-Control'] = cachePublic ? 'public, max-age=60' : 'no-store';
  return new Response(JSON.stringify(data), { status, headers });
}