  const axios = require('axios');
  const fs = require('fs');
  const INPUT_FILE = './data/states_with_chains.json';
  const OUTPUT_FILE = './data/states_with_lineage.json';
  const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

  const ALLOWED_P31 = new Set([
    'Q7275',      // state
    'Q3024240',   // former state
    'Q3624078',   // sovereign state
    'Q146233',    // empire
    'Q819558',    // kingdom
    'Q28171280',  // ancient state
    'Q1048835',   // political territorial entity
    'Q1668024',   // confederation of states
    'Q178885'     // tribe
  ]);

  const BATCH_SIZE = 10;
  const START_FROM_KEY = null;

  async function fetchClaims(wikidata_id) {
    const params = {
      action: 'wbgetclaims',
      entity: wikidata_id,
      format: 'json'
    };

    try {
      const response = await axios.get(WIKIDATA_API, { params });
      const claims = response.data.claims || {};
      const extractIDs = prop => (claims[prop] || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
      return {
        P155: extractIDs('P155'),
        P156: extractIDs('P156'),
        P1365: extractIDs('P1365'),
        P1366: extractIDs('P1366')
      };
    } catch (err) {
      console.error(`Error fetching claims for ${wikidata_id}:`, err.message);
      return { P155: [], P156: [], P1365: [], P1366: [] };
    }
  }

  async function isAllowedEntity(qid, refYear) {
    const params = {
      action: 'wbgetentities',
      ids: qid,
      format: 'json',
      props: 'claims'
    };

    try {
      const res = await axios.get(WIKIDATA_API, { params });
      const claims = res.data.entities[qid]?.claims?.P31 || [];
      for (const claim of claims) {
        const id = claim.mainsnak?.datavalue?.value?.id;
        if (!id) continue;
        if (ALLOWED_P31.has(id)) return true;
        if (id === 'Q41710' && refYear <= 500) return true;
      }
      return false;
    } catch (e) {
      console.error(`P31 check failed for ${qid}: ${e.message}`);
      return false;
    }
  }

  function findMatchingLocalKeys(allStates, qid) {
    return Object.entries(allStates)
      .filter(([key, state]) => state.wikidata_id === qid)
      .map(([key]) => key);
  }

  async function enrichStates() {
    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    const allStates = rawData.states;
    const outputData = fs.existsSync(OUTPUT_FILE)
      ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).states
      : {};

    let skip = START_FROM_KEY !== null;
    let processed = 0;

    for (const [key, state] of Object.entries(allStates)) {
      if (skip) {
        if (key === START_FROM_KEY) {
          skip = false;
        } else {
          continue;
        }
      }

      if (!state.wikidata_id) continue;

      const lineage = await fetchClaims(state.wikidata_id);
      const relatedQIDs = new Set([
        ...lineage.P155,
        ...lineage.P156,
        ...lineage.P1365,
        ...lineage.P1366
      ]);

      const refYear = state.start_date || 0;
      const predecessors = [];
      const successors = [];

      const isChainStart = state.chain_index === 1;
      const isChainEnd = state.chain_index === state.total_in_chain;
      const isOutsideChain = state.chain_index === undefined || state.total_in_chain === undefined;

      const shouldAddPredecessor = (qid) =>
        (isOutsideChain || isChainStart) &&
        (lineage.P155.includes(qid) || lineage.P1365.includes(qid));

      const shouldAddSuccessor = (qid) =>
        (isOutsideChain || isChainEnd) &&
        (lineage.P156.includes(qid) || lineage.P1366.includes(qid));

      for (const qid of relatedQIDs) {
        const isRelevant = await isAllowedEntity(qid, refYear);
        if (!isRelevant) continue;
        const matchingKeys = findMatchingLocalKeys(allStates, qid);

        if (shouldAddPredecessor(qid)) {
          predecessors.push(...matchingKeys);
        }
        if (shouldAddSuccessor(qid)) {
          successors.push(...matchingKeys);
        }
      }

      state.predecessor_keys = [...new Set(predecessors)];
      state.successor_keys = [...new Set(successors)];
      state.P155 = lineage.P155;
      state.P156 = lineage.P156;
      state.P1365 = lineage.P1365;
      state.P1366 = lineage.P1366;

      outputData[key] = state;

      processed++;
      console.log(`${key} → pred: [${state.predecessor_keys.join(', ')}], succ: [${state.successor_keys.join(', ')}]`);

      if (processed % BATCH_SIZE === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ states: outputData }, null, 2));
        console.log(`Auto-saved at ${processed} entries`);
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ states: outputData }, null, 2));
    console.log(`Done. Final result written to ${OUTPUT_FILE}`);
  }

  enrichStates();
