import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { askFlowise, isConfigured } from './flowise.js'

/* ---- Catalogue (names + categories; images live in /public/assets/products) ---- */
const PRODUCTS = [
  { id: 'R101', name: 'Classic Diamond Ring', cat: 'Ring' },
  { id: 'R102', name: 'Ruby Solitaire Ring', cat: 'Ring', oos: true },
  { id: 'N201', name: 'Pearl Necklace', cat: 'Necklace' },
  { id: 'N202', name: 'Emerald Choker', cat: 'Necklace' },
  { id: 'E301', name: 'Daily Wear Gold Earrings', cat: 'Earrings' },
  { id: 'E302', name: 'Diamond Stud Earrings', cat: 'Earrings' },
  { id: 'B401', name: 'Gold Chain Bracelet', cat: 'Bracelet' },
  { id: 'B402', name: 'Emerald Cuff Bracelet', cat: 'Bracelet', oos: true },
  { id: 'P501', name: 'Lotus Pendant', cat: 'Pendant' },
  { id: 'P502', name: 'Om Symbol Pendant', cat: 'Pendant' }
]
const imgOf = (p) => `/assets/products/${p.id}.png`
// Presentation only: which catalogue products are mentioned in a reply (does NOT change the text).
const productsIn = (text) => { const t = (text || '').toLowerCase(); return PRODUCTS.filter((p) => t.includes(p.name.toLowerCase())) }

/* ---- Theme: three-way Dark / Light / System ---- */
function useTheme() {
  const [choice, setChoice] = useState(() => localStorage.getItem('ornativa-theme') || 'system')
  useEffect(() => {
    const apply = (mode) => {
      const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.dataset.theme = mode === 'system' ? sys : mode
      document.documentElement.dataset.themeChoice = mode
    }
    apply(choice)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (choice === 'system') apply('system') }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [choice])
  return [choice, (m) => { localStorage.setItem('ornativa-theme', m); setChoice(m) }]
}

const SUGGESTIONS = ['List all available diamond items', 'What is the price of the Pearl Necklace?', 'Which products are made of 22K gold?']

const Icon = {
  light: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>,
  system: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  dark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
}

const BotAvatar = () => <div className="avatar bot"><img src="/assets/robot.png" alt="Ornativa assistant" /></div>

export default function App() {
  const [choice, setChoice] = useTheme()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [endpoint, setEndpoint] = useState(localStorage.getItem('ornativa-endpoint') || '')
  const threadRef = useRef(null)
  const taRef = useRef(null)
  const sessionId = useRef(localStorage.getItem('ornativa-sid') || (crypto.randomUUID ? crypto.randomUUID() : 'sid-' + Date.now()))

  useEffect(() => { localStorage.setItem('ornativa-sid', sessionId.current) }, [])
  useEffect(() => {
    if (!isConfigured()) setMessages([{ role: 'bot', text: 'Welcome to Ornativa Jewels. ✨ Set your Flowise endpoint via the gear icon (top-right), then ask me anything — or tap “Collection”.' }])
  }, [])
  useEffect(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, busy])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setSettingsOpen(false); setGalleryOpen(false) } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function submit(q) {
    if (!q.trim() || busy) return
    setGalleryOpen(false)
    setMessages((m) => [...m, { role: 'user', text: q }])
    setText(''); if (taRef.current) taRef.current.style.height = 'auto'
    setBusy(true)
    try {
      const answer = await askFlowise(q, sessionId.current)
      setMessages((m) => [...m, { role: 'bot', text: answer }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', error: true, text: String(err.message || err) }])
    } finally { setBusy(false) }
  }

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(text) } }
  const autoGrow = (e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px' }
  const saveSettings = () => { const v = endpoint.trim(); if (v) localStorage.setItem('ornativa-endpoint', v); setSettingsOpen(false) }

  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="blob a" /><div className="blob b" /><div className="blob c" /><div className="grain" />
      </div>

      <div className="app">
        <header>
          <div className="brand">
            <div className="mark" aria-hidden="true"><img src="/assets/robot.png" alt="" /></div>
            <div>
              <div className="wordmark">Ornativa Jewels</div>
              <div className="subtitle">Virtual Jewellery Expert · Hyderabad</div>
            </div>
          </div>
          <div className="tools">
            <button className="icon-btn" onClick={() => setGalleryOpen(true)} aria-label="Browse the collection" title="Browse the collection">{Icon.grid}<span className="lbl">Collection</span></button>
            <div className="seg" role="group" aria-label="Theme">
              {['light', 'system', 'dark'].map((m) => (
                <button key={m} onClick={() => setChoice(m)} aria-pressed={choice === m} title={m} aria-label={`${m} theme`}>{Icon[m]}</button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => { setEndpoint(localStorage.getItem('ornativa-endpoint') || ''); setSettingsOpen(true) }} aria-label="Connection settings" title="Connection settings">{Icon.gear}</button>
          </div>
        </header>

        <main ref={threadRef} aria-live="polite">
          {messages.length === 0 && (
            <section className="hero">
              <figure className="hero-figure"><img src="/assets/hero.png" alt="Ornativa virtual assistant beside a jewellery display" /></figure>
              <h1>Discover your perfect piece</h1>
              <p>Meet your Ornativa jewellery expert. Ask about prices, materials, availability, or recommendations — every answer comes straight from our live catalogue.</p>
              <div className="chips">
                <button className="chip gold" onClick={() => setGalleryOpen(true)}>✦ Browse the collection</button>
                {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => submit(s)}>{s}</button>)}
              </div>
            </section>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === 'bot' ? <BotAvatar /> : <div className="avatar user">You</div>}
              <div className="col">
                <div className="bubble">
                  {m.error
                    ? <><span className="err">Couldn't reach the chatbot.</span><br/>Check Flowise is running and your endpoint is set (gear icon).<br/><small style={{ color: 'var(--muted)' }}>{m.text}</small></>
                    : <ReactMarkdown>{m.text}</ReactMarkdown>}
                </div>
                {m.role === 'bot' && !m.error && productsIn(m.text).length > 0 && (
                  <div className="thumbs">
                    {productsIn(m.text).map((p) => (
                      <button key={p.id} className="thumb" type="button" onClick={() => submit('Tell me about the ' + p.name)}>
                        <img src={imgOf(p)} alt="" /><span className="nm">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="msg bot"><BotAvatar /><div className="col"><div className="bubble"><span className="typing"><span/><span/><span/></span></div></div></div>
          )}
        </main>

        <div className="dock">
          <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(text) }} autoComplete="off">
            <textarea ref={taRef} rows={1} value={text} onChange={autoGrow} onKeyDown={onKeyDown} placeholder="Ask about our jewellery…" aria-label="Your message" />
            <button className="send" type="submit" disabled={busy} aria-label="Send message">{Icon.send}</button>
          </form>
          <div className="hint">Ornativa answers from the catalogue only · <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for a new line</div>
        </div>
      </div>

      {/* Settings */}
      <div className={`scrim ${settingsOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false) }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="set-title">
          <h2 id="set-title">Connection settings</h2>
          <p>Paste your Flowise <strong>Prediction API</strong> endpoint for the Ornativa chatflow. Stored only in this browser.</p>
          <div className="field">
            <label htmlFor="endpoint">Flowise prediction endpoint</label>
            <input id="endpoint" type="url" spellCheck="false" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="http://localhost:3121/api/v1/prediction/YOUR-CHATFLOW-ID" />
          </div>
          <div className="note">🔒 No API keys here. Your OpenAI key stays inside Flowise (Credentials) — never in this page or the repo.</div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setSettingsOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveSettings}>Save</button>
          </div>
        </div>
      </div>

      {/* Collection drawer */}
      <div className={`scrim ${galleryOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setGalleryOpen(false) }}>
        <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="gal-title">
          <div className="drawer-head">
            <div>
              <h2 id="gal-title">The Ornativa Collection</h2>
              <p>Tap any piece to ask about it.</p>
            </div>
            <button className="x" onClick={() => setGalleryOpen(false)} aria-label="Close collection">✕</button>
          </div>
          <div className="gallery">
            {PRODUCTS.map((p) => (
              <button key={p.id} className={`pcard${p.oos ? ' is-oos' : ''}`} type="button" onClick={() => submit('Tell me about the ' + p.name)}>
                <img src={imgOf(p)} alt={p.name} />
                <div className="nm">{p.name}</div>
                <div className="cat">{p.cat}</div>
                {p.oos && <div className="badge-oos">Out of stock</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
