const DEMO_TOKEN_STORAGE_KEY = 'facicuse_demo_session_token';

let inMemoryIdToken = null;
let inMemoryDemoToken = null;

function readStoredDemoToken() {
  if (inMemoryDemoToken) return inMemoryDemoToken;
  try {
    const stored = window.sessionStorage.getItem(DEMO_TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryDemoToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage restrictions
  }
  return null;
}

export function setAuthToken(token) {
  inMemoryIdToken = token || null;
}

export function setDemoSessionToken(token) {
  inMemoryDemoToken = token || null;
  try {
    if (token) {
      window.sessionStorage.setItem(DEMO_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(DEMO_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryIdToken) {
    headers.set('Authorization', `Bearer ${inMemoryIdToken}`);
  } else {
    const demoToken = readStoredDemoToken();
    if (demoToken) {
      headers.set('X-Demo-Session', demoToken);
    }
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error('Failed to export CSV report.');
    }
    return response.text();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !inMemoryIdToken) {
      setDemoSessionToken(null);
    }
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}
