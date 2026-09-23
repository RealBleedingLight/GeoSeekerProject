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
