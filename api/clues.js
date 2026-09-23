import { getDb } from './db.js';

export default async function handler(req, res) {
  const code = req.query.code?.toUpperCase();
  if (!code || code.length !== 2) {
    return res.status(400).json({ error: 'Missing or invalid country code' });
  }

  const sql = getDb();

  const country = await sql`
    SELECT name FROM countries WHERE code = ${code}
  `;

  if (country.length === 0) {
    return res.status(404).json({ error: 'Country not found' });
  }

  const clues = await sql`
    SELECT feature, clue, image_url FROM clues
    WHERE country_code = ${code}
    ORDER BY feature, id
  `;

  const grouped = {};
  for (const row of clues) {
    if (!grouped[row.feature]) grouped[row.feature] = [];
    grouped[row.feature].push({ clue: row.clue, image: row.image_url });
  }

  res.json({
    countryName: country[0].name,
    clues: grouped
  });
}
