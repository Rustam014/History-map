const fs = require('fs');
const axios = require('axios');

const ALLOWED_WAR_TYPES = new Set([
  'Q198', 'Q188055', 'Q11641', 'Q22573', 'Q187560',
  'Q8465', 'Q104212151', 'Q180684', 'Q13418847',
  'Q49773', 'Q1553769', 'Q14633949', 'Q272940',
  'Q3625890', 'Q111179427', 'Q11281042', 'Q36411',
  'Q645883', 'Q178561', 'Q11201', 'Q2749488',
  'Q846407', 'Q3629901', 'Q1075743', 'Q1496967',
  'Q853482', 'Q22802198',
  'Q1006311', //war of national liberation
  'Q718893', //theater of war
  'Q864113' //proxy war
]);

const WAR_RELATED_PROPS = ['P1344', 'P710', 'P793', 'P6071', 'P7105'];

const INPUT_FILE = './data/states_with_lineage.json';
const OUTPUT_FILE = './data/wars_output.json';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchEntity(id) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`;
  const res = await axios.get(url);
  return res.data.entities[id];
}

function getClaimValues(entity, prop) {
  const claims = entity.claims?.[prop] || [];
  return claims
    .map(claim => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

function getDate(entity, prop) {
  const val = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
  return val ? val.replace('+', '') : null;
}

async function process() {
  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  const output = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
    : { wars: {}, processedWikidataIds: [] };

  const processedWars = new Set(Object.keys(output.wars));
  const processedWikidataIds = new Set(output.processedWikidataIds);

  const stateEntries = Object.entries(input.states);
  const idToKeys = {};

  for (const [key, state] of stateEntries) {
    const id = state.wikidata_id;
    if (!id) continue;
    if (!idToKeys[id]) idToKeys[id] = [];
    idToKeys[id].push(key);
  }

  for (const id of Object.keys(idToKeys)) {
    if (processedWikidataIds.has(id)) continue;

    const relatedKeys = idToKeys[id];
    relatedKeys.forEach(k => {
      if (!input.states[k].wars) input.states[k].wars = [];
    });

    console.log(`Processing ${id} (${relatedKeys.length} records)`);

    let entity;
    try {
      entity = await fetchEntity(id);
    } catch (err) {
      console.error(`Error loading ${id}: ${err.message}`);
      continue;
    }

    const potentialConflictIds = new Set();
    WAR_RELATED_PROPS.forEach(prop => {
      getClaimValues(entity, prop).forEach(cid => potentialConflictIds.add(cid));
    });

    for (const conflictId of potentialConflictIds) {
      if (processedWars.has(conflictId)) {
        relatedKeys.forEach(k => {
          const s = input.states[k];
          if (!s.wars.includes(conflictId)) s.wars.push(conflictId);
        });
        fs.writeFileSync(INPUT_FILE, JSON.stringify(input, null, 2));
        continue;
      }

      await sleep(100);

      let warEntity;
      try {
        warEntity = await fetchEntity(conflictId);
      } catch (err) {
        console.warn(`Error loading event ${conflictId}: ${err.message}`);
        continue;
      }

      const conflictTypes = getClaimValues(warEntity, 'P31');
      const isWar = conflictTypes.some(t => ALLOWED_WAR_TYPES.has(t));
      if (!isWar) continue;

      const label = warEntity.labels?.en?.value || '(no name)';
      const startDate = getDate(warEntity, 'P580');
      const endDate = getDate(warEntity, 'P582');
      const result = warEntity.claims?.P1346?.[0]?.mainsnak?.datavalue?.value?.id || null;
      const wikipediaLink = warEntity.sitelinks?.enwiki?.url || null;

      const participants = getClaimValues(warEntity, 'P710').map(pid => ({
        wikidata_id: pid
      }));

      output.wars[conflictId] = {
        name: label,
        start_date: startDate,
        end_date: endDate,
        participants,
        result,
        wikipedia_link: wikipediaLink
      };

      relatedKeys.forEach(k => {
        const s = input.states[k];
        if (!s.wars.includes(conflictId)) s.wars.push(conflictId);
      });

      processedWars.add(conflictId);

      console.log(`Found war: ${label}`);

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
      fs.writeFileSync(INPUT_FILE, JSON.stringify(input, null, 2));
    }

    output.processedWikidataIds.push(id);
    processedWikidataIds.add(id);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    fs.writeFileSync(INPUT_FILE, JSON.stringify(input, null, 2));
  }

  console.log(`Done. Data saved to ${OUTPUT_FILE}`);
}

process();
