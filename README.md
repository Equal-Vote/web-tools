# Equal Vote Web Tools

Internal tools for the [Equal Vote Coalition](https://www.equal.vote/), built as a React + TypeScript SPA.

**Live site:** https://equal-vote.github.io/web-tools/

---

## Tools

### Coffee Pairing

Syncs coffee chat pairings into Mailchimp. Given a TSV of pairs and a TSV of contacts (with email addresses and blurbs), it clears all existing `COFFEEPAIR` merge fields in the Mailchimp audience segment, then sets new pairings for each person.

**Requires:** Mailchimp API key

**Inputs:**
- **Pairings** — TSV with columns `Name` and `Partner Name`
- **Contacts** — TSV with columns `Members`, `Email`, and `Email Blurb`

### Contact Export

Paginates through all signups in NationBuilder, filters out contacts marked `do_not_contact`, and downloads a ZIP file containing CSVs broken out by state (Ohio, Oregon, California, Georgia, Utah, New York) and by metro area (Portland, Seattle, NYC, etc.). Results are sorted by join date, newest first.

The metro area filtering uses zip code → county lookups. Most common zip codes are pre-cached in `zip_cache.csv`. For any zip codes not in the cache, the tool calls the [zip-codes.com API](https://www.zip-codes.com/zip-codes-api.asp) — those lookups require the ZIP Codes API key. If more than 250 uncached zip codes are encountered the export will fail and ask you to expand the cache.

**Requires:** NationBuilder API key, ZIP Codes API key (only needed if there are uncached zip codes, DEMOAPIKEY can be used if there's only a few zips)

### Event Finder

A standalone redirect page at `/event_finder`. It reads a `?prefix=` URL parameter, fetches the starvoting.org events page, finds the first event URL matching that prefix, and redirects the browser there. Useful for creating stable short links to recurring events (e.g. state call pages) whose URLs change over time.

**No API key required.**

**Example:** `https://equal-vote.github.io/web-tools/#/event_finder?prefix=ca_call`

**Example:** `starvoting.org/orientation` redirects using this tool

---

## Getting API Keys

### Mailchimp

1. Log in to [Mailchimp](https://mailchimp.com/) with the Equal Vote account.
2. Go to **Account & billing → Extras → API keys**.
3. Click **Create A Key** and copy the generated key.

The key looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us19`

### NationBuilder

1. Log in to the [Equal Vote NationBuilder site](https://unifiedprimary.nationbuilder.com).
2. Go to **Settings → Developer → API Keys**.
3. Create a new key or copy an existing one.

The key is a long alphanumeric token.

### ZIP Codes API (zip-codes.com)

Only needed for Contact Export when there are zip codes not already in `zip_cache.csv` (uncommon after the cache has been populated).

1. Sign up or log in at [zip-codes.com](https://www.zip-codes.com/zip-codes-api.asp).
2. Your API key is shown in your account dashboard.

API keys are stored in browser cookies so you only need to enter them once per browser.

---

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot module replacement |
| `npm run build` | Type-check with `tsc` then bundle with Vite |
| `npm run preview` | Serve the production build locally for testing |
| `npm run lint` | Run ESLint across all source files |
| `npm run deploy` | Build and publish to GitHub Pages (`gh-pages` branch) |

### Architecture

- **Framework:** React 18 + TypeScript, bundled with Vite
- **UI:** Material UI (MUI v6)
- **Routing:** `react-router-dom` HashRouter — `/` (dashboard) and `/event_finder`
- **CORS proxy:** All third-party API calls are routed through a Heroku proxy at `thawing-lowlands-28251-6bae9d7d987a.herokuapp.com` to avoid browser CORS restrictions
- **State persistence:** API keys and the last-selected tool are stored in browser cookies via `useCookie.ts`
- **ZIP download:** `jszip` bundles the Contact Export CSV files client-side before download

### Key files

| File | Purpose |
|---|---|
| `src/App.tsx` | Router setup |
| `src/WebTools.tsx` | Main dashboard: API key inputs, tool selector, shared response log |
| `src/CoffeePairing.tsx` | Coffee Pairing tool |
| `src/ContactExport.tsx` | Contact Export tool |
| `src/EventFinder.tsx` | Event Finder redirect page |
| `src/util.tsx` | API endpoint constants and shared types |
| `src/useCookie.ts` | `useState` drop-in that persists to cookies |
| `zip_cache.csv` | Pre-cached zip → county mappings to minimize ZIP Codes API calls |
| `src/zones.json` | Metro zone definitions (zip prefixes + county lists) |

### Deployment

Merging to `main` does **not** auto-deploy. Run `npm run deploy` manually to publish. This builds the project and pushes the `dist/` folder to the `gh-pages` branch, which GitHub Pages serves from the `/web-tools/` path.
