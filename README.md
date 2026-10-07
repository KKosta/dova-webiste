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

The last step POSTs `{ flow, answers }` to `/api/waitlist` (`api/waitlist.js`). The function validates the submission, then forwards it as JSON to **`WAITLIST_WEBHOOK_URL`**, for example a Zapier, Make or n8n hook, a Slack workflow or your own API.

- **Webhook not set:** the submission is only written to the Vercel function log. Set the variable before launch.
- **Webhook fails:** the function returns 502. The form then shows an error and keeps the person's answers so they can try again.

Example payload:

```json
{
  "flow": "therapists",
  "submittedAt": "2026-10-07T12:00:00.000Z",
  "answers": {
    "name": "Ada Lovelace", "email": "ada@practice.com",
    "country": "United States", "state": "California",
    "years": "6 to 10 years", "caseload": "8", "fee": "$150 to $250", "pay": "A mix",
    "hardest": ["Notes and admin", "Something else"], "hardest_other": "…",
    "source": "Dr. Grace Hopper"
  }
}
```

Couples submissions use the same shape, with `therapist`, `referral`, `therapistName`, `therapistEmail` and `goals`.

## Deploy on Vercel

1. Import the repo in Vercel. It detects Vite, and `vercel.json` sets the build to `npm run build` with output in `dist`.
2. Add `WAITLIST_WEBHOOK_URL` under Project → Settings → Environment Variables.
3. Deploy.

## Layout

| Path | What |
| --- | --- |
| `src/App.jsx` | Splash page, form flow, validation and animations |
| `src/flows.js` | Questions and copy for both flows, verbatim from the design |
| `src/components/` | Ported Dova DS `Button`, `Input`, `Select`, `RadioRows`, `Checkbox`, `Eyebrow` |
| `src/styles/` | DS tokens (colours, type, spacing) and page-level overrides (Aimee, Instrument Sans) |
| `api/waitlist.js` | Vercel function that receives submissions |
| `public/assets/` | Hero photo (WebP + JPEG fallback, about 55 KB), wordmark, Aimee font |
