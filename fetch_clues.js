require('dotenv').config();
const fs = require('fs');
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_KEY });

async function fetchData() {
  const results = [];
  let next_cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: process.env.DATABASE_ID,
      start_cursor: next_cursor,
    });

    for (const page of response.results) {
      const props = page.properties;

      // DEBUG log to verify fields
      console.log("🔍 Country Code:", JSON.stringify(props["Country Code"], null, 2));
      console.log("🔍 Country Name 2:", JSON.stringify(props["Country Name 2"], null, 2));

      const countryCode = props["Country Code"]?.title?.[0]?.plain_text?.trim() || '';
      const countryName = props["Country Name"]?.select?.name?.trim() || '';
      const feature = props["Feature"]?.select?.name?.trim() || '';
      const clue = props["Clue"]?.rich_text?.[0]?.plain_text?.trim() || props["Clue"]?.plain_text?.trim() || '';
      const image = props["Image URL"]?.url || props["Image URL"]?.rich_text?.[0]?.plain_text || '';

      if (!countryCode) {
        console.warn("⚠️ Skipping entry with missing Country Code.");
        continue;
      }

      results.push({
        countryName,
        countryCode,
        feature,
        clue,
        image
      });
    }

    next_cursor = response.has_more ? response.next_cursor : null;
  } while (next_cursor);

  // Group by country code
  const grouped = {};
  results.forEach(item => {
    if (!grouped[item.countryCode]) {
      grouped[item.countryCode] = {
        countryName: item.countryName,
        clues: []
      };
    }

    grouped[item.countryCode].clues.push({
      feature: item.feature,
      clue: item.clue,
      image: item.image
    });
  });

  // Write the JSON file
  fs.mkdirSync('./data', { recursive: true });
  fs.writeFileSync('./data/clues.json', JSON.stringify(grouped, null, 2));
  console.log("✅ clues.json generated from Notion!");
}

fetchData().catch(err => console.error("❌ Error:", err));
