// Tiny event bus so modules can refresh shared state
// Example: bus.emit('events:updated', events)
export const bus = (() => {
  const listeners = new Map();
  function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => off(type, fn);
  }
  function off(type, fn) {
    const set = listeners.get(type);
    if (set) set.delete(fn);
  }
  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error('bus handler failed', type, e); }
    }
  }
  return { on, off, emit };
})();
