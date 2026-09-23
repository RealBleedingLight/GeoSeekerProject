require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const { Client } = require('@notionhq/client');

const sql = neon(process.env.DATABASE_URL);
const notion = new Client({ auth: process.env.NOTION_KEY });

async function fetchData() {
  console.log('Fetching from Notion...');
  const results = [];
  let next_cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: next_cursor,
    });

    for (const page of response.results) {
      const props = page.properties;

      const countryCode = props["Country Code"]?.title?.[0]?.plain_text?.trim() || '';
      const countryName = props["Country Name"]?.select?.name?.trim() || '';
      const feature = props["Feature"]?.select?.name?.trim() || '';
      const clue = props["Clue"]?.rich_text?.[0]?.plain_text?.trim() || '';
      const image = props["Image URL"]?.url || props["Image URL"]?.rich_text?.[0]?.plain_text || '';

      if (!countryCode) {
        console.warn('Skipping entry with missing Country Code.');
        continue;
      }

      results.push({ countryName, countryCode, feature, clue, image });
    }

    next_cursor = response.has_more ? response.next_cursor : null;
  } while (next_cursor);

  console.log(`Fetched ${results.length} clues. Syncing to Neon...`);

  for (const item of results) {
    await sql`
      INSERT INTO countries (code, name)
      VALUES (${item.countryCode}, ${item.countryName})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    `;

    await sql`
      INSERT INTO clues (country_code, feature, clue, image_url)
      VALUES (${item.countryCode}, ${item.feature}, ${item.clue}, ${item.image || ''})
    `;
  }

  console.log('Sync complete!');
}

fetchData().catch(err => console.error('Error:', err));
