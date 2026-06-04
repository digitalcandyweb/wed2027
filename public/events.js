// public/events.js
// Dynamic event cards from GET /api/events

(async function () {
  const container = document.getElementById("events-list");
  if (!container) return;

  try {
    const res = await fetch("/api/events", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to load events");
    const events = await res.json();

    if (!Array.isArray(events) || !events.length) {
      container.innerHTML = `<p class="muted">No events announced yet.</p>`;
      return;
    }

    container.innerHTML = "";

    for (const ev of events) {
      const loc = ev.locationObj || null;

      const dateStr = ev.date ? formatDate(ev.date) : "";
      const metaParts = [];
      if (dateStr) metaParts.push(dateStr);
      if (ev.location) metaParts.push(ev.location);
      if (ev.venue) metaParts.push(ev.venue);

      const photos = Array.isArray(ev.photos) ? ev.photos : [];
      const carouselHtml = photos.length ? renderCarousel(photos, ev.id || ev.name || "ev") : "";

      const mapsUrl = loc?.mapsUrl || "";
      const webUrl = loc?.website || "";

      const mapEmbedHtml = isGoogleMapsEmbed(mapsUrl) ? renderMapEmbed(mapsUrl, ev.name || "Map") : "";

      const websiteLinkHtml = webUrl
        ? `<div class="event-website"><a href="${escapeAttr(webUrl)}" target="_blank" rel="noreferrer">Website</a></div>`
        : "";

      const mapsLinkHtml = (!mapEmbedHtml && mapsUrl)
        ? `<div class="event-maps"><a href="${escapeAttr(mapsUrl)}" target="_blank" rel="noreferrer">Google Maps</a></div>`
        : "";

      const desc = String(ev.description || "").trim();
      const locDesc = String(loc?.description || "").trim();
      const bodyText = desc || locDesc;

      const card = document.createElement("article");
      card.className = "event-card event-card--dynamic";

      // Text FIRST, media row underneath
      card.innerHTML = `
        <div class="event-body">
          <h3 class="event-title">${escapeHtml(ev.name || "Event")}</h3>
          ${metaParts.length ? `<p class="event-meta">${escapeHtml(metaParts.join(" · "))}</p>` : ""}
          ${bodyText ? `<p class="event-text">${escapeHtml(bodyText)}</p>` : ""}
        </div>

        <div class="event-media-row">
          ${carouselHtml ? `
            <div class="event-media-col event-photo-col">
              <div class="event-photo">${carouselHtml}</div>
              ${websiteLinkHtml}
            </div>
          ` : ""}

          ${(mapEmbedHtml || mapsLinkHtml) ? `
            <div class="event-media-col event-map-col">
              ${mapEmbedHtml ? `<div class="map-embed">${mapEmbedHtml}</div>` : ""}
              ${mapsLinkHtml}
            </div>
          ` : ""}
        </div>
      `;

      container.appendChild(card);
    }

    initCarousels(container);

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">Events are temporarily unavailable.</p>`;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return String(iso);
    }
  }

  function isGoogleMapsEmbed(src) {
    return typeof src === "string" && src.startsWith("https://www.google.com/maps/embed?");
  }

  function renderMapEmbed(src, title) {
    const safeTitle = escapeAttr(title || "Map");
    const safeSrc = escapeAttr(src);
    return `<iframe src="${safeSrc}" title="${safeTitle}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  }

  function renderCarousel(urls, key) {
    const safeKey = String(key).replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || "ev";

    const imgs = urls
      .map((u, i) =>
        `<img src="${escapeAttr(u)}" alt="${escapeAttr("Event photo " + (i + 1))}" class="carousel-image${i === 0 ? " active" : ""}">`
      )
      .join("");

    const dots = urls
      .map((_, i) =>
        `<button class="dot${i === 0 ? " active" : ""}" aria-label="Go to image ${i + 1}"></button>`
      )
      .join("");

    return `
      <div class="carousel" data-carousel="${safeKey}">
        <div class="carousel-track">${imgs}</div>
        <button class="carousel-control prev" aria-label="Previous image">‹</button>
        <button class="carousel-control next" aria-label="Next image">›</button>
        <div class="carousel-dots">${dots}</div>
      </div>
    `;
  }

  function initCarousels(root) {
    root.querySelectorAll("[data-carousel]").forEach((carousel) => {
      const images = carousel.querySelectorAll(".carousel-image");
      const dots = carousel.querySelectorAll(".dot");
      const prevBtn = carousel.querySelector(".prev");
      const nextBtn = carousel.querySelector(".next");
      let index = 0;

      function showSlide(i) {
        images.forEach((img, idx) => img.classList.toggle("active", idx === i));
        dots.forEach((dot, idx) => dot.classList.toggle("active", idx === i));
        index = i;
      }

      prevBtn?.addEventListener("click", () => showSlide((index - 1 + images.length) % images.length));
      nextBtn?.addEventListener("click", () => showSlide((index + 1) % images.length));
      dots.forEach((dot, idx) => dot.addEventListener("click", () => showSlide(idx)));
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>\"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/\s+/g, " ").trim();
  }
})();