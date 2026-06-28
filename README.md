# Ornativa Jewels — Retrieval Chatbot 💎

A retrieval-augmented (RAG) jewellery retail chatbot for the fictional brand **Ornativa Jewels** (Hyderabad, India), built visually in **Flowise** and fronted by a custom **animated web UI** (two versions). The bot answers strictly from the supplied catalogue (`Jewellery Details.pdf`), keeps short-term memory, stays polite and factual, and suggests an in-stock alternative when an item is out of stock — with **no hard-coded answers**.

> **Week 20 Graded Mini Project.** Built on Flowise (local/Docker), FAISS vector store, OpenAI GPT-4o-mini.

---

## 🔒 Secrets policy (read first)

This is a **public** repository. No secrets are committed, ever:

- The **OpenAI API key is entered only in the Flowise UI → Credentials** and is encrypted into the local `flowise_data` Docker volume — **never** in `docker-compose.yml`, an image layer, or Git.
- **Flowise's chatflow JSON export strips all credentials**, so the exported flow is safe to share.
- `.gitignore` blocks `.env`, the Flowise data dir, and the FAISS index files; `.env.example` holds placeholders only.
- The frontends store **only the Flowise endpoint URL** (set in-app) — no API key ever touches frontend code.

---

## 📁 Repository structure
```
.
├── docker-compose.yml          # Flowise + both frontends, one command
├── .gitignore                  # blocks secrets, flowise data, FAISS index
├── .env.example                # placeholders only — no real values
├── flowise/                    # ← drop your exported chatflow JSON here
├── frontend-html/              # Version A: single-file animated UI
│   ├── index.html
│   └── Dockerfile
├── frontend-react/             # Version B: React + Vite UI
│   ├── src/ (App.jsx, flowise.js, styles.css, main.jsx)
│   ├── package.json · vite.config.js · Dockerfile · .env.example
└── README.md
```

---

## 🚀 Quick start (Docker)
```bash
docker compose up -d
```
| Service | URL |
|---|---|
| Flowise (build the flow here) | http://localhost:3000 |
| Animated UI — HTML version | http://localhost:8080 |
| Animated UI — React version | http://localhost:8081 |

Then: **(1)** in Flowise add your OpenAI key under *Credentials*, **(2)** build the flow (below) and click **Upsert Vector Database**, **(3)** copy the chatflow's **Prediction API** URL into either frontend via the ⚙️ gear icon.

*(Prefer no Docker? `npm install -g flowise && npx flowise start` for Flowise; open `frontend-html/index.html` directly; `cd frontend-react && npm install && npm run dev` for the React app.)*

---

## 🧩 The Flowise flow

**Ingestion (run once):**
```
PDF File Loader → Recursive Character Text Splitter → OpenAI Embeddings → FAISS (Upsert)
```
**Query (every message):**
```
Chat Input → Conversational Retrieval QA Chain → Chat Output
                   ├── ChatOpenAI (gpt-4o-mini)
                   ├── FAISS Retriever (Top K = 10)
                   └── Buffer Memory
```

### Node choices (and why)
| Step | Node | Settings / rationale |
|------|------|----------------------|
| Load | **PDF File** | Upload `Jewellery Details.pdf`; "One document per file". |
| Chunk | **Recursive Character Text Splitter** | Chunk Size **300**, Overlap **50** — keeps each product record intact. |
| Embed | **OpenAI Embeddings** | `text-embedding-3-small`; credential selected in UI. |
| Store | **FAISS** | Base Path `/root/.flowise/faiss` → persists in the Docker volume; **no account needed**, and ready-to-use in Docker (no C++ build). |
| Generate | **ChatOpenAI** | `gpt-4o-mini`, temperature `0.1` for factual answers. |
| Orchestrate | **Conversational Retrieval QA Chain** | Bundles retriever + prompt (*System Message*) + memory; the *Top K* of the FAISS retriever is set to **10**. |
| Remember | **Buffer Memory** | Short-term context for follow-ups. |
| I/O | **Chat Input / Chat Output** | Complete the loop. |

### Chunking approach
The catalogue is tiny (10 products, ~one line each). Small chunks (**300 / 50**) make each product roughly its own chunk; a high retriever **Top K = 10** guarantees "list all …" queries see every relevant record. *Trade-off:* in a large catalogue you'd keep Top K small for cost/noise — here the data is small, so high Top K maximises completeness.

### Prompt design (the chain's *System Message*)
```
You are Ornativa's virtual jewellery expert for Ornativa Jewels, Hyderabad.
Answer customer questions using ONLY the jewellery catalogue provided in the context.
Be polite, concise, and factual.
- When asked about price, material, category, weight, or stock, quote the exact details from the catalogue.
- If an item is Out of Stock, clearly say so and recommend ONE in-stock alternative from the SAME category
  (e.g., if a ring is out of stock, suggest another available ring).
- Use the conversation history to resolve follow-ups (e.g., "the ring" = the item discussed just before).
- If the catalogue does not contain the answer, say you don't have that information rather than guessing.
```

### Memory
A **Buffer Memory** node lets the bot resolve context-dependent follow-ups (verified):
```
User: Show me diamond products.
Bot : Classic Diamond Ring, Diamond Stud Earrings, and Lotus Pendant are available.
User: What's the price of the ring?
Bot : The Classic Diamond Ring is priced at 135000.
```

### Out-of-stock handling
Two items are Out of Stock — **Ruby Solitaire Ring** (R102) and **Emerald Cuff Bracelet** (B402). The System Message instructs the model to flag the status and recommend an available same-category item (e.g. Ruby Solitaire Ring → **Classic Diamond Ring**; Emerald Cuff Bracelet → **Gold Chain Bracelet**). The suggestion is reasoned from retrieved catalogue data — **not** a hard-coded lookup.

---

## 🎨 Frontends

Both share one luxury design language (gold-on-graphite, gem-like ambient motion) and ship a **Dark / Light / System** theme toggle (System default) with `prefers-reduced-motion` support.

- **`frontend-html/`** — one self-contained file + `assets/`. Zero build. Open directly, host on GitHub Pages, or serve via its Dockerfile.
- **`frontend-react/`** — React + Vite, componentised (assets in `public/assets/`). `npm install && npm run dev`, or built & served via its Dockerfile.

**Visual touches (from your supplied images):**
- **Hero** — the robot-and-jewellery scene (`assets/hero.png`) anchors the empty state; the robot mascot doubles as the chat avatar.
- **Collection drawer** — the 10 catalogue items (extracted from `Products.png` into `assets/products/{ProductID}.png`) shown as a tappable gallery; tapping a piece asks the bot about it.
- **Inline thumbnails** — when a reply names a catalogue product, its photo appears beside the text.

> **Note on "no hard-coding":** the thumbnail/gallery mapping is *presentation only* — it attaches a photo when a product name appears in the bot's text. The answer content is still produced entirely by Flowise retrieval, so the assignment constraint is preserved.

Both call `POST /api/v1/prediction/{chatflowId}` with a persistent `sessionId` (so memory works across turns). Set the endpoint via the in-app ⚙️ gear (stored in `localStorage`), or, for React, via `VITE_FLOWISE_ENDPOINT` in `.env.local`.

---

## ✅ Test evidence

At least five queries spanning price, material, category, stock, and a multi-turn memory check. *(Paste your Flowise/UI screenshots or copied responses under each row.)*

| # | Type | Query | Expected (from catalogue) |
|---|------|-------|---------------------------|
| 1 | Price | What is the price of the Pearl Necklace? | 245000 |
| 2 | Material | Which products are made of 22K gold? | Ruby Solitaire Ring, Emerald Choker, Daily Wear Gold Earrings, Gold Chain Bracelet, Om Symbol Pendant |
| 3 | Category | List all available diamond items. | Classic Diamond Ring, Diamond Stud Earrings, Lotus Pendant |
| 4 | Memory | "Show me diamond products." → "What's the price of the ring?" | …the three above; then Classic Diamond Ring — 135000 |
| 5 | Stock + alt | Is the Ruby Solitaire Ring available? | Out of Stock; suggest Classic Diamond Ring (135000) |
| 6 | Stock + alt | I'd like the Emerald Cuff Bracelet. | Out of Stock; suggest Gold Chain Bracelet (87500) |

---

## 📦 Deliverables checklist
- [ ] Chatflow export (JSON) in `flowise/` — *Settings → Export Chatflow*
- [ ] Screenshots of the full node pipeline and connections
- [ ] 5+ test queries with responses (table above)
- [ ] This write-up
- [ ] **No API keys** in any screenshot, file, or commit

## Constraints honoured
- No hard-coded answers — all responses are retrieval-driven from the catalogue.
- Responses grounded in `Jewellery Details.pdf` via the FAISS vector store.
- API keys live only in Flowise Credentials — never in Git, Docker layers, or the frontends.
