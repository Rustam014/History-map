/**
 * Splits CShapes dataset into separate JSON files per country.
 * 
 * Input: CShapes-3.0.json - historical country boundaries dataset
 * Output: maps/{country_name}.json - individual country files
 * 
 * Data structure:
 * - cntry_name: country name
 * - area: territory area
 * - capname, caplong, caplat: capital name and coordinates
 * - gwcode: country code
 * - gwsdate, gwsyear, gwsmonth, gwsday: period start date
 * - gwedate, gweyear, gwemonth, gweday: period end date
 * - cap_geom: capital geometry
 * 
 * Note: Output filenames are generated from country names with special characters replaced by '_'
 */

const fs = require('fs');
const path = require('path');

const inputFilePath = path.join(__dirname, '../../CShapes-3.0.json');
const outputDir = path.join(__dirname, '../maps');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

async function convertCShapesToJson() {
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const cshapesData = JSON.parse(rawData);

    // Map for storing country data
    // Key - filename, Value - array of country geodata
    const countryDataMap = new Map();

    // Processing each object from input file
    cshapesData.features.forEach((feature, index) => {
        let countryName = feature.properties.cntry_name;
        if (!countryName) {
            console.error(`Missing country name in feature index: ${index}`);
            countryName = `JohnDoe_${index}`;  // Using placeholder name if country name is missing
        }
        
        // Generating filename from country name
        // Replacing all special characters with '_'
        const newFileName = `${countryName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const newFilePath = path.join(outputDir, newFileName);

        // Getting or creating data structure for country
        const existingData = countryDataMap.get(newFileName) || { type: "FeatureCollection", features: [] };
        
        // Adding new object while preserving all properties
        existingData.features.push({
            type: "Feature",
            properties: {
                cntry_name: countryName,
                area: feature.properties.area,
                capname: feature.properties.capname,
                caplong: feature.properties.caplong,
                caplat: feature.properties.caplat,
                gwcode: feature.properties.gwcode,
                gwsdate: feature.properties.gwsdate,
                gwsyear: feature.properties.gwsyear,
                gwsmonth: feature.properties.gwsmonth,
                gwsday: feature.properties.gwsday,
                gwedate: feature.properties.gwedate,
                gweyear: feature.properties.gweyear,
                gwemonth: feature.properties.gwemonth,
                gweday: feature.properties.gweday,
                cap_geom: feature.properties.cap_geom
            },
            geometry: feature.geometry
        });

        countryDataMap.set(newFileName, existingData);
    });

    // Saving individual files for each country
    countryDataMap.forEach((data, fileName) => {
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`File saved: ${filePath}`);
    });
}

convertCShapesToJson().catch(console.error); 