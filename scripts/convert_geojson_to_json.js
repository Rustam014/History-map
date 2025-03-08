const fs = require('fs');
const path = require('path');

// Folder with original geojson files
const inputDir = path.join(__dirname, '../../original_geojson');
// Folder for saving converted json files
const outputDir = path.join(__dirname, '../converted_json');

// Function for reading and converting geojson files
async function convertGeoJsonFiles() {
    // Sort files chronologically, considering BC years as negative
    const files = fs.readdirSync(inputDir)
        .filter(file => file.endsWith('.geojson'))
        .sort((a, b) => {
            const yearMatchA = a.match(/\d+/);
            const yearMatchB = b.match(/\d+/);
            const yearA = yearMatchA ? parseInt(yearMatchA[0]) * (a.includes('bc') ? -1 : 1) : 0;
            const yearB = yearMatchB ? parseInt(yearMatchB[0]) * (b.includes('bc') ? -1 : 1) : 0;
            return yearA - yearB;
        });

    console.log('Files to be processed:', files);

    const countryDataMap = new Map();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const yearMatch = file.match(/\d+/);
        if (!yearMatch) {
            console.error(`Failed to extract year from file name: ${file}`);
            continue; // Skip file if year is not found
        }
        let year = parseInt(yearMatch[0]); // Extract year from file name
        if (file.includes('bc')) {
            year = -year; // Make year negative if BC
        }
        let endYear = i < files.length - 1 ? parseInt(files[i + 1].match(/\d+/)[0]) : null;
        if (endYear && files[i + 1].includes('bc')) {
            endYear = -endYear; // Make end year negative if BC
        }
        const filePath = path.join(inputDir, file);
        const geojsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`Processing file: ${file}, Year: ${year}, End Year: ${endYear}`);

        geojsonData.features.forEach((feature, index) => {
            let countryName = feature.properties.NAME;
            if (!countryName) {
                console.error(`Missing country name in file: ${file}`);
                countryName = `JohnDoe_${index}`; // Name file as JohnDoe with index if country name is missing
            }
            const newFileName = `${file.replace('.geojson', '')}_${countryName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
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
                    gwsdate: `${year}-01-01T00:00:00`,
                    gwsyear: year,
                    gwsmonth: 1,
                    gwsday: 1,
                    gwedate: endYear ? `${endYear}-01-01T00:00:00` : feature.properties.gwedate,
                    gweyear: endYear || feature.properties.gweyear,
                    gwemonth: endYear ? 1 : feature.properties.gwemonth,
                    gweday: endYear ? 1 : feature.properties.gweday,
                    cap_geom: feature.properties.cap_geom
                },
                geometry: feature.geometry
            });

            countryDataMap.set(newFileName, existingData);
        });
    }

    countryDataMap.forEach((data, fileName) => {
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`File saved: ${filePath}`);
    });
}

convertGeoJsonFiles().catch(console.error); 