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

export async function POST({ request, locals }) {
  if (!locals.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { country_code, country_name, category, clue, image_url } = await request.json();

  if (!country_code || !category || !clue) {
    return json({ error: 'country_code, category, and clue are required' }, { status: 400 });
  }

  const code = country_code.toUpperCase();
  const existing = await sql`SELECT code FROM countries WHERE code = ${code}`;
  if (existing.length === 0) {
    await sql`INSERT INTO countries (code, name) VALUES (${code}, ${country_name || code})`;
  }

  const [row] = await sql`
    INSERT INTO clues (country_code, category, clue, image_url)
    VALUES (${code}, ${category.toLowerCase()}, ${clue}, ${image_url || ''})
    RETURNING id, country_code, category, clue, image_url, sort_order, created_at
  `;

  return json(row, { status: 201 });
}
