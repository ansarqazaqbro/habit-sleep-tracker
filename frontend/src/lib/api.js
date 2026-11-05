const TOKEN_KEY = 'lumen.token'

function headers() {
  const token = localStorage.getItem(TOKEN_KEY)
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  })

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0]?.[0] : null
    const error = new Error(firstError || payload.message || 'Request failed')
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export async function ensureSession() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    const data = await request('/auth/demo', { method: 'POST' })
    localStorage.setItem(TOKEN_KEY, data.token)
    return data.user
  }
  try {
    return await request('/user')
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    const data = await request('/auth/demo', { method: 'POST' })
    localStorage.setItem(TOKEN_KEY, data.token)
    return data.user
  }
}

export const api = {
  habits: () => request('/habits'),
  createHabit: (body) => request('/habits', { method: 'POST', body: JSON.stringify(body) }),
  toggleHabit: (id, date) =>
    request(`/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify(date ? { date } : {}) }),
  deleteHabit: (id) => request(`/habits/${id}`, { method: 'DELETE' }),
  categories: () => request('/categories'),
  sleepLogs: () => request('/sleep'),
  sleepStats: () => request('/sleep/stats'),
  saveSleep: (body) => request('/sleep', { method: 'POST', body: JSON.stringify(body) }),
  matrix: () => request('/matrix?weeks=16'),
  aiAdvice: () => request('/ai/advice'),
  aiAdvisor: (body = {}) =>
    request('/ai/advisor', { method: 'POST', body: JSON.stringify(body) }),
}
