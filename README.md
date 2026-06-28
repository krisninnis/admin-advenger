# AdminAvenger

AdminAvenger is a human-in-the-loop life-admin assistant.

Core protocol:

```text
AI extracts facts.
Code assesses.
Human approves.
```

The AI gateway is not an autonomous agent. It extracts structured facts from user-provided text or
images. AdminAvenger deterministic code still decides confidence wording, missing evidence,
contract/date reasoning, rights caveats, next actions, and draft safety.

The Home screen is preview-first. A pasted document is checked locally, but it is not saved into the
case system or counted in savings until the user chooses `Save case` or `Save as record`. `Ignore /
Clear result` removes the preview.

Documents with no obvious refund, saving, deadline, complaint, or useful evidence produce a calm
`No obvious saving or action found` result. These can be saved as local records, but they do not add
to confirmed savings, pending recovery, or potential savings.

The Savings view separates:

- confirmed saved/recovered money entered by the user
- pending recovery
- potential savings spotted by AdminAvenger
- deadlines protected
- no-action / checked records

Prototype proof notes and images stay in this browser's local storage.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`.

3. Add a server-side OpenAI key:

```bash
OPENAI_API_KEY=your_key_here
```

Do not prefix the key with `VITE_`. Frontend code must never receive the OpenAI API key.

4. Optionally set a model:

```bash
OPENAI_MODEL=
```

Use a current OpenAI model that supports text, image input, and structured JSON output. If this is
omitted, `/api/analyze-admin` uses its default model constant.

5. Start local development:

```bash
npm run dev
```

## Optional Local Ollama Testing

Local Ollama mode is for developer and power-user testing only. It lets AdminAvenger try local fact
extraction from pasted text before the deterministic assessment runs.

Normal hosted customers should not need to install Ollama, manage model names, or provide local AI
settings.

1. Install Ollama from [ollama.com](https://ollama.com).

2. Pull the suggested local model:

```bash
ollama pull llama3.2
```

3. Start Ollama.

4. Open AdminAvenger and go to the Home input area.

5. Set AI mode to `Local Ollama experimental`.

6. Set:

```text
Ollama URL: http://localhost:11434
Ollama model: llama3.2
```

7. Paste text and press `Check this`.

If Ollama is stopped, the model is missing, or the local AI returns unreadable JSON, AdminAvenger
shows a friendly warning and falls back to local rules.

## Vercel Setup

1. Open the Vercel project settings.
2. Go to Environment Variables.
3. Add `OPENAI_API_KEY`.
4. Add `OPENAI_MODEL` if desired.
5. Redeploy:

```bash
vercel --prod
```

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
```

## Safety Boundary

AdminAvenger does not submit claims, send emails, cancel services, contact providers, or decide
legal/financial rights. It prepares evidence and drafts so the user can decide what to do next.
