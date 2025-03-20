const fs = require('fs');
const path = require('path');
const https = require('https');

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'WikidataMapBot/1.0',
        'Accept': 'application/json',
        ...headers
      }
    };
    
    https.get(url, options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('Failed to parse response:', data.slice(0, 200));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class SPARQLQueryDispatcher {
    constructor(endpoint) {
      this.endpoint = endpoint;
    }

    query(sparqlQuery, simplify = true) {
      const fullUrl = this.endpoint + "?query=" + encodeURIComponent(sparqlQuery);
      return httpGet(fullUrl, {
        'Accept': 'application/sparql-results+json'
      })
      .then(data => (simplify ? this.simplify(data) : data));
    }

    simplify(data) {
      const bindings = data.results.bindings;
      return bindings.map(binding => {
        Object.keys(binding).forEach(function(key, index) {
          binding[key] = binding[key].value;
        });
        return binding;
      });
    }
}

function buildQuery(ids) {
    const wds = ids.map(id => `wd:${id}`).join(" ");
    return `
    SELECT ?item ?itemLabel ?geoshape ?geoshapeLabel ?coordinates ?population ?area ?inception ?dissolved ?iso_code
           ?capital ?capitalLabel ?capital_coordinates
    WHERE {
        VALUES ?item { ${wds} }
        ?item wdt:P31 wd:Q3624078.  # instance of: sovereign state
        ?item wdt:P3896 ?geoshape.
        OPTIONAL { ?item wdt:P625 ?coordinates. }
        OPTIONAL { ?item wdt:P1082 ?population. }
        OPTIONAL { ?item wdt:P2046 ?area. }
        OPTIONAL { ?item wdt:P571 ?inception. }
        OPTIONAL { ?item wdt:P5676 ?dissolved. }
        OPTIONAL { ?item wdt:P298 ?iso_code. }  # ISO 3166-1 alpha-3 code
        OPTIONAL { 
            ?item wdt:P36 ?capital.  # capital city
            OPTIONAL { ?capital wdt:P625 ?capital_coordinates. }
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    `;
}

function fetchGeojson(rows) {
    if (!rows || rows.length === 0) {
        throw new Error('No data received from Wikidata query');
    }

    const titles = rows
        .filter(r => r.geoshape)
        .map(r => r.geoshape.split("/data/main/").pop())
        .join("|");

    if (!titles) {
        throw new Error('No valid geoshape data found');
    }

    const url = `https://commons.wikimedia.org/w/api.php?action=query&prop=revisions&rvslots=*&rvprop=content&format=json&titles=${titles}`;
    console.log('Fetching geoshape data from:', url);
    
    return httpGet(url)
        .then(r => {
            if (!r.query || !r.query.pages) {
                console.error('Unexpected API response:', JSON.stringify(r, null, 2));
                throw new Error('Invalid API response structure');
            }
            return Object.values(r.query.pages);
        })
        .then(pages => {
            return pages.map(page => {
                if (!page.revisions || !page.revisions[0] || !page.revisions[0].slots || !page.revisions[0].slots.main["*"]) {
                    console.error('Invalid page data:', JSON.stringify(page, null, 2));
                    throw new Error('Invalid page data structure');
                }
                return JSON.parse(page.revisions[0].slots.main["*"]).data;
            });
        });
}

function parseCoordinates(coordString) {
    if (!coordString) return null;
    const match = coordString.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (!match) return null;
    return {
        longitude: parseFloat(match[1]),
        latitude: parseFloat(match[2])
    };
}

function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('en-GB').replace(/\//g, '.'),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
    };
}

function transformToFeatureCollection(geoData, wikidata) {
    return {
        type: "FeatureCollection",
        features: geoData.map((geo, index) => {
            const geometry = geo.type === 'FeatureCollection' 
                ? geo.features[0].geometry
                : geo;

            const capitalCoords = parseCoordinates(wikidata[index].capital_coordinates);
            const inceptionDate = formatDate(wikidata[index].inception);
            const dissolvedDate = formatDate(wikidata[index].dissolved);

            return {
                type: "Feature",
                properties: {
                    cntry_name: wikidata[index].itemLabel,
                    area: parseFloat(wikidata[index].area) || null,
                    capname: wikidata[index].capitalLabel || null,
                    caplong: capitalCoords ? capitalCoords.longitude : null,
                    caplat: capitalCoords ? capitalCoords.latitude : null,
                    gwcode: null, // Можно добавить позже, если нужно
                    gwsdate: inceptionDate ? inceptionDate.date : null,
                    gwsyear: inceptionDate ? inceptionDate.year : null,
                    gwsmonth: inceptionDate ? inceptionDate.month : null,
                    gwsday: inceptionDate ? inceptionDate.day : null,
                    gwedate: dissolvedDate ? dissolvedDate.date : null,
                    gweyear: dissolvedDate ? dissolvedDate.year : null,
                    gwemonth: dissolvedDate ? dissolvedDate.month : null,
                    gweday: dissolvedDate ? dissolvedDate.day : null,
                    cap_geom: capitalCoords ? `SRID=4326;POINT (${capitalCoords.longitude} ${capitalCoords.latitude})` : null,
                    wikidata_id: wikidata[index].item.split('/').pop(),
                    iso_code: wikidata[index].iso_code || null,
                    population: parseInt(wikidata[index].population) || null
                },
                geometry: geometry
            };
        })
    };
}

function saveToFile(data, filename) {
    const dir = path.join(process.cwd(), 'wikidata_maps');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filepath}`);
}

const queryDispatcher = new SPARQLQueryDispatcher("https://query.wikidata.org/sparql");
const query = buildQuery(["Q142"]); // Q142 = France

console.log('Executing SPARQL query...');
let wikidataResults;

queryDispatcher
    .query(query)
    .then(results => {
        console.log('Received Wikidata results:', JSON.stringify(results, null, 2));
        wikidataResults = results;
        return fetchGeojson(results);
    })
    .then(geoData => {
        console.log('Received GeoJSON data');
        return transformToFeatureCollection(geoData, wikidataResults);
    })
    .then(featureCollection => {
        console.log('Saving feature collection...');
        saveToFile(featureCollection, 'france.json');
    })
    .catch(error => {
        console.error('Error:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    });