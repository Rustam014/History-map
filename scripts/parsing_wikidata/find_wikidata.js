const fs = require('fs');
const axios = require('axios');

const INPUT_FILE = 'states_data.json';
const OUTPUT_FILE = 'states_data_candidates.json';
const START_FROM = 'Aboriginal Tasmanians_1';
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

const EXCLUDED_P31 = new Set([
  'Q5',         // human
  'Q41710',     // ethnic group
  'Q25295',     // language family
  'Q839954',    // archaeological culture
  'Q28171280',  // civilization (conditionally excluded)
  'Q9174',      // religion
  'Q43824'      // mythology
]);

// Simple in-memory cache
const entityCache = {};
const MAX_CANDIDATES = 10;

function extractYear(value) {
  if (!value) return null;
  return parseInt(value, 10);
}

function computeDateScore(start, end, wikiStart, wikiEnd) {
  start = start ?? -100000; end = end ?? 100000;
  wikiStart = wikiStart ?? -100000; wikiEnd = wikiEnd ?? 100000;

  const overlapStart = Math.max(start, wikiStart);
  const overlapEnd = Math.min(end, wikiEnd);
  const overlapDuration = Math.max(0, overlapEnd - overlapStart);

  const duration = end - start;
  if (overlapDuration <= 0) return 0;
  if (overlapStart <= start && overlapEnd >= end) return 3;
  if (overlapDuration / duration >= 0.25) return 2;
  return 1;
}

async function fetchEntityDetails(id) {
  if (entityCache[id]) return entityCache[id];

  const params = {
    action: 'wbgetentities',
    ids: id,
    format: 'json',
    props: 'claims|sitelinks|descriptions'
  };

  try {
    const response = await axios.get(WIKIDATA_API, { params });
    const entity = response.data.entities[id];
    entityCache[id] = entity;
    return entity;
  } catch (err) {
    console.error(`Failed to fetch entity ${id}:`, err.message);
    return null;
  }
}

function getYearFromClaim(claim) {
  const raw = claim?.[0]?.mainsnak?.datavalue?.value?.time;
  return raw ? parseInt(raw.substring(1, 5)) : null;
}

function getP31Types(claims) {
  return new Set(
    (claims.P31 || []).map(c => c.mainsnak?.datavalue?.value?.id).filter(Boolean)
  );
}

function isAcceptableP31(p31Set, inputStart) {
  const isEthnicGroup = p31Set.has('Q41710');

  if (isEthnicGroup && inputStart < -500) return true;

  for (const p31 of p31Set) {
    if (ALLOWED_P31.has(p31)) return true;
  }

  return false;
}

async function fetchCandidates(stateName, inputStart, inputEnd) {
  const searchParams = {
    action: 'wbsearchentities',
    search: stateName,
    language: 'en',
    format: 'json',
    limit: MAX_CANDIDATES,
    type: 'item'
  };

  const response = await axios.get(WIKIDATA_API, { params: searchParams });
  const results = response.data.search || [];
  const candidates = [];

  for (const result of results) {
    const id = result.id;
    const entity = await fetchEntityDetails(id);
    if (!entity) continue;

    const claims = entity.claims || {};
    const wikiStart = getYearFromClaim(claims.P571);
    const wikiEnd = getYearFromClaim(claims.P576);
    const dateScore = computeDateScore(inputStart, inputEnd, wikiStart, wikiEnd);

    const p31Set = getP31Types(claims);
    const isValid = isAcceptableP31(p31Set);

    const sitelink = entity.sitelinks?.enwiki?.title;
    const wikipedia = sitelink
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sitelink)}`
      : null;

    candidates.push({
      name: result.label,
      wikidata_id: id,
      wikipedia,
      inception: wikiStart,
      dissolution: wikiEnd,
      p31_types: Array.from(p31Set),
      score: dateScore + (isValid ? 2 : 0)
    });
  }

  return candidates.sort((a, b) => b.score - a.score)[0];
}

function readOrInitOutput() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  } catch {
    return { states: {} };
  }
}

async function main() {
  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const allStates = rawData.states;
  const keys = Object.keys(allStates);

  const output = readOrInitOutput();
  const doneKeys = new Set(Object.keys(output.states));
  const startIndex = keys.indexOf(START_FROM);

  if (startIndex === -1) {
    console.error(`START_FROM "${START_FROM}" not found.`);
    return;
  }

  const keysToProcess = keys.slice(startIndex);

  for (const key of keysToProcess) {
    if (doneKeys.has(key)) {
      console.log(`Skipping already processed: ${key}`);
      continue;
    }

    const state = allStates[key];
    const startYear = extractYear(state.start_date);
    const endYear = extractYear(state.end_date);

    console.log(`Searching for: ${state.name}`);
    const bestCandidate = await fetchCandidates(state.name, startYear, endYear);

    if (bestCandidate) {
      output.states[key] = {
        name: state.name,
        start_date: state.start_date,
        end_date: state.end_date,
        wikidata_id: bestCandidate.wikidata_id,
        wikipedia: bestCandidate.wikipedia
      };
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  }

  console.log(`All candidates processed. Saved to ${OUTPUT_FILE}`);
}

main();
