class DataManager {
    constructor() {
        this.cachedData = null;
    }

    async loadAllData() {
        try {
            document.getElementById('loading').style.display = 'block';
            
            // Get list of files from the maps directory
            let filesList;
            try {
                const response = await fetch('./maps/');
                if (!response.ok) {
                    throw new Error('Failed to retrieve file list');
                }
                const html = await response.text();
                // Create a temporary element for parsing HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                // Get all links to .json files
                filesList = Array.from(doc.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href.endsWith('.json'))
                    .map(href => href.split('/').pop());
                console.log('File list loaded:', filesList);
            } catch (error) {
                console.error('Error loading file list:', error);
                throw error;
            }
            
            // Load files
            const allData = await Promise.all(
                filesList.map(async (filename) => {
                    try {
                        console.log(`Loading file: ./maps/${filename}`);
                        const response = await fetch(`./maps/${filename}`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        console.log(`File ${filename} successfully loaded:`, data);
                        return data;
                    } catch (error) {
                        console.error(`Error loading ${filename}:`, error);
                        return null;
                    }
                })
            );

            // Check loaded data
            const validData = allData.filter(data => data !== null);
            if (validData.length === 0) {
                throw new Error('Failed to load any data files');
            }

            // Merge data
            const mergedData = {
                type: "FeatureCollection",
                features: validData.flatMap(data => {
                    if (!data.features) {
                        console.error('Invalid data format:', data);
                        return [];
                    }
                    return data.features;
                })
            };

            console.log('Merged data:', mergedData);
            
            if (!mergedData.features || mergedData.features.length === 0) {
                throw new Error('No data to display');
            }

            this.cachedData = mergedData;
            return mergedData;

        } catch (error) {
            console.error('Error loading data:', error);
            alert(`Error loading data: ${error.message}`);
            return null;
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async getData() {
        if (!this.cachedData) {
            return await this.loadAllData();
        }
        return this.cachedData;
    }
} 