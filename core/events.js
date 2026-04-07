const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  const handlers = listeners.get(event);
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) listeners.delete(event);
  };
}

export async function emit(event, payload = {}) {
  const handlers = Array.from(listeners.get(event) || []);
  const wildcardHandlers = Array.from(listeners.get("*") || []);
  const allHandlers = [...handlers, ...wildcardHandlers];

  const results = [];
  for (const handler of allHandlers) {
    results.push(await handler(payload, event));
  }

  return results;
}
