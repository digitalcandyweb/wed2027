import { showLoading, hideLoading, toast } from '../core/ui.js';

// Shared API wrapper for admin modules
export async function apiGet(url, { loadingLabel = 'Loading…' } = {}) {
  return apiRequest(url, { method: 'GET' }, loadingLabel);
}

export async function apiPost(url, body, { loadingLabel = 'Saving…' } = {}) {
  return apiRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {})
  }, loadingLabel);
}

async function apiRequest(url, init, loadingLabel) {
  showLoading(loadingLabel);
  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init.headers || {})
      }
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const msg = (data && data.error) ? data.error : `Request failed (${res.status})`;
      toast(msg, { type: 'error' });
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    hideLoading();
  }
}
