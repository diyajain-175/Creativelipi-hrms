const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://creativelipi-hrms-api.onrender.com');

async function request(path, { method = 'GET', body, headers } = {}) {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
};

export async function fetchBlob(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    let message = 'Request failed';

    try {
      message = (await res.json()).message || message;
    } catch {
      // response was not JSON
    }

    throw new Error(message);
  }

  return res.blob();
}

export function downloadCsv(path, filename) {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
  }).then(async (res) => {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  });
}