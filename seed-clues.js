import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL);
const data = JSON.parse(readFileSync('./data/seed-clues.json', 'utf-8'));

async function seed() {
  const allCategories = new Set();
  for (const entry of Object.values(data)) {
    for (const clue of entry.clues) {
      allCategories.add(clue.category);
    }
  }

  console.log(`Seeding ${allCategories.size} categories...`);
  const categoryLabels = {
    'bollards': 'Bollards',
    'license-plates': 'License Plates',
    'utility-poles': 'Utility Poles',
    'road-markings': 'Road Markings',
    'road-signs': 'Road Signs',
    'driving-side': 'Driving Side',
    'camera-coverage': 'Camera & Coverage',
    'language': 'Language',
    'landscape': 'Landscape'
  };

  const categoryIcons = {
    'bollards': '🔶',
    'license-plates': '🪪',
    'utility-poles': '🔌',
    'road-markings': '🛣️',
    'road-signs': '🪧',
    'driving-side': '🚗',
    'camera-coverage': '📷',
    'language': '🔤',
    'landscape': '🌍'
  };

  let sortOrder = 0;
  for (const slug of Object.keys(categoryLabels)) {
    await sql`
      INSERT INTO categories (slug, label, icon, sort_order)
      VALUES (${slug}, ${categoryLabels[slug]}, ${categoryIcons[slug] || ''}, ${sortOrder++})
      ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order
    `;
  }

  let countryCount = 0;
  let clueCount = 0;

  for (const [code, entry] of Object.entries(data)) {
    await sql`
      INSERT INTO countries (code, name)
      VALUES (${code}, ${entry.name})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    `;
    countryCount++;

    for (const clue of entry.clues) {
      await sql`
        INSERT INTO clues (country_code, category, clue, image_url)
        VALUES (${code}, ${clue.category}, ${clue.clue}, '')
      `;
      clueCount++;
    }

    process.stdout.write(`\r  ${countryCount}/${Object.keys(data).length} countries, ${clueCount} clues`);
  }

  console.log(`\nDone! ${countryCount} countries, ${clueCount} clues seeded.`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
