const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.httpStatus = res.status;
    if (data.status) err.status = data.status;
    if (data.reason) err.reason = data.reason;
    throw err;
  }
  return data;
}

export const api = {
  post: (path, body, token) => request('POST', path, body, token),
  get: (path, token) => request('GET', path, undefined, token),
  patch: (path, body, token) => request('PATCH', path, body, token),
};
