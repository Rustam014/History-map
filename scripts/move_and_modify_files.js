/**
 * Processes and filters historical geographic data by time period.
 * 
 * Input: converted_json/*.json - historical country data files
 * Output: maps/*.json - processed files with data up to 1886
 * 
 * Process:
 * 1. Reads JSON files from converted_json directory
 * 2. Filters files to keep only those with data before 1886
 * 3. For matching files:
 *    - Truncates periods ending after 1886 to 31.12.1885
 *    - Saves modified data to maps directory
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../converted_json');
const targetDir = path.join(__dirname, '../maps');
const cutoffYear = 1885;

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
}

async function processFiles() {
    try {
        const files = fs.readdirSync(sourceDir);

        files.forEach(file => {
            if (!file.endsWith('.json')) return;

            const sourcePath = path.join(sourceDir, file);
            const fileContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

            // Check for data before 1886
            const hasRelevantFeatures = fileContent.features.some(feature => {
                const startYear = feature.properties.gwsyear;
                return startYear <= cutoffYear;
            });

            if (hasRelevantFeatures) {
                // Modify data: limit periods to 1885
                fileContent.features = fileContent.features.map(feature => {
                    // If end year is after 1886, set it to 31.12.1885
                    if (feature.properties.gweyear > cutoffYear) {
                        feature.properties.gweyear = cutoffYear;
                        feature.properties.gwemonth = 12;
                        feature.properties.gweday = 31;
                        feature.properties.gwedate = "31.12.1885 23:59:59";
                    }
                    return feature;
                });

                // Save modified file
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