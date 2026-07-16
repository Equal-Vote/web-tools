# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # tsc -b && vite build
npm run lint      # ESLint on all files
npm run preview   # Preview production build locally
npm run deploy    # Build and deploy to GitHub Pages (gh-pages)
```

There are no tests.

## Architecture

A React + TypeScript SPA providing internal tools for the Equal Vote organization. Deployed to GitHub Pages at `/web-tools/` (base path set in `vite.config.ts`). All third-party API calls route through a Heroku CORS proxy at `thawing-lowlands-28251-6bae9d7d987a.herokuapp.com`.

**Routing** (`src/App.tsx`): HashRouter with two routes — `/` (WebTools dashboard) and `/event_finder` (EventFinder).

**Main dashboard** (`src/WebTools.tsx`): Manages API key inputs (Mailchimp + NationBuilder), tool selection, and a shared response display panel. API keys are persisted in browser cookies via `useCookie`. Each tool component receives a `req()` function (wraps fetch with auth headers through the proxy) and a `stateReporter` callback for status/log output.

**Tool components** receive `{ req, stateReporter }` props and implement their own multi-step workflows:
- `CoffeePairing.tsx` — parses a CSV of pairings, clears existing `COFFEEPAIR` merge fields in Mailchimp, then sets new ones via parallel requests
- `ContactExport.tsx` — paginates through NationBuilder signups API, maps/filters fields, generates per-state CSV files, and bundles them as a ZIP download using JSZip
- `EventFinder.tsx` — standalone route; reads `?prefix=` URL param, fetches HTML from starvoting.org through proxy, regex-matches an event URL, then redirects

## Code Style

- Prefer `array.forEach` over `for...of` loops

**Utilities:**
- `src/util.tsx` — API endpoint constants and shared TypeScript types (`ReqFunc`, `StateReporter`)
- `src/useCookie.ts` — drop-in `useState` replacement that persists to browser cookies
- `src/useFetch.ts` — generic fetch hook returning `{ pending, error, data }`

## Agent skills

### Issue tracker

Issues are tracked as GitHub Issues on Equal-Vote/web-tools, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
