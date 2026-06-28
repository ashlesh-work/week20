// Calls the Flowise Prediction API. Holds NO secrets — only the endpoint URL.
// Endpoint precedence: localStorage override (set in Settings) > build-time env > placeholder.
const ENV_ENDPOINT = import.meta.env.VITE_FLOWISE_ENDPOINT || ''
const PLACEHOLDER = 'http://localhost:3000/api/v1/prediction/YOUR-CHATFLOW-ID'

export const getEndpoint = () =>
  localStorage.getItem('ornativa-endpoint') || ENV_ENDPOINT || PLACEHOLDER

export const isConfigured = () =>
  Boolean(localStorage.getItem('ornativa-endpoint') || ENV_ENDPOINT)

export async function askFlowise(question, sessionId) {
  const res = await fetch(getEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, overrideConfig: { sessionId } })
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  const data = await res.json()
  return data.text ?? data.answer ?? (typeof data === 'string' ? data : JSON.stringify(data))
}
