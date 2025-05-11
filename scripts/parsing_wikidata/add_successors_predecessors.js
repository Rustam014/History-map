const axios = require('axios');
const fs = require('fs');

const INPUT_FILE = 'states_data_enriched.json';
const OUTPUT_FILE = 'states_data_enriched_updated.json';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

async function fetchLineage(wikidata_id) {
  const params = {
    action: 'wbgetclaims',
    entity: wikidata_id,
    format: 'json'
  };

  try {
    const response = await axios.get(WIKIDATA_API, { params });
    const claims = response.data.claims;

    const p155 = [];
    const p156 = [];
    const p1365 = [];
    const p1366 = [];

    if (claims['P155']) {
      for (const claim of claims['P155']) {
        if (claim.mainsnak.datavalue?.value?.id) {
          p155.push(claim.mainsnak.datavalue.value.id);
        }
      }
    }

    if (claims['P156']) {
      for (const claim of claims['P156']) {
        if (claim.mainsnak.datavalue?.value?.id) {
          p156.push(claim.mainsnak.datavalue.value.id);
        }
      }
    }

    if (claims['P1365']) {
      for (const claim of claims['P1365']) {
        if (claim.mainsnak.datavalue?.value?.id) {
          p1365.push(claim.mainsnak.datavalue.value.id);
        }
      }
    }

    if (claims['P1366']) {
      for (const claim of claims['P1366']) {
        if (claim.mainsnak.datavalue?.value?.id) {
          p1366.push(claim.mainsnak.datavalue.value.id);
        }
      }
    }

    return { p155, p156, p1365, p1366 };
  } catch (error) {
    console.error(`Error fetching data for ${wikidata_id}:`, error.message);
    return { p155: [], p156: [], p1365: [], p1366: [] };
  }
}

async function enrichStates() {
  const rawJson = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const allStates = rawJson.states;

  for (const [key, state] of Object.entries(allStates)) {
    if (!state.wikidata_id) continue;

    // Remove old fields if they exist
    delete state.predecessor_id;
    delete state.successor_id;
    delete state.predecessor_ids;
    delete state.successor_ids;

    const { p155, p156, p1365, p1366 } = await fetchLineage(state.wikidata_id);

    state.P155 = p155;
    state.P156 = p156;
    state.P1365 = p1365;
    state.P1366 = p1366;

    console.log(`${state.name}: P155 [${p155.join(', ')}], P156 [${p156.join(', ')}], P1365 [${p1365.join(', ')}], P1366 [${p1366.join(', ')}]`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ states: allStates }, null, 2));
  console.log(`Updated data written to ${OUTPUT_FILE}`);
}

enrichStates();
