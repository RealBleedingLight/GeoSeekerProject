import { getDb } from './db.js';

export default async function handler(req, res) {
  const sql = getDb();

  const rows = await sql`
    SELECT c.code, c.name, COUNT(cl.id)::int AS clue_count
    FROM countries c
    LEFT JOIN clues cl ON cl.country_code = c.code
    GROUP BY c.code, c.name
    ORDER BY c.name
  `;

  res.json(rows);
}
