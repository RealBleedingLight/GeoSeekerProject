# GeoSeeker Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild GeoSeeker as a clean SvelteKit app with dual-axis clue browsing (by country + by category), inline admin mode, and dark mode support.

**Architecture:** Single SvelteKit app on Vercel. Leaflet map as the full-screen landing page. Right-side drawer for clue browsing (country mode and category mode). Admin is a mode, not a destination — same UI with elevated controls when authenticated. Neon Postgres backend with three tables (countries, categories, clues).

**Tech Stack:** SvelteKit (Svelte 5 runes), Leaflet, Neon Postgres (`@neondatabase/serverless`), Vercel adapter, CSS custom properties for theming.

**Spec:** `docs/superpowers/specs/2026-09-23-geoseeker-overhaul-design.md`

## Global Constraints

- Svelte 5 runes syntax: `$props()`, `$state()`, `$derived()`, `$effect()`. No `export let` for props, no `$:` reactives.
- No TypeScript — plain JavaScript throughout.
- No CSS framework — CSS custom properties + scoped component styles.
- Font: Inter via Google Fonts CDN.
- Map tiles: CartoDB Positron (light), CartoDB Dark Matter (dark).
- All server env vars via `$env/static/private`.
- Auth: single `ADMIN_PASSWORD` env var, HMAC-signed httpOnly cookie.
- Every mutation endpoint checks `locals.isAdmin` — returns 401 if false.

---

## File Map

**New files (SvelteKit scaffold):**
- `svelte.config.js` — Vercel adapter config
- `vite.config.js` — Vite + SvelteKit plugin
- `src/app.html` — HTML shell
- `src/app.css` — Global styles, CSS custom properties, theme definitions

**Server:**
- `src/lib/server/db.js` — Neon SQL connection
- `src/lib/server/auth.js` — Token create/verify helpers
- `src/hooks.server.js` — Auth middleware

**Stores:**
- `src/lib/stores/theme.js` — Theme state (writable store)
- `src/lib/stores/admin.js` — Admin state (writable store)

**Components:**
- `src/lib/components/Map.svelte` — Leaflet map wrapper
- `src/lib/components/ClueDrawer.svelte` — Slide-out drawer (both modes)
- `src/lib/components/ClueCard.svelte` — Single clue display card
- `src/lib/components/ClueForm.svelte` — Add/edit clue form (admin)
- `src/lib/components/CategoryBar.svelte` — Top bar category pills
- `src/lib/components/CategoryModal.svelte` — Category CRUD modal (admin)
- `src/lib/components/ThemeToggle.svelte` — Dark/light mode toggle
- `src/lib/components/AdminBar.svelte` — Admin indicator pill

**Routes:**
- `src/routes/+layout.svelte` — Global layout
- `src/routes/+layout.server.js` — Pass admin state to client
- `src/routes/+page.svelte` — Main map page
- `src/routes/+page.js` — Load countries + categories
- `src/routes/login/+page.svelte` — Passphrase login form
- `src/routes/api/countries/+server.js` — GET countries
- `src/routes/api/clues/+server.js` — GET (by country/category), POST
- `src/routes/api/clues/[id]/+server.js` — PUT, DELETE
- `src/routes/api/categories/+server.js` — GET, POST
- `src/routes/api/categories/[slug]/+server.js` — PUT, DELETE
- `src/routes/api/auth/login/+server.js` — POST login
- `src/routes/api/auth/logout/+server.js` — POST logout

**Migration:**
- `migrate.js` — Schema migration script (run once)
- `schema.sql` — Updated schema reference

**Moved:**
- `countries.geojson` → `static/countries.geojson`

**Removed (after SvelteKit is working):**
- `index.html`, `country.html`, `style.css`
- `api/clues.js`, `api/countries.js`, `api/db.js`
- `fetch_clues.js`, `seed.js`
- `features/bollards.html`, `notes/finland.html`
- `data/clues.json`

---

### Task 1: SvelteKit Scaffold + DB Migration

**Files:**
- Create: `svelte.config.js`, `vite.config.js`, `src/app.html`, `src/app.css`, `src/lib/server/db.js`, `src/routes/+layout.svelte`, `migrate.js`, `schema.sql`
- Move: `countries.geojson` → `static/countries.geojson`
- Modify: `package.json`, `.gitignore`

**Interfaces:**
- Consumes: existing Neon DB with `countries` + `clues` tables, `DATABASE_URL` env var
- Produces: `sql` tagged template from `$lib/server/db.js` — used by all API routes. Migrated DB with `categories` table and renamed `feature` → `category` column.

- [ ] **Step 1: Create SvelteKit config files**

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter()
  }
};
```

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
```

```html
<!-- src/app.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>GeoSeeker</title>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 2: Create global CSS with theme variables**

```css
/* src/app.css */
:root {
  --bg: #f8f9fa;
  --surface: #ffffff;
  --surface-hover: #f1f3f5;
  --border: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --accent: #1b4332;
  --accent-hover: #2d6a4f;
  --accent-text: #ffffff;
  --country-fill: #94d2bd;
  --country-hover: #52b788;
  --country-has-clues: #2d6a4f;
  --danger: #dc3545;
  --danger-hover: #c82333;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.1);
  --radius: 8px;
  --radius-sm: 4px;
  --drawer-width: 420px;
  --topbar-height: 56px;
}

:root.dark {
  --bg: #0d1117;
  --surface: #161b22;
  --surface-hover: #1c2128;
  --border: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --accent: #58a6ff;
  --accent-hover: #79b8ff;
  --accent-text: #0d1117;
  --country-fill: #1a7f5a;
  --country-hover: #2ea77a;
  --country-has-clues: #3fb68b;
  --danger: #f85149;
  --danger-hover: #da3633;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.4);
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  cursor: pointer;
  font-family: inherit;
  border: none;
  background: none;
}

a {
  color: var(--accent);
  text-decoration: none;
}

input,
textarea,
select {
  font-family: inherit;
  font-size: inherit;
  color: var(--text-primary);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  outline: none;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
```

- [ ] **Step 3: Create db.js and bare layout**

```js
// src/lib/server/db.js
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';

export const sql = neon(DATABASE_URL);
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

- [ ] **Step 4: Update package.json**

Replace `package.json` contents:

```json
{
  "name": "geoseeker",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "migrate": "node migrate.js"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.1.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-vercel": "^5.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "dotenv": "^16.5.0",
    "leaflet": "^1.9.4",
    "svelte": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

Note: `leaflet` is a devDependency because it's only imported client-side (dynamic import in `onMount`). `dotenv` is a devDependency for the migration script.

- [ ] **Step 5: Update .gitignore**

Append SvelteKit entries to `.gitignore`:

```
.svelte-kit
build
node_modules
.env
.vercel
```

- [ ] **Step 6: Move GeoJSON to static/**

```bash
mkdir -p static
mv countries.geojson static/countries.geojson
```

- [ ] **Step 7: Write migration script**

```js
// migrate.js
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('1/6 Creating categories table...');
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      slug VARCHAR(50) PRIMARY KEY,
      label VARCHAR(100) NOT NULL,
      icon VARCHAR(50) DEFAULT '',
      sort_order INT DEFAULT 0
    )
  `;

  console.log('2/6 Seeding categories from existing features...');
  const features = await sql`SELECT DISTINCT feature FROM clues`;
  for (const { feature } of features) {
    await sql`
      INSERT INTO categories (slug, label)
      VALUES (${feature.toLowerCase()}, ${feature})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log('3/6 Adding sort_order column...');
  await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`;

  console.log('4/6 Adding updated_at column...');
  await sql`ALTER TABLE clues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

  console.log('5/6 Renaming feature → category...');
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'clues' AND column_name = 'feature'
  `;
  if (cols.length > 0) {
    await sql`ALTER TABLE clues RENAME COLUMN feature TO category`;
    await sql`UPDATE clues SET category = lower(category)`;
  }

  console.log('6/6 Adding FK constraint...');
  const fks = await sql`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'clues' AND constraint_name = 'fk_clues_category'
  `;
  if (fks.length === 0) {
    await sql`
      ALTER TABLE clues
      ADD CONSTRAINT fk_clues_category FOREIGN KEY (category) REFERENCES categories(slug)
    `;
  }

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

- [ ] **Step 8: Update schema.sql reference**

```sql
-- schema.sql
CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE categories (
  slug VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '',
  sort_order INT DEFAULT 0
);

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

- [ ] **Step 9: Install dependencies and run migration**

```bash
npm install
npm run migrate
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:5173` — should see blank page (just the layout). Check terminal for no errors.

- [ ] **Step 11: Commit**

```bash
git add svelte.config.js vite.config.js src/app.html src/app.css src/lib/server/db.js src/routes/+layout.svelte package.json package-lock.json .gitignore static/countries.geojson migrate.js schema.sql
git commit -m "feat: scaffold SvelteKit project and migrate DB schema"
```

---

### Task 2: Auth System

**Files:**
- Create: `src/lib/server/auth.js`, `src/hooks.server.js`, `src/lib/stores/admin.js`, `src/routes/api/auth/login/+server.js`, `src/routes/api/auth/logout/+server.js`, `src/routes/+layout.server.js`, `src/routes/login/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `ADMIN_PASSWORD` env var
- Produces: `event.locals.isAdmin` boolean (available in all server routes). `admin` writable store (available in all components). Login/logout API endpoints.

- [ ] **Step 1: Create auth helpers**

```js
// src/lib/server/auth.js
import { ADMIN_PASSWORD } from '$env/static/private';
import { createHmac } from 'crypto';

export function createSessionToken() {
  return createHmac('sha256', ADMIN_PASSWORD).update('geoseeker-admin').digest('hex');
}

export function verifySessionToken(token) {
  if (!token) return false;
  return token === createSessionToken();
}
```

- [ ] **Step 2: Create hooks.server.js**

```js
// src/hooks.server.js
import { verifySessionToken } from '$lib/server/auth';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('session');
  event.locals.isAdmin = verifySessionToken(token);
  return resolve(event);
}
```

- [ ] **Step 3: Create admin store**

```js
// src/lib/stores/admin.js
import { writable } from 'svelte/store';

export const isAdmin = writable(false);
```

- [ ] **Step 4: Create layout server load**

```js
// src/routes/+layout.server.js
export function load({ locals }) {
  return { isAdmin: locals.isAdmin };
}
```

- [ ] **Step 5: Update layout to hydrate admin state**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  import { isAdmin } from '$lib/stores/admin';

  let { data, children } = $props();

  isAdmin.set(data.isAdmin);
</script>

{@render children()}
```

- [ ] **Step 6: Create login API route**

```js
// src/routes/api/auth/login/+server.js
import { json } from '@sveltejs/kit';
import { ADMIN_PASSWORD } from '$env/static/private';
import { createSessionToken } from '$lib/server/auth';

export async function POST({ request, cookies }) {
  const { password } = await request.json();

  if (password !== ADMIN_PASSWORD) {
    return json({ error: 'Invalid password' }, { status: 401 });
  }

  cookies.set('session', createSessionToken(), {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7
  });

  return json({ success: true });
}
```

- [ ] **Step 7: Create logout API route**

```js
// src/routes/api/auth/logout/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  cookies.delete('session', { path: '/' });
  return json({ success: true });
}
```

- [ ] **Step 8: Create login page**

```svelte
<!-- src/routes/login/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';

  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleLogin(e) {
    e.preventDefault();
    error = '';
    loading = true;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      isAdmin.set(true);
      goto('/');
    } else {
      error = 'Invalid password';
    }
    loading = false;
  }
</script>

<div class="login-page">
  <form class="login-form" onsubmit={handleLogin}>
    <h1>GeoSeeker Admin</h1>
    <input
      type="password"
      placeholder="Enter passphrase"
      bind:value={password}
      disabled={loading}
      autofocus
    />
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <button type="submit" class="btn-primary" disabled={loading}>
      {loading ? 'Signing in...' : 'Sign in'}
    </button>
    <a href="/">← Back to map</a>
  </form>
</div>

<style>
  .login-page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }

  .login-form {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px;
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--accent-text);
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-weight: 500;
    transition: background 0.15s;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    color: var(--danger);
    font-size: 14px;
    text-align: center;
  }

  a {
    text-align: center;
    font-size: 14px;
    color: var(--text-secondary);
  }
</style>
```

- [ ] **Step 9: Add ADMIN_PASSWORD to .env**

```
ADMIN_PASSWORD=your-secret-passphrase-here
```

- [ ] **Step 10: Verify auth flow**

```bash
npm run dev
```

1. Open `http://localhost:5173/login`
2. Enter wrong password → "Invalid password" error
3. Enter correct password → redirects to `/`, check cookie in devtools (Application → Cookies → `session`)
4. Verify cookie is httpOnly

- [ ] **Step 11: Commit**

```bash
git add src/lib/server/auth.js src/hooks.server.js src/lib/stores/admin.js src/routes/api/auth src/routes/+layout.server.js src/routes/+layout.svelte src/routes/login
git commit -m "feat: add passphrase auth with cookie-based sessions"
```

---

### Task 3: Public API Routes

**Files:**
- Create: `src/routes/api/countries/+server.js`, `src/routes/api/clues/+server.js`, `src/routes/api/categories/+server.js`

**Interfaces:**
- Consumes: `sql` from `$lib/server/db`
- Produces:
  - `GET /api/countries` → `[{code, name, clue_count}]`
  - `GET /api/clues?country=XX` → `{country: {code, name}, clues: [{id, category, category_label, category_icon, clue, image_url, sort_order}]}`
  - `GET /api/clues?category=xx` → `{category: {slug, label, icon}, countries: [{code, name, clues: [...]}]}`
  - `GET /api/categories` → `[{slug, label, icon, sort_order}]`

- [ ] **Step 1: Create countries endpoint**

```js
// src/routes/api/countries/+server.js
import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function GET() {
  const rows = await sql`
    SELECT c.code, c.name, COUNT(cl.id)::int AS clue_count
    FROM countries c
    LEFT JOIN clues cl ON cl.country_code = c.code
    GROUP BY c.code, c.name
    ORDER BY c.name
  `;
  return json(rows);
}
```

- [ ] **Step 2: Create clues endpoint (dual-mode)**

```js
// src/routes/api/clues/+server.js
import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function GET({ url }) {
  const country = url.searchParams.get('country')?.toUpperCase();
  const category = url.searchParams.get('category')?.toLowerCase();

  if (country) {
    const countryRow = await sql`SELECT code, name FROM countries WHERE code = ${country}`;
    if (countryRow.length === 0) return json({ error: 'Country not found' }, { status: 404 });

    const clues = await sql`
      SELECT c.id, c.category, cat.label AS category_label, cat.icon AS category_icon,
             c.clue, c.image_url, c.sort_order
      FROM clues c
      JOIN categories cat ON cat.slug = c.category
      WHERE c.country_code = ${country}
      ORDER BY cat.sort_order, c.sort_order, c.id
    `;

    return json({ country: countryRow[0], clues });
  }

  if (category) {
    const catRow = await sql`SELECT slug, label, icon FROM categories WHERE slug = ${category}`;
    if (catRow.length === 0) return json({ error: 'Category not found' }, { status: 404 });

    const rows = await sql`
      SELECT c.id, c.country_code, co.name AS country_name,
             c.clue, c.image_url, c.sort_order
      FROM clues c
      JOIN countries co ON co.code = c.country_code
      WHERE c.category = ${category}
      ORDER BY co.name, c.sort_order, c.id
    `;

    const countries = [];
    const seen = {};
    for (const row of rows) {
      if (!seen[row.country_code]) {
        seen[row.country_code] = { code: row.country_code, name: row.country_name, clues: [] };
        countries.push(seen[row.country_code]);
      }
      seen[row.country_code].clues.push({
        id: row.id,
        clue: row.clue,
        image_url: row.image_url,
        sort_order: row.sort_order
      });
    }

    return json({ category: catRow[0], countries });
  }

  return json({ error: 'Provide country or category query param' }, { status: 400 });
}
```

- [ ] **Step 3: Create categories endpoint**

```js
// src/routes/api/categories/+server.js
import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function GET() {
  const rows = await sql`SELECT slug, label, icon, sort_order FROM categories ORDER BY sort_order, label`;
  return json(rows);
}
```

- [ ] **Step 4: Verify all endpoints**

```bash
npm run dev
```

Test with curl:

```bash
curl http://localhost:5173/api/countries
curl http://localhost:5173/api/categories
curl "http://localhost:5173/api/clues?country=FI"
curl "http://localhost:5173/api/clues?category=bollards"
```

Each should return valid JSON. The country/category queries depend on having data from the migration — verify at least one returns clues.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/countries src/routes/api/clues/+server.js src/routes/api/categories/+server.js
git commit -m "feat: add public API routes for countries, clues, categories"
```

---

### Task 4: Theme System

**Files:**
- Create: `src/lib/stores/theme.js`, `src/lib/components/ThemeToggle.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: nothing
- Produces: `theme` store with `.toggle()` and `.init()` methods. `ThemeToggle` component. CSS class `dark` on `<html>` element controls all themed styling via CSS custom properties defined in `app.css`.

- [ ] **Step 1: Create theme store**

```js
// src/lib/stores/theme.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createThemeStore() {
  const initial = browser
    ? localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : 'light';

  const { subscribe, set, update } = writable(initial);

  return {
    subscribe,
    toggle() {
      update(current => {
        const next = current === 'dark' ? 'light' : 'dark';
        if (browser) {
          localStorage.setItem('theme', next);
          document.documentElement.classList.toggle('dark', next === 'dark');
        }
        return next;
      });
    },
    init() {
      if (browser) {
        const saved = localStorage.getItem('theme');
        const value = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        set(value);
        document.documentElement.classList.toggle('dark', value === 'dark');
      }
    }
  };
}

export const theme = createThemeStore();
```

- [ ] **Step 2: Create ThemeToggle component**

```svelte
<!-- src/lib/components/ThemeToggle.svelte -->
<script>
  import { theme } from '$lib/stores/theme';
</script>

<button class="theme-toggle" onclick={() => theme.toggle()} aria-label="Toggle theme">
  {#if $theme === 'dark'}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  {:else}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: color 0.15s, background 0.15s;
  }

  .theme-toggle:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }
</style>
```

- [ ] **Step 3: Update layout to init theme**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  import { isAdmin } from '$lib/stores/admin';
  import { theme } from '$lib/stores/theme';

  let { data, children } = $props();

  isAdmin.set(data.isAdmin);
  theme.init();
</script>

{@render children()}
```

- [ ] **Step 4: Verify theme toggle**

```bash
npm run dev
```

Temporarily add `<ThemeToggle />` to the layout to test. Click toggle — page background should switch between light `#f8f9fa` and dark `#0d1117`. Check that `localStorage.theme` persists across refresh. Remove the temporary toggle after verifying.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/theme.js src/lib/components/ThemeToggle.svelte src/routes/+layout.svelte
git commit -m "feat: add dark/light theme system with localStorage persistence"
```

---

### Task 5: Map Component

**Files:**
- Create: `src/lib/components/Map.svelte`

**Interfaces:**
- Consumes: `theme` store, `countries.geojson` from `/countries.geojson`
- Produces: `Map` component with props: `countriesWithClues: Set<string>`, `onCountryClick: (code: string, name: string) => void`. Renders full-screen Leaflet map with themed tiles and interactive country polygons.

- [ ] **Step 1: Create Map component**

```svelte
<!-- src/lib/components/Map.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { theme } from '$lib/stores/theme';

  let { countriesWithClues = new Set(), onCountryClick = () => {} } = $props();

  let mapEl;
  let map;
  let tileLayer;
  let geoJsonLayer;
  let L;

  const TILES = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  const ATTRIBUTION = '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>';

  function getStyle(feature) {
    const code = feature.properties?.['ISO3166-1-Alpha-2'];
    const hasClues = countriesWithClues.has(code);
    let currentTheme = 'light';
    theme.subscribe(t => (currentTheme = t))();

    if (currentTheme === 'dark') {
      return {
        color: '#30363d',
        weight: 1,
        fillColor: hasClues ? '#3fb68b' : '#1a7f5a',
        fillOpacity: hasClues ? 0.55 : 0.25
      };
    }
    return {
      color: '#dee2e6',
      weight: 1,
      fillColor: hasClues ? '#2d6a4f' : '#94d2bd',
      fillOpacity: hasClues ? 0.55 : 0.3
    };
  }

  function highlightStyle(currentTheme) {
    return {
      weight: 2,
      fillOpacity: 0.7,
      fillColor: currentTheme === 'dark' ? '#2ea77a' : '#52b788'
    };
  }

  onMount(async () => {
    const leaflet = await import('leaflet');
    L = leaflet.default || leaflet;

    await import('leaflet/dist/leaflet.css');

    map = L.map(mapEl, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 7,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution(ATTRIBUTION)
      .addTo(map);

    let currentTheme = 'light';
    theme.subscribe(t => (currentTheme = t))();
    tileLayer = L.tileLayer(TILES[currentTheme]).addTo(map);

    const response = await fetch('/countries.geojson');
    const geojson = await response.json();

    geoJsonLayer = L.geoJSON(geojson, {
      style: getStyle,
      onEachFeature(feature, layer) {
        const code = feature.properties?.['ISO3166-1-Alpha-2'];
        const name = feature.properties?.name;
        if (!code) return;

        layer.bindTooltip(name, {
          sticky: true,
          direction: 'top',
          className: 'country-tooltip'
        });

        layer.on('click', () => onCountryClick(code, name));

        layer.on('mouseover', () => {
          layer.setStyle(highlightStyle(currentTheme));
          layer.bringToFront();
        });

        layer.on('mouseout', () => {
          geoJsonLayer.resetStyle(layer);
        });
      }
    }).addTo(map);
  });

  onDestroy(() => {
    map?.remove();
  });

  $effect(() => {
    const unsub = theme.subscribe(t => {
      if (tileLayer) tileLayer.setUrl(TILES[t]);
      if (geoJsonLayer) geoJsonLayer.setStyle(getStyle);
    });
    return unsub;
  });
</script>

<div class="map" bind:this={mapEl}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
    top: var(--topbar-height);
    z-index: 0;
  }

  :global(.country-tooltip) {
    background: var(--surface) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius-sm) !important;
    padding: 4px 10px !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    box-shadow: var(--shadow) !important;
  }

  :global(.country-tooltip::before) {
    border-top-color: var(--border) !important;
  }

  :global(.leaflet-control-zoom a) {
    background: var(--surface) !important;
    color: var(--text-primary) !important;
    border-color: var(--border) !important;
  }

  :global(.leaflet-control-zoom a:hover) {
    background: var(--surface-hover) !important;
  }
</style>
```

- [ ] **Step 2: Verify map renders**

Create a temporary `+page.svelte` to test:

```svelte
<!-- src/routes/+page.svelte (temporary) -->
<script>
  import Map from '$lib/components/Map.svelte';
</script>

<header style="height: var(--topbar-height); background: var(--surface); border-bottom: 1px solid var(--border);"></header>
<Map countriesWithClues={new Set(['FI', 'SE', 'AU'])} onCountryClick={(code, name) => console.log(code, name)} />
```

```bash
npm run dev
```

Verify: map fills viewport below header, CartoDB Positron tiles load, countries have fill color, Finland/Sweden/Australia show deeper green, hover highlights, click logs to console, theme toggle swaps tiles.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Map.svelte
git commit -m "feat: add Leaflet map component with themed tiles and country interactions"
```

---

### Task 6: Page Assembly + Category Bar + Admin Bar

**Files:**
- Create: `src/lib/components/CategoryBar.svelte`, `src/lib/components/AdminBar.svelte`, `src/routes/+page.svelte`, `src/routes/+page.js`

**Interfaces:**
- Consumes: `GET /api/countries`, `GET /api/categories`, `Map` component, `theme` store, `isAdmin` store
- Produces: Full landing page with map, top bar (title, category pills, theme toggle, admin indicator), and state management for drawer open/close/mode. Exports `openCountry(code, name)` and `openCategory(slug)` as internal functions wired to Map clicks and CategoryBar clicks respectively.

- [ ] **Step 1: Create page load function**

```js
// src/routes/+page.js
export async function load({ fetch }) {
  const [countriesRes, categoriesRes] = await Promise.all([
    fetch('/api/countries'),
    fetch('/api/categories')
  ]);

  return {
    countries: await countriesRes.json(),
    categories: await categoriesRes.json()
  };
}
```

- [ ] **Step 2: Create CategoryBar component**

```svelte
<!-- src/lib/components/CategoryBar.svelte -->
<script>
  let { categories = [], activeSlug = null, onSelect = () => {} } = $props();
</script>

<nav class="category-bar">
  {#each categories as cat}
    <button
      class="pill"
      class:active={activeSlug === cat.slug}
      onclick={() => onSelect(cat.slug)}
    >
      {#if cat.icon}<span class="pill-icon">{cat.icon}</span>{/if}
      {cat.label}
    </button>
  {/each}
</nav>

<style>
  .category-bar {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .category-bar::-webkit-scrollbar {
    display: none;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    color: var(--text-secondary);
    background: var(--surface);
    border: 1px solid var(--border);
    transition: all 0.15s;
  }

  .pill:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }

  .pill.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  .pill-icon {
    font-size: 14px;
  }
</style>
```

- [ ] **Step 3: Create AdminBar component**

```svelte
<!-- src/lib/components/AdminBar.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { isAdmin } from '$lib/stores/admin';

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    isAdmin.set(false);
    goto('/');
  }
</script>

{#if $isAdmin}
  <div class="admin-bar">
    <span class="admin-dot"></span>
    <span class="admin-label">Admin</span>
    <button class="logout-btn" onclick={logout}>Sign out</button>
  </div>
{/if}

<style>
  .admin-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-radius: 20px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-size: 12px;
    font-weight: 500;
  }

  .admin-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
  }

  .admin-label {
    color: var(--accent);
  }

  .logout-btn {
    color: var(--text-secondary);
    font-size: 12px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    transition: color 0.15s;
  }

  .logout-btn:hover {
    color: var(--text-primary);
  }
</style>
```

- [ ] **Step 4: Create main page**

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import Map from '$lib/components/Map.svelte';
  import CategoryBar from '$lib/components/CategoryBar.svelte';
  import AdminBar from '$lib/components/AdminBar.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { isAdmin } from '$lib/stores/admin';

  let { data } = $props();

  let drawerOpen = $state(false);
  let drawerMode = $state('country');
  let selectedCountry = $state(null);
  let selectedCategorySlug = $state(null);
  let drawerData = $state(null);
  let drawerLoading = $state(false);

  let countriesWithClues = $derived(
    new Set(data.countries.filter(c => c.clue_count > 0).map(c => c.code))
  );

  async function openCountry(code, name) {
    drawerMode = 'country';
    selectedCountry = { code, name };
    selectedCategorySlug = null;
    drawerLoading = true;
    drawerOpen = true;

    const res = await fetch(`/api/clues?country=${code}`);
    drawerData = await res.json();
    drawerLoading = false;
  }

  async function openCategory(slug) {
    drawerMode = 'category';
    selectedCategorySlug = slug;
    selectedCountry = null;
    drawerLoading = true;
    drawerOpen = true;

    const res = await fetch(`/api/clues?category=${slug}`);
    drawerData = await res.json();
    drawerLoading = false;
  }

  function closeDrawer() {
    drawerOpen = false;
    drawerData = null;
    selectedCountry = null;
    selectedCategorySlug = null;
  }

  async function refreshData() {
    const res = await fetch('/api/countries');
    data.countries = await res.json();

    if (drawerMode === 'country' && selectedCountry) {
      const r = await fetch(`/api/clues?country=${selectedCountry.code}`);
      drawerData = await r.json();
    } else if (drawerMode === 'category' && selectedCategorySlug) {
      const r = await fetch(`/api/clues?category=${selectedCategorySlug}`);
      drawerData = await r.json();
    }
  }
</script>

<div class="app">
  <header class="topbar">
    <a href="/" class="logo">GeoSeeker</a>
    <CategoryBar
      categories={data.categories}
      activeSlug={drawerMode === 'category' ? selectedCategorySlug : null}
      onSelect={openCategory}
    />
    <div class="topbar-actions">
      <ThemeToggle />
      {#if $isAdmin}
        <AdminBar />
      {/if}
    </div>
  </header>

  <Map {countriesWithClues} onCountryClick={openCountry} />

  <!-- Drawer will be added in Task 7 -->
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .topbar {
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 1000;
    flex-shrink: 0;
  }

  .logo {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
    white-space: nowrap;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
  }
</style>
```

- [ ] **Step 5: Verify page assembly**

```bash
npm run dev
```

Verify:
1. Top bar shows "GeoSeeker" title, category pills, theme toggle
2. Map fills viewport below top bar
3. Countries with clues (FI, SE, AU from seed data) show deeper color
4. Hover shows country name tooltip
5. Click a country → `openCountry` runs (no drawer yet, but no errors)
6. Click a category pill → `openCategory` runs
7. Login at `/login` → admin bar appears with green dot + "Admin" + "Sign out"
8. Theme toggle works

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/routes/+page.js src/lib/components/CategoryBar.svelte src/lib/components/AdminBar.svelte
git commit -m "feat: assemble main page with map, category bar, and admin indicator"
```

---

### Task 7: Drawer — Country Mode

**Files:**
- Create: `src/lib/components/ClueDrawer.svelte`, `src/lib/components/ClueCard.svelte`
- Modify: `src/routes/+page.svelte` (wire drawer)

**Interfaces:**
- Consumes: `GET /api/clues?country=XX` response, `isAdmin` store
- Produces: `ClueDrawer` component (country mode). Props: `open`, `mode`, `data`, `loading`, `isAdmin`, `onClose`, `onCategoryClick`, `onCountryClick`, `onDataChanged`. `ClueCard` component. Props: `clue`, `isAdmin`, `onEdit`, `onDelete`.

- [ ] **Step 1: Create ClueCard component**

```svelte
<!-- src/lib/components/ClueCard.svelte -->
<script>
  let { clue, isAdmin = false, onEdit = () => {}, onDelete = () => {} } = $props();

  let imageExpanded = $state(false);
</script>

<div class="card">
  <p class="clue-text">{clue.clue}</p>

  {#if clue.image_url}
    <button class="image-thumb" onclick={() => (imageExpanded = !imageExpanded)}>
      <img src={clue.image_url} alt="Clue reference" loading="lazy" />
    </button>
    {#if imageExpanded}
      <div class="image-expanded" onclick={() => (imageExpanded = false)} role="button" tabindex="-1">
        <img src={clue.image_url} alt="Clue reference expanded" />
      </div>
    {/if}
  {/if}

  {#if isAdmin}
    <div class="card-actions">
      <button class="action-btn edit" onclick={onEdit} aria-label="Edit clue">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button class="action-btn delete" onclick={onDelete} aria-label="Delete clue">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    transition: box-shadow 0.15s;
  }

  .card:hover {
    box-shadow: var(--shadow);
  }

  .clue-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .image-thumb {
    margin-top: 10px;
    padding: 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    display: block;
  }

  .image-thumb img {
    display: block;
    max-width: 100%;
    max-height: 120px;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  .image-expanded {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    cursor: pointer;
  }

  .image-expanded img {
    max-width: 90vw;
    max-height: 90vh;
    border-radius: var(--radius);
  }

  .card-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .card:hover .card-actions {
    opacity: 1;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: all 0.15s;
  }

  .action-btn.edit:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .action-btn.delete:hover {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }
</style>
```

- [ ] **Step 2: Create ClueDrawer component (country mode only for now)**

```svelte
<!-- src/lib/components/ClueDrawer.svelte -->
<script>
  import { fly } from 'svelte/transition';
  import ClueCard from './ClueCard.svelte';

  let {
    open = false,
    mode = 'country',
    data = null,
    loading = false,
    isAdmin = false,
    onClose = () => {},
    onCategoryClick = () => {},
    onCountryClick = () => {},
    onDataChanged = () => {}
  } = $props();

  function groupByCategory(clues) {
    const groups = {};
    for (const clue of clues) {
      const key = clue.category;
      if (!groups[key]) {
        groups[key] = {
          slug: clue.category,
          label: clue.category_label,
          icon: clue.category_icon,
          clues: []
        };
      }
      groups[key].clues.push(clue);
    }
    return Object.values(groups);
  }

  let collapsedSections = $state(new Set());

  function toggleSection(slug) {
    const next = new Set(collapsedSections);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    collapsedSections = next;
  }

  function countryFlag(code) {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(
      ...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  }
</script>

{#if open}
  <div class="backdrop" onclick={onClose} transition:fly={{ duration: 200 }}></div>

  <aside class="drawer" transition:fly={{ x: 420, duration: 300, opacity: 1 }}>
    <div class="drawer-header">
      <button class="close-btn" onclick={onClose} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {#if loading}
        <div class="loading">Loading...</div>
      {:else if mode === 'country' && data?.country}
        <h2>
          <span class="flag">{countryFlag(data.country.code)}</span>
          {data.country.name}
        </h2>
        <span class="badge">{data.clues?.length || 0} clues</span>
      {:else if mode === 'category' && data?.category}
        <h2>
          {#if data.category.icon}<span class="cat-icon">{data.category.icon}</span>{/if}
          {data.category.label}
        </h2>
        <span class="badge">{data.countries?.length || 0} countries</span>
      {/if}
    </div>

    <div class="drawer-body">
      {#if loading}
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      {:else if mode === 'country' && data?.clues}
        {#each groupByCategory(data.clues) as group}
          <section class="section">
            <button class="section-header" onclick={() => toggleSection(group.slug)}>
              <h3>
                <button class="cat-link" onclick={(e) => { e.stopPropagation(); onCategoryClick(group.slug); }}>
                  {#if group.icon}<span>{group.icon}</span>{/if}
                  {group.label}
                </button>
              </h3>
              <span class="section-count">{group.clues.length}</span>
              <span class="chevron" class:collapsed={collapsedSections.has(group.slug)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {#if !collapsedSections.has(group.slug)}
              <div class="section-body">
                {#each group.clues as clue}
                  <ClueCard {clue} {isAdmin} />
                {/each}
              </div>
            {/if}
          </section>
        {/each}

        {#if data.clues.length === 0}
          <div class="empty">No clues yet for this country.</div>
        {/if}

      {:else if mode === 'category' && data?.countries}
        {#each data.countries as country}
          <section class="section">
            <button class="section-header" onclick={() => toggleSection(country.code)}>
              <h3>
                <button class="country-link" onclick={(e) => { e.stopPropagation(); onCountryClick(country.code, country.name); }}>
                  <span class="flag">{countryFlag(country.code)}</span>
                  {country.name}
                </button>
              </h3>
              <span class="section-count">{country.clues.length}</span>
              <span class="chevron" class:collapsed={collapsedSections.has(country.code)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {#if !collapsedSections.has(country.code)}
              <div class="section-body">
                {#each country.clues as clue}
                  <ClueCard {clue} {isAdmin} />
                {/each}
              </div>
            {/if}
          </section>
        {/each}

        {#if data.countries.length === 0}
          <div class="empty">No clues yet for this category.</div>
        {/if}
      {/if}
    </div>
  </aside>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    top: var(--topbar-height);
    background: rgba(0, 0, 0, 0.2);
    z-index: 1500;
  }

  .drawer {
    position: fixed;
    top: var(--topbar-height);
    right: 0;
    bottom: 0;
    width: var(--drawer-width);
    max-width: 90vw;
    background: var(--bg);
    border-left: 1px solid var(--border);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  h2 {
    font-size: 18px;
    font-weight: 600;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .flag {
    font-size: 22px;
  }

  .badge {
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--surface);
    padding: 2px 10px;
    border-radius: 12px;
    border: 1px solid var(--border);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 0;
    text-align: left;
  }

  .section-header h3 {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
  }

  .section-count {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .chevron {
    transition: transform 0.2s;
    color: var(--text-secondary);
    display: flex;
  }

  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .section-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 4px;
  }

  .cat-link,
  .country-link {
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    transition: color 0.15s;
  }

  .cat-link:hover,
  .country-link:hover {
    color: var(--accent);
  }

  .empty {
    text-align: center;
    color: var(--text-secondary);
    padding: 40px 20px;
    font-size: 14px;
  }

  .loading {
    color: var(--text-secondary);
    font-size: 14px;
  }

  .loading-spinner {
    display: flex;
    justify-content: center;
    padding: 40px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

- [ ] **Step 3: Wire drawer into +page.svelte**

Add the import and component at the bottom of the `<div class="app">` in `+page.svelte`, replacing the `<!-- Drawer will be added in Task 7 -->` comment:

```svelte
<script>
  // Add to existing imports:
  import ClueDrawer from '$lib/components/ClueDrawer.svelte';
</script>

<!-- Inside .app div, after <Map>: -->
<ClueDrawer
  open={drawerOpen}
  mode={drawerMode}
  data={drawerData}
  loading={drawerLoading}
  isAdmin={$isAdmin}
  onClose={closeDrawer}
  onCategoryClick={openCategory}
  onCountryClick={openCountry}
  onDataChanged={refreshData}
/>
```

- [ ] **Step 4: Verify drawer**

```bash
npm run dev
```

1. Click a country on the map → drawer slides in from right with country name, flag, and clues grouped by category
2. Click X or backdrop → drawer closes with smooth animation
3. Click a category pill in top bar → drawer shows that category's clues across countries
4. Click a category label in country mode → drawer pivots to that category's cross-country view
5. Click a country name in category mode → drawer pivots to that country's full clue list
6. Verify loading spinner appears during fetch
7. Check dark mode — drawer background, card colors, text should all follow theme

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ClueDrawer.svelte src/lib/components/ClueCard.svelte src/routes/+page.svelte
git commit -m "feat: add clue drawer with country and category browse modes"
```

---

### Task 8: Admin Clue CRUD

**Files:**
- Create: `src/lib/components/ClueForm.svelte`, `src/routes/api/clues/[id]/+server.js`
- Modify: `src/routes/api/clues/+server.js` (add POST handler), `src/lib/components/ClueDrawer.svelte` (wire add/edit/delete), `src/lib/components/ClueCard.svelte` (wire edit/delete callbacks)

**Interfaces:**
- Consumes: `POST /api/clues`, `PUT /api/clues/[id]`, `DELETE /api/clues/[id]`, `GET /api/categories` (for dropdown), `isAdmin` store
- Produces: `ClueForm` component (inline add/edit). Props: `countryCode`, `categories`, `existingClue?`, `onSave`, `onCancel`. Full CRUD flow for clues in admin mode.

- [ ] **Step 1: Add POST handler to clues endpoint**

Append to `src/routes/api/clues/+server.js`:

```js
export async function POST({ request, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { country_code, category, clue, image_url } = await request.json();

  if (!country_code || !category || !clue) {
    return json({ error: 'country_code, category, and clue are required' }, { status: 400 });
  }

  const [row] = await sql`
    INSERT INTO clues (country_code, category, clue, image_url)
    VALUES (${country_code.toUpperCase()}, ${category.toLowerCase()}, ${clue}, ${image_url || ''})
    RETURNING id, country_code, category, clue, image_url, sort_order, created_at
  `;

  return json(row, { status: 201 });
}
```

- [ ] **Step 2: Create clue mutation endpoint**

```js
// src/routes/api/clues/[id]/+server.js
import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function PUT({ params, request, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id);
  const body = await request.json();

  const existing = await sql`SELECT * FROM clues WHERE id = ${id}`;
  if (existing.length === 0) {
    return json({ error: 'Clue not found' }, { status: 404 });
  }

  const prev = existing[0];
  const category = body.category ?? prev.category;
  const clue = body.clue ?? prev.clue;
  const image_url = body.image_url ?? prev.image_url;
  const sort_order = body.sort_order ?? prev.sort_order;

  const [row] = await sql`
    UPDATE clues SET
      category = ${category},
      clue = ${clue},
      image_url = ${image_url},
      sort_order = ${sort_order},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return json(row);
}

export async function DELETE({ params, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id);
  const existing = await sql`SELECT id FROM clues WHERE id = ${id}`;
  if (existing.length === 0) {
    return json({ error: 'Clue not found' }, { status: 404 });
  }

  await sql`DELETE FROM clues WHERE id = ${id}`;
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Create ClueForm component**

```svelte
<!-- src/lib/components/ClueForm.svelte -->
<script>
  let {
    countryCode = '',
    categories = [],
    existingClue = null,
    onSave = () => {},
    onCancel = () => {}
  } = $props();

  let category = $state(existingClue?.category || (categories[0]?.slug ?? ''));
  let clueText = $state(existingClue?.clue || '');
  let imageUrl = $state(existingClue?.image_url || '');
  let saving = $state(false);
  let error = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clueText.trim()) {
      error = 'Clue text is required';
      return;
    }

    saving = true;
    error = '';

    const body = {
      country_code: countryCode,
      category,
      clue: clueText.trim(),
      image_url: imageUrl.trim()
    };

    const url = existingClue ? `/api/clues/${existingClue.id}` : '/api/clues';
    const method = existingClue ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      onSave();
    } else {
      const data = await res.json();
      error = data.error || 'Failed to save';
    }

    saving = false;
  }
</script>

<form class="clue-form" onsubmit={handleSubmit}>
  <div class="field">
    <label for="category">Category</label>
    <select id="category" bind:value={category}>
      {#each categories as cat}
        <option value={cat.slug}>{cat.icon} {cat.label}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="clue">Clue</label>
    <textarea id="clue" bind:value={clueText} rows="3" placeholder="Describe the clue..."></textarea>
  </div>

  <div class="field">
    <label for="image">Image URL</label>
    <input id="image" type="url" bind:value={imageUrl} placeholder="https://..." />
    {#if imageUrl}
      <img class="preview" src={imageUrl} alt="Preview" onerror={(e) => e.target.style.display='none'} />
    {/if}
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="form-actions">
    <button type="button" class="btn-cancel" onclick={onCancel} disabled={saving}>Cancel</button>
    <button type="submit" class="btn-save" disabled={saving}>
      {saving ? 'Saving...' : existingClue ? 'Update' : 'Add Clue'}
    </button>
  </div>
</form>

<style>
  .clue-form {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  .preview {
    max-width: 100%;
    max-height: 80px;
    border-radius: var(--radius-sm);
    margin-top: 4px;
    object-fit: cover;
  }

  .error {
    color: var(--danger);
    font-size: 13px;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-cancel:hover {
    background: var(--surface-hover);
  }

  .btn-save {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    background: var(--accent);
    color: var(--accent-text);
  }

  .btn-save:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-save:disabled,
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
```

- [ ] **Step 4: Wire admin controls into ClueDrawer**

Update `ClueDrawer.svelte` to add admin functionality. Add these imports and state:

```svelte
<script>
  // Add to imports:
  import ClueForm from './ClueForm.svelte';

  // Add state:
  let addingToSection = $state(null);
  let editingClue = $state(null);
  let allCategories = $state([]);

  // Fetch categories for the form dropdown when admin opens drawer
  $effect(() => {
    if (open && isAdmin) {
      fetch('/api/categories').then(r => r.json()).then(cats => allCategories = cats);
    }
  });

  async function handleDelete(clueId) {
    if (!confirm('Delete this clue?')) return;
    const res = await fetch(`/api/clues/${clueId}`, { method: 'DELETE' });
    if (res.ok) onDataChanged();
  }

  function handleSaved() {
    addingToSection = null;
    editingClue = null;
    onDataChanged();
  }
</script>
```

In the country mode template, update each `<ClueCard>` to pass edit/delete handlers, and add the "Add Clue" button and form after each section's clue list:

```svelte
<!-- Inside section-body, replace plain <ClueCard {clue} {isAdmin} /> with: -->
{#each group.clues as clue}
  {#if editingClue === clue.id}
    <ClueForm
      countryCode={data.country.code}
      categories={allCategories}
      existingClue={clue}
      onSave={handleSaved}
      onCancel={() => (editingClue = null)}
    />
  {:else}
    <ClueCard
      {clue}
      {isAdmin}
      onEdit={() => (editingClue = clue.id)}
      onDelete={() => handleDelete(clue.id)}
    />
  {/if}
{/each}

{#if isAdmin}
  {#if addingToSection === group.slug}
    <ClueForm
      countryCode={data.country.code}
      categories={allCategories}
      existingClue={null}
      onSave={handleSaved}
      onCancel={() => (addingToSection = null)}
    />
  {:else}
    <button class="add-clue-btn" onclick={() => (addingToSection = group.slug)}>
      + Add Clue
    </button>
  {/if}
{/if}
```

In the category mode template (`{:else if mode === 'category' && data?.countries}`), apply the same admin controls inside each country's section body:

```svelte
{#each country.clues as clue}
  {#if editingClue === clue.id}
    <ClueForm
      countryCode={country.code}
      categories={allCategories}
      existingClue={clue}
      onSave={handleSaved}
      onCancel={() => (editingClue = null)}
    />
  {:else}
    <ClueCard
      {clue}
      {isAdmin}
      onEdit={() => (editingClue = clue.id)}
      onDelete={() => handleDelete(clue.id)}
    />
  {/if}
{/each}

{#if isAdmin}
  {#if addingToSection === country.code}
    <ClueForm
      countryCode={country.code}
      categories={allCategories}
      existingClue={null}
      onSave={handleSaved}
      onCancel={() => (addingToSection = null)}
    />
  {:else}
    <button class="add-clue-btn" onclick={() => (addingToSection = country.code)}>
      + Add Clue
    </button>
  {/if}
{/if}
```

Add the CSS for the add button:

```css
.add-clue-btn {
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}

.add-clue-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}
```

- [ ] **Step 5: Verify admin CRUD flow**

```bash
npm run dev
```

1. Log in at `/login`
2. Click a country → drawer opens with admin controls visible
3. Hover a clue card → edit/delete icons appear
4. Click "Add Clue" → form expands inline with category dropdown, clue textarea, image URL input
5. Fill in a clue, click "Add Clue" → form submits, drawer refreshes showing new clue
6. Click edit icon → card replaced with pre-filled form, change text, "Update" → saves
7. Click delete icon → confirm dialog → clue removed
8. Paste an image URL → preview thumbnail appears in form
9. Log out → admin controls disappear, clue cards have no edit/delete icons

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ClueForm.svelte src/routes/api/clues src/lib/components/ClueDrawer.svelte src/lib/components/ClueCard.svelte
git commit -m "feat: add inline clue CRUD for admin mode"
```

---

### Task 9: Admin Category Management

**Files:**
- Create: `src/lib/components/CategoryModal.svelte`, `src/routes/api/categories/[slug]/+server.js`
- Modify: `src/routes/api/categories/+server.js` (add POST handler), `src/routes/+page.svelte` (wire modal)

**Interfaces:**
- Consumes: `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/[slug]`, `DELETE /api/categories/[slug]`, `isAdmin` store
- Produces: `CategoryModal` component. Full category CRUD. Refreshes category list in top bar after changes.

- [ ] **Step 1: Add POST handler to categories endpoint**

Append to `src/routes/api/categories/+server.js`:

```js
export async function POST({ request, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug, label, icon } = await request.json();

  if (!slug || !label) {
    return json({ error: 'slug and label are required' }, { status: 400 });
  }

  const existing = await sql`SELECT slug FROM categories WHERE slug = ${slug.toLowerCase()}`;
  if (existing.length > 0) {
    return json({ error: 'Category already exists' }, { status: 409 });
  }

  const [row] = await sql`
    INSERT INTO categories (slug, label, icon)
    VALUES (${slug.toLowerCase()}, ${label}, ${icon || ''})
    RETURNING *
  `;

  return json(row, { status: 201 });
}
```

- [ ] **Step 2: Create category mutation endpoint**

```js
// src/routes/api/categories/[slug]/+server.js
import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function PUT({ params, request, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const existing = await sql`SELECT * FROM categories WHERE slug = ${params.slug}`;
  if (existing.length === 0) {
    return json({ error: 'Category not found' }, { status: 404 });
  }

  const prev = existing[0];
  const label = body.label ?? prev.label;
  const icon = body.icon ?? prev.icon;
  const sort_order = body.sort_order ?? prev.sort_order;

  const [row] = await sql`
    UPDATE categories SET label = ${label}, icon = ${icon}, sort_order = ${sort_order}
    WHERE slug = ${params.slug}
    RETURNING *
  `;

  return json(row);
}

export async function DELETE({ params, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clueCount = await sql`SELECT COUNT(*)::int AS count FROM clues WHERE category = ${params.slug}`;
  if (clueCount[0].count > 0) {
    return json({ error: `Cannot delete: ${clueCount[0].count} clues use this category` }, { status: 409 });
  }

  await sql`DELETE FROM categories WHERE slug = ${params.slug}`;
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Create CategoryModal component**

```svelte
<!-- src/lib/components/CategoryModal.svelte -->
<script>
  import { fly } from 'svelte/transition';

  let { open = false, onClose = () => {}, onChanged = () => {} } = $props();

  let categories = $state([]);
  let loading = $state(true);
  let newSlug = $state('');
  let newLabel = $state('');
  let newIcon = $state('');
  let error = $state('');
  let editingSlug = $state(null);
  let editLabel = $state('');
  let editIcon = $state('');

  $effect(() => {
    if (open) loadCategories();
  });

  async function loadCategories() {
    loading = true;
    const res = await fetch('/api/categories');
    categories = await res.json();
    loading = false;
  }

  async function addCategory(e) {
    e.preventDefault();
    error = '';

    if (!newSlug.trim() || !newLabel.trim()) {
      error = 'Slug and label are required';
      return;
    }

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        label: newLabel.trim(),
        icon: newIcon.trim()
      })
    });

    if (res.ok) {
      newSlug = '';
      newLabel = '';
      newIcon = '';
      await loadCategories();
      onChanged();
    } else {
      const data = await res.json();
      error = data.error || 'Failed to create';
    }
  }

  function startEdit(cat) {
    editingSlug = cat.slug;
    editLabel = cat.label;
    editIcon = cat.icon;
  }

  async function saveEdit() {
    const res = await fetch(`/api/categories/${editingSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: editLabel, icon: editIcon })
    });

    if (res.ok) {
      editingSlug = null;
      await loadCategories();
      onChanged();
    }
  }

  async function deleteCategory(slug) {
    if (!confirm(`Delete category "${slug}"?`)) return;

    const res = await fetch(`/api/categories/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      await loadCategories();
      onChanged();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
    }
  }
</script>

{#if open}
  <div class="overlay" onclick={onClose} transition:fly={{ duration: 150 }}></div>
  <div class="modal" transition:fly={{ y: 20, duration: 200 }}>
    <div class="modal-header">
      <h2>Manage Categories</h2>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      {#if loading}
        <p class="loading">Loading...</p>
      {:else}
        <div class="cat-list">
          {#each categories as cat}
            <div class="cat-row">
              {#if editingSlug === cat.slug}
                <input bind:value={editIcon} placeholder="Icon" class="input-sm icon-input" />
                <input bind:value={editLabel} placeholder="Label" class="input-sm" />
                <button class="btn-sm save" onclick={saveEdit}>Save</button>
                <button class="btn-sm" onclick={() => (editingSlug = null)}>Cancel</button>
              {:else}
                <span class="cat-icon">{cat.icon}</span>
                <span class="cat-label">{cat.label}</span>
                <span class="cat-slug">{cat.slug}</span>
                <button class="btn-sm" onclick={() => startEdit(cat)}>Edit</button>
                <button class="btn-sm danger" onclick={() => deleteCategory(cat.slug)}>Delete</button>
              {/if}
            </div>
          {/each}
        </div>

        <form class="add-form" onsubmit={addCategory}>
          <h3>Add Category</h3>
          <div class="add-fields">
            <input bind:value={newIcon} placeholder="Icon (emoji)" class="input-sm icon-input" />
            <input bind:value={newSlug} placeholder="slug" class="input-sm" />
            <input bind:value={newLabel} placeholder="Display Label" class="input-sm" />
            <button type="submit" class="btn-sm save">Add</button>
          </div>
          {#if error}
            <p class="error">{error}</p>
          {/if}
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2500;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    width: 520px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 2600;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .close-btn {
    font-size: 20px;
    color: var(--text-secondary);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background: var(--surface-hover);
  }

  .modal-body {
    padding: 20px;
  }

  .cat-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .cat-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: var(--radius-sm);
    background: var(--bg);
  }

  .cat-icon {
    width: 24px;
    text-align: center;
  }

  .cat-label {
    font-weight: 500;
    flex: 1;
  }

  .cat-slug {
    font-size: 12px;
    color: var(--text-secondary);
    font-family: monospace;
  }

  .add-form {
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }

  .add-form h3 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .add-fields {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .input-sm {
    padding: 6px 10px;
    font-size: 13px;
    flex: 1;
  }

  .icon-input {
    max-width: 60px;
    text-align: center;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .btn-sm:hover {
    background: var(--surface-hover);
  }

  .btn-sm.save {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }

  .btn-sm.save:hover {
    background: var(--accent-hover);
  }

  .btn-sm.danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }

  .error {
    color: var(--danger);
    font-size: 13px;
    margin-top: 8px;
  }

  .loading {
    color: var(--text-secondary);
    text-align: center;
    padding: 20px;
  }
</style>
```

- [ ] **Step 4: Wire modal into page**

Update `src/routes/+page.svelte`:

```svelte
<script>
  // Add import:
  import CategoryModal from '$lib/components/CategoryModal.svelte';

  // Add state:
  let categoryModalOpen = $state(false);

  // Add function to refresh categories after modal changes:
  async function refreshCategories() {
    const res = await fetch('/api/categories');
    data.categories = await res.json();
  }
</script>

<!-- Inside .topbar-actions, before ThemeToggle (only visible to admin): -->
{#if $isAdmin}
  <button class="manage-cats-btn" onclick={() => (categoryModalOpen = true)}>
    Categories
  </button>
{/if}

<!-- At the end of .app div: -->
<CategoryModal
  open={categoryModalOpen}
  onClose={() => (categoryModalOpen = false)}
  onChanged={refreshCategories}
/>
```

Add CSS for the button:

```css
.manage-cats-btn {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.manage-cats-btn:hover {
  color: var(--text-primary);
  background: var(--surface-hover);
}
```

- [ ] **Step 5: Verify category management**

```bash
npm run dev
```

1. Log in → "Categories" button appears in top bar
2. Click it → modal opens with existing categories listed
3. Edit a category label/icon → saves and updates
4. Add new category (e.g. slug: "road-markings", label: "Road Markings", icon: "🛣️") → appears in list and in top bar pills
5. Try deleting a category that has clues → error message: "Cannot delete: N clues use this category"
6. Delete an empty category → removed
7. Close modal → category pills in top bar reflect changes

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/CategoryModal.svelte src/routes/api/categories src/routes/+page.svelte
git commit -m "feat: add category management modal for admin"
```

---

### Task 10: Mobile Responsiveness + Cleanup + Deploy

**Files:**
- Modify: `src/lib/components/ClueDrawer.svelte` (mobile styles), `src/lib/components/CategoryBar.svelte` (mobile), `src/routes/+page.svelte` (mobile topbar), `src/app.css` (mobile base), `vercel.json`
- Delete: `index.html`, `country.html`, `style.css`, `fetch_clues.js`, `seed.js`, `features/`, `notes/`, `api/`, `data/`

**Interfaces:**
- Consumes: all previous tasks
- Produces: production-ready app with mobile responsiveness. Clean repo with old files removed.

- [ ] **Step 1: Add mobile drawer styles**

Add to the `<style>` block of `ClueDrawer.svelte`:

```css
@media (max-width: 640px) {
  .drawer {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: 100%;
    max-height: 70vh;
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: 16px 16px 0 0;
  }

  .drawer-header {
    padding: 16px;
  }

  .drawer-body {
    padding: 12px 16px;
  }
}
```

- [ ] **Step 2: Add mobile topbar styles**

Add to the `<style>` block of `+page.svelte`:

```css
@media (max-width: 640px) {
  .topbar {
    padding: 0 12px;
    gap: 8px;
  }

  .logo {
    font-size: 16px;
  }

  .manage-cats-btn {
    display: none;
  }
}
```

Add to `CategoryBar.svelte`:

```css
@media (max-width: 640px) {
  .pill {
    padding: 5px 10px;
    font-size: 12px;
  }
}
```

- [ ] **Step 3: Add base mobile styles**

Add to `src/app.css`:

```css
@media (max-width: 640px) {
  :root {
    --topbar-height: 48px;
    --drawer-width: 100%;
  }
}
```

- [ ] **Step 4: Update vercel.json**

```json
{
  "framework": "sveltekit"
}
```

SvelteKit's Vercel adapter handles routing — the old rewrite rules are no longer needed.

- [ ] **Step 5: Remove old project files**

```bash
rm -f index.html country.html style.css fetch_clues.js seed.js
rm -rf features/ notes/ api/ data/
```

- [ ] **Step 6: Verify everything works**

```bash
npm run dev
```

Full test pass:
1. **Map**: loads clean, countries colored, hover tooltips, theme toggle switches tiles
2. **Country mode**: click country → drawer slides in, clues grouped by category, collapsible sections
3. **Category mode**: click category pill → drawer shows that category across countries
4. **Cross-links**: click category label in country view → pivots to category. Click country name in category view → pivots to country.
5. **Admin login**: `/login` → enter password → admin mode activated
6. **Admin CRUD**: add clue, edit clue, delete clue — all inline in drawer
7. **Category management**: add/edit/delete categories via modal
8. **Dark mode**: all components properly themed, map tiles switch
9. **Mobile**: resize to 375px width — drawer slides from bottom, top bar compact, category pills scroll horizontally
10. **No old routes**: `country.html`, `/api/clues` (old endpoint) return 404

- [ ] **Step 7: Build and test production**

```bash
npm run build
npm run preview
```

Open `http://localhost:4173` — full test pass same as above. Check no build warnings.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "feat: add mobile responsiveness, remove legacy files, finalize for deploy"
```

- [ ] **Step 9: Deploy to Vercel**

Ensure `ADMIN_PASSWORD` is set in Vercel project environment variables (Settings → Environment Variables). Push to trigger deploy:

```bash
git push
```

Verify production URL works end-to-end.

---

## Verification Checklist

After all tasks complete, confirm:

- [ ] Map loads with CartoDB tiles, countries interactive
- [ ] Country click → drawer with clues grouped by category
- [ ] Category pill click → drawer with cross-country comparison
- [ ] Cross-links work in both directions
- [ ] Dark mode toggles all components including map tiles
- [ ] Theme persists across page refresh
- [ ] Login → admin mode → add/edit/delete clues inline
- [ ] Category management modal (admin only)
- [ ] Mobile: drawer from bottom, scrollable category pills
- [ ] Unauthenticated users see read-only view (no edit/delete/add controls)
- [ ] POST/PUT/DELETE return 401 without valid session cookie
- [ ] Old files removed, no dead routes
- [ ] Vercel deploy succeeds, production works end-to-end
