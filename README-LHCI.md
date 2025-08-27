# LHCI Production Server Fix

This workflow builds your app for production and runs Lighthouse CI against a production **server**, not a dev server. 
That avoids the `ERRORED_DOCUMENT_REQUEST (500)` you saw when `npm run dev` crashed during audit.

## What it does
- Installs deps (with resilient retries)
- Copies `.env.ci` → `.env.local` if present (fallback to `.env.example`)
- Runs `npm run build` (production)
- Detects a start command:
  - prefers `npm run start -- -p 3000` (e.g., Next.js)
  - falls back to `npm run preview -- --port 3000 --strictPort` (e.g., Vite)
- Runs `lhci autorun` pointing at `http://localhost:3000/`

## Setup
1. Ensure your `package.json` has either:
   - `"start": "next start"` (Next.js), **or**
   - `"preview": "vite preview"` (Vite), or another command that starts a prod server.
2. If your app needs env at build/runtime, add a minimal `.env.ci` in the repo or configure GitHub Secrets referenced from your code.
3. Commit these files:
   - `.github/workflows/lighthouse.yml`
   - `.lighthouserc.cjs` (optional for local runs)

## Local usage
```bash
LHCI_START_CMD="npm run start -- -p 3000" npx @lhci/cli@0.13.x autorun
```

If your app is in a subfolder (e.g., `ui/`), add `working-directory: ui` to the install/build/LHCI steps or insert a `cd ui` step before them.
