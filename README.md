# Dova splash + waitlist

The Dova landing page: the hero photo, headline and two CTAs. Each CTA opens its waitlist form in place: **For therapists** has 9 questions, **For couples** has 6 or 7. The forms ask one question at a time and end on an animated thank-you card.

Built from the Claude Design handoff (`Dova Splash.dc.html`) with Vite + React. It deploys to Vercel as a static site plus one serverless function.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173, with /api/waitlist served locally
```

## QA

`tests/qa.mjs` drives a headless Chromium through the splash page and both flows. It covers the entrance animation timing, validation on every question type, the US state, referral and "Something else" branches, the selection limits, Esc and Back, the submitted payload, a failed save, two phone sizes and reduced motion.

```bash
npm run build && npx vite preview --port 4173 &
npm run test:e2e     # SHOTS_DIR=./shots also saves screenshots
```

## Where submissions go

The last step POSTs `{ flow, answers }` to `/api/waitlist` (`api/waitlist.js`). The function validates the submission, then saves it to whichever of these are set:

- **`NOTION_TOKEN`**: adds a row to the [📥 Dova.io waitlist signup](https://www.notion.so/3f2a7013b5948074bcb5ea4ea3eaa63f) database (`api/_notion.js`). Each question has its own column, `Type` says which form the row came from, and `Status` starts at New.
- **`WAITLIST_WEBHOOK_URL`** (optional): also POSTs the raw JSON to that address.

If neither is set, the submission is only written to the Vercel function log. If every destination fails, the form shows an error and keeps the person's answers so they can try again.

Notion select options can't contain commas, so three answers are stored slightly reworded, for example "No, looking for one" becomes "No – looking for one". The rewording is in `OPTION_LABELS` in `api/_notion.js`. If you rename a column or option in Notion, update `api/_notion.js` and `tests/notion.test.mjs` to match, then run `npm test`.

### Connect Notion (one-off)

1. Go to https://www.notion.so/profile/integrations, create a **new internal integration** in the deepspringai workspace (for example "Dova website"), and copy its secret.
2. Open the waitlist database, then **••• → Connections → add "Dova website"**.
3. Set `NOTION_TOKEN` to the secret in Vercel, and in `.env.local` to test locally.

## Deploy on Vercel

1. Import the repo in Vercel. It detects Vite, and `vercel.json` sets the build to `npm run build` with output in `dist`.
2. Add `NOTION_TOKEN` under Project → Settings → Environment Variables (and optionally `WAITLIST_WEBHOOK_URL`).
3. Deploy.

## Layout

| Path | What |
| --- | --- |
| `src/App.jsx` | Splash page, form flow, validation and animations |
| `src/flows.js` | Questions and copy for both flows, verbatim from the design |
| `src/components/` | Ported Dova DS `Button`, `Input`, `Select`, `RadioRows`, `Checkbox`, `Eyebrow` |
| `src/styles/` | DS tokens (colours, type, spacing) and page-level overrides (Aimee, Instrument Sans) |
| `api/waitlist.js` | Vercel function that receives submissions |
| `api/_notion.js` | Maps answers to Notion columns and creates the row |
| `tests/notion.test.mjs` | `npm test`: checks every answer maps to a real Notion column and option |
| `public/assets/` | Hero photo (WebP + JPEG fallback, about 55 KB), wordmark, Aimee font, favicon SVG and app icons |
| `public/favicon.ico`, `apple-touch-icon.png`, `site.webmanifest` | Favicon for older browsers, iPhone home-screen icon, Android icon manifest |
