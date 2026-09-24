import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function GET() {
  const rows = await sql`SELECT slug, label, icon, sort_order FROM categories ORDER BY sort_order, label`;
  return json(rows);
}

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
