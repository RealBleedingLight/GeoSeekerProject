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
