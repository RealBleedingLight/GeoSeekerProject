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
