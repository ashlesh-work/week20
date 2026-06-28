# Flowise chatflow export

After you build the chatbot in Flowise, export it and save the JSON **in this folder**:

> Flowise → open your chatflow → **Settings (⚙️) → Export Chatflow** → save as
> `Ornativa-Chatbot.Chatflows.json` here.

**Safe to commit:** Flowise strips all credentials/API keys from the export, so this
JSON contains only the node graph and configuration — no secrets.

**To reuse it:** in any Flowise instance, *Chatflows → Import*, select this file, then
re-add your own OpenAI key under **Credentials** and click **Upsert Vector Database**
on the Faiss node before chatting.
