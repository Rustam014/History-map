const fs = require('fs');
const path = require('path');

// Define directories
const sourceDir = path.join(__dirname, '../converted_json');
const targetDir = path.join(__dirname, '../maps');
const cutoffYear = 1886;

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
}

// Process files
async function processFiles() {
    try {
        // Read all files from source directory
        const files = fs.readdirSync(sourceDir);

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const sourcePath = path.join(sourceDir, file);
            const fileContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

            // Check if any feature in the file is before 1886
            const hasRelevantFeatures = fileContent.features.some(feature => {
                const startYear = feature.properties.gwsyear;
                return startYear <= cutoffYear;
            });

            if (hasRelevantFeatures) {
                // Modify features if needed
                fileContent.features = fileContent.features.map(feature => {
                    // If end year is after 1886, set it to 1886
                    if (feature.properties.gweyear > cutoffYear) {
                        feature.properties.gweyear = cutoffYear;
                        feature.properties.gwemonth = 12;
                        feature.properties.gweday = 31;
                        feature.properties.gwedate = "31.12.1886 23:59:59";
                    }
                    return feature;
                });

                // Write modified file to target directory
                const targetPath = path.join(targetDir, file);
                fs.writeFileSync(targetPath, JSON.stringify(fileContent, null, 2));
                console.log(`Processed and moved: ${file}`);
            }
        });

        console.log('Processing complete!');
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

processFiles(); 