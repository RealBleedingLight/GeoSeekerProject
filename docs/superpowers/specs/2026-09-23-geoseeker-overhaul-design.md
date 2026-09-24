# GeoSeeker Overhaul — Design Spec

## Overview

Overhaul GeoSeeker from a basic vanilla HTML/Leaflet clue viewer into a clean, performant SvelteKit app with an integrated admin mode. Community-facing tool for GeoGuessr players, single admin (Leo).

**Core goals:**
- Clean, modern map UI with lightweight drawer-based clue browsing
- Two browse axes: by country and by category (cross-referenced)
- Inline admin mode — same platform, elevated controls
- Dark mode support
- Performance-first: fast loads, smooth transitions, minimal JS

## Architecture

Single SvelteKit app deployed on Vercel. No separate admin app.

```
geoseeker/
├── src/
│   ├── lib/
│   │   ├── server/db.js              # Neon connection (server-only)
│   │   ├── server/auth.js            # Admin cookie/session check
│   │   ├── components/
│   │   │   ├── Map.svelte            # Leaflet map wrapper
│   │   │   ├── ClueDrawer.svelte     # Slide-out drawer (view + admin mode)
│   │   │   ├── ClueCard.svelte       # Single clue display
│   │   │   ├── ClueForm.svelte       # Add/edit clue form (admin)
│   │   │   ├── AdminBar.svelte       # Floating admin indicator
│   │   │   ├── CategoryBar.svelte    # Top bar category pills
│   │   │   ├── CategoryModal.svelte  # Category CRUD modal (admin)
│   │   │   └── ThemeToggle.svelte    # Dark/light mode toggle
│   │   └── stores/
│   │       ├── admin.js              # Admin state store
│   │       └── theme.js              # Theme state store
│   ├── routes/
│   │   ├── +page.svelte              # Map page (the entire app)
│   │   ├── +layout.svelte            # Global layout, admin + theme init
│   │   ├── login/+page.svelte        # Passphrase form
│   │   ├── api/
│   │   │   ├── countries/+server.js  # GET countries with clue counts
│   │   │   ├── clues/+server.js      # GET (by country or category), POST
│   │   │   ├── clues/[id]/+server.js # PUT, DELETE
│   │   │   ├── categories/+server.js # GET, POST
│   │   │   └── categories/[slug]/+server.js # PUT, DELETE
│   │   └── auth/
│   │       ├── login/+server.js      # POST passphrase → set cookie
│   │       └── logout/+server.js     # POST clear cookie
│   └── app.html
├── static/
│   └── countries.geojson
├── schema.sql
└── svelte.config.js                  # Vercel adapter
```

**Key decisions:**
- Map page is the entire app. Drawer behavior changes based on admin state.
- API routes in SvelteKit replace current Vercel serverless functions.
- Server-side auth check on mutation endpoints (POST/PUT/DELETE). Read endpoints public.
- Static GeoJSON stays in `static/` — no need to move to DB.
- Notion sync pipeline removed entirely.

## Data Model

### countries (unchanged)
```sql
CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
```

### categories (new)
```sql
CREATE TABLE categories (
  slug VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '',
  sort_order INT DEFAULT 0
);
```
Managed list of clue categories. Admin can add new ones (e.g. "Road Markings"). Dropdown in clue form pulls from this table.

### clues (enhanced)
```sql
CREATE TABLE clues (
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL REFERENCES countries(code),
  category VARCHAR(50) NOT NULL REFERENCES categories(slug),
  clue TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clues_country ON clues(country_code);
CREATE INDEX idx_clues_category ON clues(category);
```

**Changes from current schema:**
- `feature` renamed to `category` (clearer)
- `category` now references `categories(slug)` — enforced consistency
- Added `sort_order` for display ordering within a category
- Added `updated_at` for tracking edits

### Migration path
Seed `categories` table from distinct `feature` values in existing clues, then rename the column. Existing data preserved.

## UI/UX Design

### Map Page (landing)

Full-screen map, minimal chrome.

- **Tiles**: CartoDB Positron (light mode), CartoDB Dark Matter (dark mode)
- **Country styling**: subtle fill. Countries WITH clues get a deeper shade (visual coverage indicator). Hover: brighten + country name tooltip.
- **Top bar**: app title (left), category pills (right — Bollards, Plates, Poles...), theme toggle (sun/moon icon), admin indicator pill when logged in.
- Clean sans-serif font: Inter or system font stack.

### Drawer

Slides in from the right (~400px). Map stays visible and interactive (slightly dimmed). Smooth Svelte `fly` transition. Close via backdrop click or X button.

**Country mode** (triggered by clicking a country on the map):
- Header: flag emoji + country name, total clue count badge
- Body: clues grouped by category, collapsible sections
- Category labels are clickable pills → pivot to category browse mode

**Category mode** (triggered by clicking a category pill in the top bar):
- Header: category icon + label (e.g. "Bollards"), count of countries
- Body: clues listed per country, each with flag + country name
- Country names are clickable → pivot to country browse mode

**Clue cards**: white cards (dark: `#161b22`), soft shadow, clue text prominent, image thumbnail if present (click to expand).

### Admin Mode

Same drawer, elevated controls. No separate admin app.

- "Add Clue" button at the bottom of each section in the drawer
- Each clue card: edit (pencil) and delete (trash) icons appear on hover
- **ClueForm**: expands inline below the add button. Fields: category (dropdown), clue text (textarea), image URL (input + live preview on paste). Save/Cancel buttons.
- "Manage Categories" link in top bar (admin only) → modal for category CRUD
- Admin indicator: subtle pill in top-right ("Admin" with colored dot)

### Responsiveness

- Desktop: drawer slides from right
- Mobile: drawer slides up from bottom as a half-sheet, draggable to full height

### Color Palette

**Light mode:**
| Element | Color |
|---------|-------|
| Background | `#f8f9fa` |
| Drawer/cards | `#ffffff` |
| Card border | `#e9ecef` |
| Text primary | `#212529` |
| Text secondary | `#6c757d` |
| Map tiles | CartoDB Positron |
| Country fill | `#94d2bd` |
| Country hover | `#52b788` |
| Countries with clues | `#2d6a4f` |
| Accent (buttons, links) | `#1b4332` |

**Dark mode:**
| Element | Color |
|---------|-------|
| Background | `#0d1117` |
| Drawer/cards | `#161b22` |
| Card border | `#30363d` |
| Text primary | `#e6edf3` |
| Text secondary | `#8b949e` |
| Map tiles | CartoDB Dark Matter |
| Country fill | `#1a7f5a` |
| Country hover | `#2ea77a` |
| Countries with clues | `#3fb68b` |
| Accent | `#58a6ff` |

Theme toggle persists to `localStorage`. Respects `prefers-color-scheme` as initial default.

## API Design

### Public endpoints

```
GET /api/countries
  → [{code, name, clue_count}]

GET /api/clues?country=FI
  → {country: {code, name}, clues: [{id, category, clue, image_url, sort_order}]}

GET /api/clues?category=bollards
  → {category: {slug, label, icon}, countries: [{code, name, clues: [...]}]}

GET /api/categories
  → [{slug, label, icon, sort_order}]
```

### Admin endpoints (auth cookie required)

```
POST   /api/clues              → {country_code, category, clue, image_url?}
PUT    /api/clues/[id]         → {category?, clue?, image_url?, sort_order?}
DELETE /api/clues/[id]         → 204

POST   /api/categories         → {slug, label, icon?}
PUT    /api/categories/[slug]  → {label?, icon?, sort_order?}
DELETE /api/categories/[slug]  → 204
```

### Auth endpoints

```
POST /api/auth/login   → {password} → sets httpOnly signed cookie, returns 200
POST /api/auth/logout  → clears cookie, returns 200
```

Auth check implemented as SvelteKit hooks middleware. Mutation endpoints return 401 if no valid cookie.

## Auth

- Single env var: `ADMIN_PASSWORD`
- Login page at `/login` — passphrase input, POST to `/api/auth/login`
- Server compares against env var, sets `httpOnly` signed cookie on match
- SvelteKit `hooks.server.js` reads cookie on every request, attaches `isAdmin` to `event.locals`
- Client-side `admin` store reflects auth state (hydrated from layout load)
- No sessions table, no JWT — cookie-based, server-validated

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | SvelteKit | Lightweight output, built-in transitions, Vercel adapter |
| Map | Leaflet | Already have GeoJSON, lightweight, sufficient for the use case |
| Database | Neon (Postgres) | Already migrated, serverless driver |
| Deployment | Vercel | Already deployed here, SvelteKit adapter is first-class |
| Styling | CSS custom properties + minimal utility classes | No heavy CSS framework, theme toggle via CSS vars |
| Font | Inter (via Google Fonts or self-hosted) | Clean sans-serif |

## What Gets Removed

- `fetch_clues.js` (Notion sync) — replaced by admin UI
- `seed.js` — replaced by migration script + admin UI
- `country.html` — replaced by drawer in SvelteKit
- `index.html` — replaced by SvelteKit `+page.svelte`
- `features/bollards.html` — replaced by category browse mode
- `notes/finland.html` — content migrated to DB
- `@notionhq/client` dependency — removed
- `api/` directory (old Vercel functions) — replaced by SvelteKit API routes
