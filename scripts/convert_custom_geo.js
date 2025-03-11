/**
 * Converts custom geographic data to a standardized format for 2019-2024 period.
 * 
 * Input: new_custom_geo.json - custom geographic data file
 * Output: maps/2019_2024.json - transformed data with standardized properties
 * 
 * Data structure:
 * - cntry_name: country name
 * - area: territory area
 * - capname, caplong, caplat: capital name and coordinates
 * - gwcode: country code
 * - gwsdate, gwsyear, gwsmonth, gwsday: period start date
 * - gwedate, gweyear, gwemonth, gweday: period end date
 * - cap_geom: capital geometry
 * - wikidataid: Wikidata identifier
 */

const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, '../../new_custom_geo.json');
const outputDir = path.join(__dirname, '../maps');
const outputFileName = '2019_2024.json';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

async function convertCustomGeo() {
    try {
        const rawData = fs.readFileSync(inputFilePath, 'utf8');
        const customData = JSON.parse(rawData);

        const outputData = {
            type: "FeatureCollection",
            features: customData.features.map(feature => ({
                type: "Feature",
                properties: {
                    cntry_name: feature.properties.name,
                    area: feature.properties.area || 0,
                    capname: feature.properties.capital || "",
                    caplong: feature.properties.cap_lon || 0,
                    caplat: feature.properties.cap_lat || 0,
                    gwcode: feature.properties.gwcode || 0,
                    gwsdate: `01.01.${feature.properties.pop_year} 00:00:00`,
                    gwsyear: feature.properties.pop_year,
                    gwsmonth: 1,
                    gwsday: 1,
                    gwedate: `31.12.${feature.properties.year_end} 23:59:59`,
                    gweyear: feature.properties.year_end,
                    gwemonth: 12,
                    gweday: 31,
                    cap_geom: feature.properties.cap_geom || "",
                    wikidataid: feature.properties.wikidataid || ""
                },
                geometry: feature.geometry
            }))
        };

        const outputPath = path.join(outputDir, outputFileName);
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`File saved: ${outputPath}`);

    } catch (error) {
        console.error('Error converting file:', error);
    }
}

convertCustomGeo().catch(console.error); 