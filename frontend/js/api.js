// frontend/js/api.js
export const token = () => localStorage.getItem('adm_token') || '';

export async function api(url, opt = {}) {
  const headers = Object.assign(
    { 'Accept': 'application/json' },
    opt.headers || {},
    token() ? { Authorization: 'Bearer ' + token() } : {}
  );
  const res = await fetch(url, { ...opt, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const get = (u) => api(u);
export const postJSON = (u, body) =>
  api(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const del = (u) => api(u, { method: 'DELETE' });
