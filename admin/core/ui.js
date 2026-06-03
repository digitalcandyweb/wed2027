// Shared UI helpers for the admin app
// - ESC closes modals
// - Autofocus first input on open
// - Toast notifications
// - Global loading overlay

let loadingCount = 0;
let overlayEl;
let toastRoot;
let injected = false;

export function initUI() {
  if (injected) return;
  injected = true;

  injectBaseStyles();
  ensureToastRoot();
  ensureLoadingOverlay();
  wireEscapeForModals();
}

function injectBaseStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .muted{color:var(--text-muted,#6b7280)}
  `;
  document.head.appendChild(style);
}

// ----------------------------
// Loading overlay
// ----------------------------
export function showLoading(label = 'Loading…') {
  ensureLoadingOverlay();
  loadingCount++;
  overlayEl.querySelector('[data-loading-label]').textContent = label;
  overlayEl.classList.add('visible');
}

export function hideLoading() {
  if (!overlayEl) return;
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) overlayEl.classList.remove('visible');
}

function ensureLoadingOverlay() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'global-loading-overlay';
  overlayEl.innerHTML = `
    <div class="glo-inner" role="status" aria-live="polite">
      <div class="glo-spinner" aria-hidden="true"></div>
      <div class="glo-text" data-loading-label>Loading…</div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #global-loading-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:6000;background:rgba(0,0,0,.35);backdrop-filter:blur(2px)}
    #global-loading-overlay.visible{display:flex}
    #global-loading-overlay .glo-inner{display:flex;gap:10px;align-items:center;background:var(--bg-elevated,#fff);color:var(--text-main,#111);border:1px solid var(--border-subtle,#ddd);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-soft,0 12px 30px rgba(0,0,0,.15))}
    #global-loading-overlay .glo-spinner{width:18px;height:18px;border-radius:999px;border:2px solid rgba(0,0,0,.15);border-top-color:var(--accent,#2563eb);animation:gloSpin .9s linear infinite}
    @keyframes gloSpin{to{transform:rotate(360deg)}}
    #global-loading-overlay .glo-text{font-size:13px;font-weight:600}
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlayEl);
}

// ----------------------------
// Toast notifications
// ----------------------------
export function toast(message, { type = 'info', timeout = 2500 } = {}) {
  ensureToastRoot();

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="toast-dot" aria-hidden="true"></span>
    <span class="toast-msg"></span>
    <button class="toast-x" aria-label="Dismiss">×</button>
  `;
  el.querySelector('.toast-msg').textContent = message;
  el.querySelector('.toast-x').addEventListener('click', () => removeToast(el));

  toastRoot.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-in'));
  if (timeout > 0) setTimeout(() => removeToast(el), timeout);
}

function removeToast(el) {
  if (!el || el._removing) return;
  el._removing = true;
  el.classList.remove('toast-in');
  el.classList.add('toast-out');
  setTimeout(() => el.remove(), 180);
}

function ensureToastRoot() {
  if (toastRoot) return;

  toastRoot = document.createElement('div');
  toastRoot.id = 'toast-root';

  const style = document.createElement('style');
  style.textContent = `
    #toast-root{position:fixed;right:14px;top:14px;z-index:7000;display:flex;flex-direction:column;gap:10px;max-width:360px}
    .toast{display:grid;grid-template-columns:10px 1fr 24px;gap:10px;align-items:center;
      background:var(--bg-elevated,#fff);color:var(--text-main,#111);border:1px solid var(--border-subtle,#ddd);
      border-radius:12px;padding:10px 12px;box-shadow:var(--shadow-soft,0 14px 30px rgba(0,0,0,.12));
      opacity:0;transform:translateY(-6px);transition:opacity 160ms ease, transform 160ms ease}
    .toast.toast-in{opacity:1;transform:translateY(0)}
    .toast.toast-out{opacity:0;transform:translateY(-6px)}
    .toast-dot{width:10px;height:10px;border-radius:999px;background:var(--accent,#2563eb)}
    .toast-success .toast-dot{background:#16a34a}
    .toast-error .toast-dot{background:#dc2626}
    .toast-warn .toast-dot{background:#f59e0b}
    .toast-msg{font-size:13px;line-height:1.3}
    .toast-x{border:none;background:transparent;color:var(--text-muted,#666);font-size:18px;cursor:pointer;line-height:1}
    .toast-x:hover{color:var(--text-main,#111)}
  `;
  document.head.appendChild(style);
  document.body.appendChild(toastRoot);
}

// ----------------------------
// Modals
// ----------------------------
export function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  const focusable = modalEl.querySelector('input:not([type="hidden"]), select, textarea, button');
  if (focusable) setTimeout(() => { try { focusable.focus(); } catch {} }, 20);
}

export function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
}

function wireEscapeForModals() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modals = [...document.querySelectorAll('.modal:not(.hidden)')];
    if (!modals.length) return;
    closeModal(modals[modals.length - 1]);
  });
}