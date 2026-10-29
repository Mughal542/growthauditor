# Growth Auditor by Creatix Studio

A responsive, browser-only website growth checklist created for Creatix Studio. It uses no build step, framework, external font, API, account, backend, analytics, or third-party service.

## Open the app

Open `index.html` in a current browser. The app works as a local set of files and does not need an internet connection.

## Audit flow

1. Enter business details and a website address. The address is used to identify the report; the app does not visit or scan it.
2. Answer the six category checklists. “Not sure” counts toward response coverage but is excluded from category scoring.
3. Review answers and generate the weighted assessment, recommendations, and seven-day action plan.
4. Print or save the report as PDF from the browser, copy its text summary, or revisit it under Saved audits.

Audit reports, completion progress, and an optional contact destination are stored in this browser's local storage. They are not sent anywhere. Clearing the browser's site data may remove them.

The supplied Creatix Studio logo is included locally in `assets/`. The studio profile link is `https://creatixstudio.vercel.app/` and is the default destination for Studio buttons; you can change it through **Contact settings**.

The page background uses the supplied sample artwork converted to WebP. The header and About-page logo assets have transparent backgrounds, so the page background shows through them without a surrounding tile.

## Configure the contact button

Open **Contact settings** and enter a destination supplied by Creatix Studio, such as a website URL or `mailto:` link. The app does not invent a destination or send a message. The preference is saved locally.

## Edit questions and scoring

Questions, weights, recommendation text, and action-plan fallback tasks are in `src/config.js`. The deterministic scoring helpers are in `src/scoring.js`; the interface is in `src/app.js`.

## Verify the scoring rules

With Node.js installed, run `node --test tests/scoring.test.js` from this folder. There is no separate production build step.
