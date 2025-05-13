const fs = require('fs');
const path = require('path');

const mapsDir = path.join(__dirname, '../maps');
const chainsFile = path.join(__dirname, '../data/chains.json');

// Load existing chains.json or start with empty object
let chains = {};
if (fs.existsSync(chainsFile)) {
    chains = JSON.parse(fs.readFileSync(chainsFile, 'utf8'));
}

// Helper to check if a chain already exists in array
function isDuplicate(arr, obj) {
    return arr.some(item =>
        item.start_date === obj.start_date &&
        item.end_date === obj.end_date &&
        item.boundaries_file === obj.boundaries_file
    );
}

// Temporary storage for all states
const allStates = {};

// Process all map files
fs.readdirSync(mapsDir).forEach(file => {
    if (!file.endsWith('.json')) return;
    const filePath = path.join(mapsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.features) return;

    data.features.forEach(feature => {
        if (!feature.properties || !feature.properties.cntry_name) return;
        const name = feature.properties.cntry_name;
        const start_date = feature.properties.gwsyear;
        const end_date = feature.properties.gweyear;

        const chainData = {
            start_date,
            end_date,
            boundaries_file: file
        };

        if (!allStates[name]) allStates[name] = [];
        if (!isDuplicate(allStates[name], chainData)) {
            allStates[name].push(chainData);
        }
    });
});

// Only add chains for countries with more than one entry
Object.entries(allStates).forEach(([name, arr]) => {
    if (arr.length > 1) {
        if (!chains[name]) chains[name] = [];
        arr.forEach(chainData => {
            if (!isDuplicate(chains[name], chainData)) {
                chains[name].push(chainData);
            }
        });
    }
});

// Save updated chains.json
fs.writeFileSync(chainsFile, JSON.stringify(chains, null, 2), 'utf8');
console.log('chains.json updated!');
