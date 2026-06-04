/**
 * wed2027 Cloudflare Worker
 * Phase 2 (Locations + rich events)
 * Version: 1.1.0
 *
 * KV bindings supported (we accept either singular or plural binding names):
 * - events_kv
 * - settings_kv
 * - RSVP_KV
 * - budget_kv
 * - planner_kv
 * - vendors_kv
 * - contacts_kv
 * - wedding_kv
 * - locations_kv
 */

const WORKER_VERSION = "1.1.0";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ------------------------------
      // HEALTH
      // ------------------------------
      if (path === "/admin/api/health" && request.method === "GET") {
        return json({ status: "ok", version: WORKER_VERSION, time: new Date().toISOString() });
      }

      // ------------------------------
      // PUBLIC: Events (rich)
      // ------------------------------
      if (path === "/api/events" && request.method === "GET") {
        const events = await kvGet(env.events_kv, "events", []);
        const locationsNs = getLocationsNs(env);
        const locations = locationsNs ? await kvGet(locationsNs, "locations", []) : [];
        const locById = new Map((Array.isArray(locations) ? locations : []).map(l => [l.id, l]));

        const out = (Array.isArray(events) ? events : [])
          .filter(e => e && e.visible !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(e => {
            const loc = e.locationId ? locById.get(e.locationId) : null;
            const eventPhotos = normaliseUrlList(e.photoUrls);
            const locPhotos = loc ? normaliseUrlList(loc.photoUrls) : [];
            const photos = eventPhotos.length ? eventPhotos : locPhotos;

            return {
              id: e.id,
              name: e.name ?? e.id,
              date: e.date ?? null,
              venue: e.venue ?? "",
              // for backwards compatibility (RSVP dropdown)
              location: loc?.name || e.location || "",

              // richer fields
              description: e.description ?? "",
              timeline: e.timeline ?? [],
              capacity: (e.capacity === 0 || e.capacity) ? e.capacity : null,

              locationId: e.locationId ?? null,
              locationObj: loc ? {
                id: loc.id,
                name: loc.name ?? "",
                description: loc.description ?? "",
                website: loc.website ?? "",
                mapsUrl: loc.mapsUrl ?? "",
                area: loc.area ?? "",
                photoUrls: locPhotos
              } : null,

              photos
            };
          });

        return json(out, 200, true);
      }

      // ------------------------------
      // PUBLIC: RSVP submit (form or AJAX)
      // ------------------------------
      if (path === "/rsvp-submit" && request.method === "POST") {
        const ct = request.headers.get("content-type") || "";
        const accept = request.headers.get("accept") || "";

        let body = null;
        if (ct.includes("application/json")) {
          body = await readJson(request);
        } else {
          const text = await request.text();
          const params = new URLSearchParams(text);
          body = Object.fromEntries(params.entries());
        }

        const name = String(body?.name ?? "").trim();
        const email = String(body?.email ?? "").trim();
        const phone = String(body?.phone ?? "").trim();
        const event = String(body?.event ?? "").trim();
        const message = String(body?.message ?? body?.notes ?? "").trim();

        const attendingRaw = String(body?.attending ?? "").toLowerCase();
        const attending = (attendingRaw === "yes" || attendingRaw === "true" || attendingRaw === "attending");

        const guestsRaw = body?.guests ?? "1";
        const guestsNum = parseInt(String(guestsRaw), 10);
        const guests = Number.isFinite(guestsNum) && guestsNum > 0 ? guestsNum : 1;

        if (!name || !email || !event) {
          return json({ error: "Missing required fields (name, email, event)" }, 400);
        }

        const record = {
          id: crypto.randomUUID(),
          name,
          email,
          phone,
          event,
          attending,
          guests,
          notes: message,
          timestamp: Date.now()
        };

        const rsvps = await kvGet(env.RSVP_KV, "rsvps", []);
        const list = Array.isArray(rsvps) ? rsvps : [];
        list.push(record);
        await kvPut(env.RSVP_KV, "rsvps", list);

        if (accept.includes("application/json")) {
          return json({ ok: true, id: record.id });
        }
        return Response.redirect("/thankyou.html", 303);
      }

      // ------------------------------
      // ADMIN: Events
      // ------------------------------
      if (path === "/admin/api/events" && request.method === "GET") {
        const events = await kvGet(env.events_kv, "events", []);
        return json(Array.isArray(events) ? events : []);
      }

      if (path === "/admin/api/events/save" && request.method === "POST") {
        const body = await readJson(request);
        let events = await kvGet(env.events_kv, "events", []);
        events = Array.isArray(events) ? events : [];

        if (body && body.id) {
          const idx = events.findIndex(e => e.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? events[idx].order;
            events[idx] = body;
          } else {
            body.order = body.order ?? (maxOrder(events) + 1);
            events.push(body);
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
        events = (Array.isArray(events) ? events : []).filter(e => e.id !== id);
        await kvPut(env.events_kv, "events", events);
        return json({ ok: true });
      }

      if (path === "/admin/api/events/reorder" && request.method === "POST") {
        const newOrder = await readJson(request);
        let events = await kvGet(env.events_kv, "events", []);
        events = Array.isArray(events) ? events : [];
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
      // ADMIN: Locations (standalone)
      // ------------------------------
      if (path === "/admin/api/locations" && request.method === "GET") {
        const ns = getLocationsNs(env);
        const locations = ns ? await kvGet(ns, "locations", []) : [];
        return json(Array.isArray(locations) ? locations : []);
      }

      if (path === "/admin/api/locations/save" && request.method === "POST") {
        const ns = getLocationsNs(env);
        if (!ns) return json({ error: "Missing KV binding for locations" }, 500);

        const body = await readJson(request);
        let locations = await kvGet(ns, "locations", []);
        locations = Array.isArray(locations) ? locations : [];

        if (body && body.id) {
          const idx = locations.findIndex(l => l.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? locations[idx].order;
            locations[idx] = body;
          } else {
            body.order = body.order ?? (maxOrder(locations) + 1);
            locations.push(body);
          }
        } else {
          body.id = crypto.randomUUID();
          body.order = maxOrder(locations) + 1;
          locations.push(body);
        }

        locations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(ns, "locations", locations);
        return json({ ok: true });
      }

      if (path.startsWith("/admin/api/locations/delete/") && request.method === "POST") {
        const ns = getLocationsNs(env);
        if (!ns) return json({ error: "Missing KV binding for locations" }, 500);

        const id = decodeURIComponent(path.split("/").pop());
        let locations = await kvGet(ns, "locations", []);
        locations = (Array.isArray(locations) ? locations : []).filter(l => l.id !== id);
        await kvPut(ns, "locations", locations);
        return json({ ok: true });
      }

      // ------------------------------
      // ADMIN: RSVP list + delete
      // ------------------------------
      if (path === "/admin/api/list" && request.method === "GET") {
        const rsvps = await kvGet(env.RSVP_KV, "rsvps", []);
        return json(Array.isArray(rsvps) ? rsvps : []);
      }

      if (path.startsWith("/admin/api/delete/") && request.method === "POST") {
        const id = decodeURIComponent(path.split("/").pop());
        let rsvps = await kvGet(env.RSVP_KV, "rsvps", []);
        rsvps = (Array.isArray(rsvps) ? rsvps : []).filter(r => r.id !== id);
        await kvPut(env.RSVP_KV, "rsvps", rsvps);
        return json({ ok: true });
      }

      // ------------------------------
      // ADMIN: Settings (site)
      // ------------------------------
      if (path === "/admin/api/settings" && request.method === "GET") {
        const settings = await kvGet(env.settings_kv, "settings", defaultSettings());
        return json(settings);
      }

      if (path === "/admin/api/settings/save" && request.method === "POST") {
        const body = await readJson(request);
        if (!body || typeof body !== "object") return json({ error: "Invalid settings object" }, 400);
        await kvPut(env.settings_kv, "settings", body);
        return json({ ok: true });
      }

      if (path === "/admin/api/settings/reset" && request.method === "POST") {
        await kvPut(env.settings_kv, "settings", defaultSettings());
        return json({ ok: true });
      }

      // ------------------------------
      // ADMIN: Budget
      // ------------------------------
      if (path === "/admin/api/budget" && request.method === "GET") {
        const expenses = await kvGet(env.budget_kv, "budget", []);
        return json(Array.isArray(expenses) ? expenses : []);
      }

      if (path === "/admin/api/budget/save" && request.method === "POST") {
        const body = await readJson(request);
        let expenses = await kvGet(env.budget_kv, "budget", []);
        expenses = Array.isArray(expenses) ? expenses : [];

        if (body && body.id) {
          const idx = expenses.findIndex(e => e.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? expenses[idx].order;
            expenses[idx] = body;
          } else {
            body.order = body.order ?? (maxOrder(expenses) + 1);
            expenses.push(body);
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
        expenses = (Array.isArray(expenses) ? expenses : []).filter(e => e.id !== id);
        await kvPut(env.budget_kv, "budget", expenses);
        return json({ ok: true });
      }

      if (path === "/admin/api/budget/reorder" && request.method === "POST") {
        const newOrder = await readJson(request);
        let expenses = await kvGet(env.budget_kv, "budget", []);
        expenses = Array.isArray(expenses) ? expenses : [];
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
      // ADMIN: Planner
      // ------------------------------
      if (path === "/admin/api/planner" && request.method === "GET") {
        const tasks = await kvGet(env.planner_kv, "tasks", []);
        return json(Array.isArray(tasks) ? tasks : []);
      }

      if (path === "/admin/api/planner/save" && request.method === "POST") {
        const body = await readJson(request);
        let tasks = await kvGet(env.planner_kv, "tasks", []);
        tasks = Array.isArray(tasks) ? tasks : [];

        if (body && body.id) {
          const idx = tasks.findIndex(t => t.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? tasks[idx].order;
            tasks[idx] = body;
          } else {
            body.order = body.order ?? (maxOrder(tasks) + 1);
            tasks.push(body);
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
        tasks = (Array.isArray(tasks) ? tasks : []).filter(t => t.id !== id);
        await kvPut(env.planner_kv, "tasks", tasks);
        return json({ ok: true });
      }

      // ------------------------------
      // ADMIN: Vendors
      // ------------------------------
      if (path === "/admin/api/vendors" && request.method === "GET") {
        const ns = env.vendors_kv;
        const vendors = ns ? await kvGet(ns, "vendors", []) : [];
        return json(Array.isArray(vendors) ? vendors : []);
      }

      if (path === "/admin/api/vendors/save" && request.method === "POST") {
        const ns = env.vendors_kv;
        if (!ns) return json({ error: "Missing KV binding for vendors" }, 500);
        const body = await readJson(request);
        let vendors = await kvGet(ns, "vendors", []);
        vendors = Array.isArray(vendors) ? vendors : [];
        if (body && body.id) {
          const idx = vendors.findIndex(v => v.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? vendors[idx].order;
            vendors[idx] = body;
          } else {
            body.order = body.order ?? (maxOrder(vendors) + 1);
            vendors.push(body);
          }
        } else {
          body.id = crypto.randomUUID();
          body.order = maxOrder(vendors) + 1;
          vendors.push(body);
        }
        vendors.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(ns, "vendors", vendors);
        return json({ ok: true });
      }

      if (path.startsWith("/admin/api/vendors/delete/") && request.method === "POST") {
        const ns = env.vendors_kv;
        if (!ns) return json({ error: "Missing KV binding for vendors" }, 500);
        const id = decodeURIComponent(path.split("/").pop());
        let vendors = await kvGet(ns, "vendors", []);
        vendors = (Array.isArray(vendors) ? vendors : []).filter(v => v.id !== id);
        await kvPut(ns, "vendors", vendors);
        return json({ ok: true });
      }

      // ------------------------------
      // ADMIN: Contacts
      // ------------------------------
      if (path === "/admin/api/contacts" && request.method === "GET") {
        const ns = getContactsNs(env);
        const contacts = ns ? await kvGet(ns, "contacts", []) : [];
        return json(Array.isArray(contacts) ? contacts : []);
      }

      if (path === "/admin/api/contacts/save" && request.method === "POST") {
        const ns = getContactsNs(env);
        if (!ns) return json({ error: "Missing KV binding for contacts" }, 500);
        const body = await readJson(request);
        let contacts = await kvGet(ns, "contacts", []);
        contacts = Array.isArray(contacts) ? contacts : [];
        if (body && body.id) {
          const idx = contacts.findIndex(c => c.id === body.id);
          if (idx !== -1) {
            body.order = body.order ?? contacts[idx].order;
            contacts[idx] = body;
          } else {
            body.order = body.order ?? (maxOrder(contacts) + 1);
            contacts.push(body);
          }
        } else {
          body.id = crypto.randomUUID();
          body.order = maxOrder(contacts) + 1;
          contacts.push(body);
        }
        contacts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await kvPut(ns, "contacts", contacts);
        return json({ ok: true });
      }

      if (path.startsWith("/admin/api/contacts/delete/") && request.method === "POST") {
        const ns = getContactsNs(env);
        if (!ns) return json({ error: "Missing KV binding for contacts" }, 500);
        const id = decodeURIComponent(path.split("/").pop());
        let contacts = await kvGet(ns, "contacts", []);
        contacts = (Array.isArray(contacts) ? contacts : []).filter(c => c.id !== id);
        await kvPut(ns, "contacts", contacts);
        return json({ ok: true });
      }

      // ------------------------------
      // ADMIN: Wedding
      // ------------------------------
      if (path === "/admin/api/wedding" && request.method === "GET") {
        const ns = env.wedding_kv;
        const w = ns ? await kvGet(ns, "wedding", defaultWedding()) : defaultWedding();
        return json(w);
      }

      if (path === "/admin/api/wedding/save" && request.method === "POST") {
        const ns = env.wedding_kv;
        if (!ns) return json({ error: "Missing KV binding for wedding" }, 500);
        const body = await readJson(request);
        if (!body || typeof body !== "object") return json({ error: "Invalid wedding object" }, 400);
        await kvPut(ns, "wedding", body);
        return json({ ok: true });
      }

      if (path === "/admin/api/wedding/reset" && request.method === "POST") {
        const ns = env.wedding_kv;
        if (!ns) return json({ error: "Missing KV binding for wedding" }, 500);
        await kvPut(ns, "wedding", defaultWedding());
        return json({ ok: true });
      }

      return json({ error: "Not Found" }, 404);
    } catch (err) {
      return json({ error: err?.message || "Server error" }, 500);
    }
  }
};

function getLocationsNs(env) {
  return env.locations_kv || env.location_kv || null;
}
function getContactsNs(env) {
  return env.contacts_kv || env.contact_kv || null;
}

function defaultSettings() {
  return {
    siteTitle: "", footerText: "", accent: "#ff3366",
    heroTitle: "", heroSubtitle: "", heroDescription: "",
    travelOverview: "", travelAirports: "", travelTransport: "",
    accomOverview: "", accomHotels: "",
    faq: "", custom1: "", custom2: "",
    eventBlocks: {}
  };
}

function defaultWedding() {
  return {
    couple: "Claire & Brad",
    contactEmail: "rsvp@digitalcandy.win",
    contactPhone: "",
    dateEngagement: "",
    dateWedding: "",
    dateCelebration: "",
    notes: ""
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

function normaliseUrlList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(x => String(x).trim()).filter(Boolean);
  // allow newline-separated
  return String(value).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}

async function kvGet(ns, key, fallback) {
  if (!ns) throw new Error(`Missing KV binding for '${key}'`);
  const val = await ns.get(key, { type: "json" });
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
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  headers["Cache-Control"] = cachePublic ? "public, max-age=60" : "no-store";
  return new Response(JSON.stringify(data), { status, headers });
}
