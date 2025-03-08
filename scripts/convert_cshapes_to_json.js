const fs = require('fs');
const path = require('path');

// Path to the CShapes JSON file
const inputFilePath = path.join(__dirname, '../../CShapes-3.0.json');
// Folder for saving converted country JSON files
const outputDir = path.join(__dirname, '../maps');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function for reading and converting CShapes JSON file
async function convertCShapesToJson() {
    const rawData = fs.readFileSync(inputFilePath, 'utf8');
    const cshapesData = JSON.parse(rawData);

    const countryDataMap = new Map();

    cshapesData.features.forEach((feature, index) => {
        let countryName = feature.properties.cntry_name;
        if (!countryName) {
            console.error(`Missing country name in feature index: ${index}`);
            countryName = `JohnDoe_${index}`; // Name file as JohnDoe with index if country name is missing
        }
        const newFileName = `${countryName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const newFilePath = path.join(outputDir, newFileName);

        const existingData = countryDataMap.get(newFileName) || { type: "FeatureCollection", features: [] };
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

    countryDataMap.forEach((data, fileName) => {
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`File saved: ${filePath}`);
    });
}

convertCShapesToJson().catch(console.error); 