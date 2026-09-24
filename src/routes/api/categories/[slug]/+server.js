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
