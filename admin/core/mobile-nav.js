// Mobile sidebar navigation (off-canvas drawer)

export function initMobileNav() {
  const sidebar = document.querySelector('.sidebar');
  const topbarLeft = document.querySelector('.topbar-left');
  if (!sidebar || !topbarLeft) return;

  // Create overlay
  let overlay = document.getElementById('mobile-nav-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mobile-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }

  // Create hamburger button (shown only on mobile via CSS)
  let btn = document.getElementById('mobile-nav-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'mobile-nav-toggle';
    btn.className = 'button add-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open navigation');
    btn.setAttribute('aria-controls', 'sidebar');
    btn.innerHTML = '☰';
    topbarLeft.prepend(btn);
  }

  function open() {
    sidebar.classList.add('mobile-open');
    document.body.classList.add('nav-open');
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => sidebar.querySelector('.nav-item')?.focus?.(), 10);
  }

  function close() {
    sidebar.classList.remove('mobile-open');
    document.body.classList.remove('nav-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    if (sidebar.classList.contains('mobile-open')) close();
    else open();
  }

  btn.addEventListener('click', toggle);
  overlay.addEventListener('click', close);

  // Close on nav click (mobile)
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item')) close();
  });

  // ESC closes drawer if open and no modal is open
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.modal:not(.hidden)')) return;
    if (sidebar.classList.contains('mobile-open')) close();
  });
}