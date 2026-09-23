require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

async function seed() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Creating tables...');
  await sql`
    CREATE TABLE IF NOT EXISTS countries (
      code CHAR(2) PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS clues (
      id SERIAL PRIMARY KEY,
      country_code CHAR(2) NOT NULL REFERENCES countries(code),
      feature VARCHAR(50) NOT NULL,
      clue TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_clues_country ON clues(country_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_clues_feature ON clues(feature)`;

  console.log('Seeding from clues.json...');
  const data = JSON.parse(fs.readFileSync('./data/clues.json', 'utf-8'));

  for (const [code, entry] of Object.entries(data)) {
    await sql`
      INSERT INTO countries (code, name)
      VALUES (${code}, ${entry.countryName})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    `;

    for (const clue of entry.clues) {
      await sql`
        INSERT INTO clues (country_code, feature, clue, image_url)
        VALUES (${code}, ${clue.feature}, ${clue.clue}, ${clue.image || ''})
      `;
    }
  }

  console.log('Seeding bollard clues...');
  const bollards = [
    { code: 'FI', name: 'Finland', feature: 'Bollards', clue: 'Square wooden posts with black face, bevel top.' },
    { code: 'SE', name: 'Sweden', feature: 'Bollards', clue: 'Similar to Finland, but with two reflectors.' },
    { code: 'AU', name: 'Australia', feature: 'Bollards', clue: 'White plastic with red reflector front, gray back.' },
  ];

  for (const b of bollards) {
    await sql`
      INSERT INTO countries (code, name)
      VALUES (${b.code}, ${b.name})
      ON CONFLICT (code) DO NOTHING
    `;
    await sql`
      INSERT INTO clues (country_code, feature, clue, image_url)
      VALUES (${b.code}, ${b.feature}, ${b.clue}, '')
    `;
  }

  console.log('Done! Seed complete.');
}

seed().catch(err => console.error('Seed failed:', err));
