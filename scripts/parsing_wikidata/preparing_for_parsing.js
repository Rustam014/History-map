const fs = require('fs');
const path = require('path');

// Paths
const mapsDir = path.join(__dirname, '..', 'maps');
const outputFile = path.join(__dirname, '..', 'states_data.json');

function createStateEntry(properties, file) {
    return {
        name: properties.cntry_name,
        start_date: properties.gwsyear,
        end_date: properties.gweyear,
        boundaries_file: file
    };
}

try {
    const files = fs.readdirSync(mapsDir);
    
    const states = {};
    
    const stateChains = {};
    
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(mapsDir, file);
            const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            fileContent.features.forEach(feature => {
                const properties = feature.properties;
                const stateName = properties.cntry_name;
                
                if (!stateChains[stateName]) {
                    stateChains[stateName] = [];
                }
                
                stateChains[stateName].push(createStateEntry(properties, file));
            });
        }
    });
    
    Object.keys(stateChains).forEach(stateName => {
        const entries = stateChains[stateName];
        
        entries.sort((a, b) => a.start_date - b.start_date);
        
        entries.forEach((entry, index) => {
            const chainName = entries.length > 1 ? `${stateName}_${index + 1}` : stateName;
            states[chainName] = {
                ...entry,
                chain_index: index + 1,
                total_in_chain: entries.length,
                previous_state: index > 0 ? `${stateName}_${index}` : null,
                next_state: index < entries.length - 1 ? `${stateName}_${index + 2}` : null
            };
        });
    });
    
    const outputData = { states };
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log('Successfully created states_data.json');

} catch (error) {
    console.error('Error processing files:', error);
} 