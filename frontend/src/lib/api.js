const TOKEN_KEY = 'lumen.token'
const DEFAULT_TIMEOUT_MS = 15000

function headers() {
  const token = localStorage.getItem(TOKEN_KEY)
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Выполняет fetch-запрос с ограничением по времени (по умолчанию 15 секунд).
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [timeoutMs]
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error('Превышено время ожидания ответа от сервера (таймаут 15 сек).')
      timeoutError.code = 'ETIMEDOUT'
      throw timeoutError
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function request(path, options = {}, retried = false) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options

  const response = await fetchWithTimeout(
    `/api${path}`,
    {
      ...fetchOptions,
      headers: { ...headers(), ...(fetchOptions.headers || {}) },
    },
    timeoutMs,
  )

  if (response.status === 204) {
    return null
  }

  if (response.status === 401 && !retried && path !== '/auth/demo') {
    localStorage.removeItem(TOKEN_KEY)
    await ensureSession()
    return request(path, options, true)
  }

  const contentType = response.headers.get('content-type') || ''
  let payload = {}
  try {
    const text = await response.text()
    payload = text ? JSON.parse(text) : {}
  } catch {
    if (response.ok && !contentType.includes('application/json')) {
      throw new Error('Сервер API вернул некорректный ответ (не JSON). Проверьте, что бэкенд запущен.')
    }
    payload = {}
  }

  // Если сервер вернул ошибку Laravel/БД со статусом 200 (особенность прокси/OSPanel) — тоже считаем это ошибкой
  const isBackendException = Boolean(payload?.exception)
  const isUnauthenticated = payload?.message === 'Unauthenticated.'

  if (isUnauthenticated && !retried && path !== '/auth/demo') {
    localStorage.removeItem(TOKEN_KEY)
    await ensureSession()
    return request(path, options, true)
  }

  if (!response.ok || isBackendException || isUnauthenticated) {
    const firstError = payload.errors ? Object.values(payload.errors)[0]?.[0] : null
    const error = new Error(firstError || payload.message || 'Не удалось выполнить запрос к серверу')
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

/**
 * Гарантирует наличие активной Sanctum-сессии (при необходимости создаёт демо-сессию).
 *
 * @returns {Promise<object>}
 */
export async function ensureSession() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    const data = await request('/auth/demo', { method: 'POST' }, true)
    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
    }
    return data?.user || { id: 1, name: 'Aurora', email: 'demo@habit.local' }
  }
  try {
    return await request('/user', {}, true)
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    const data = await request('/auth/demo', { method: 'POST' }, true)
    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
    }
    return data?.user || { id: 1, name: 'Aurora', email: 'demo@habit.local' }
  }
}

export const api = {
  habits: () => request('/habits'),
  createHabit: (body) => request('/habits', { method: 'POST', body: JSON.stringify(body) }),
  updateHabit: (id, body) =>
    request(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggleHabit: (id, date) =>
    request(`/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify(date ? { date } : {}) }),
  deleteHabit: (id) => request(`/habits/${id}`, { method: 'DELETE' }),
  categories: () => request('/categories'),
  sleepLogs: () => request('/sleep'),
  sleepStats: () => request('/sleep/stats'),
  saveSleep: (body) => request('/sleep', { method: 'POST', body: JSON.stringify(body) }),
  matrix: () => request('/matrix?weeks=16'),
  aiAdvice: () => request('/ai/advice'),
  aiAdvisor: (body = {}, options = {}) =>
    request('/ai/advisor', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: options.timeoutMs ?? 15000,
      signal: options.signal,
    }),
  confirmAiAction: (id) => request(`/ai/actions/${id}/confirm`, { method: 'POST' }),
  undoAiAction: (id) => request(`/ai/actions/${id}/undo`, { method: 'POST' }),
}
