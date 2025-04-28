class DataManager {
    constructor() {
        this.cachedData = {};
        this.periods = [
            { 
                name: '12300BC_to_0', 
                start: -123000, 
                end: -1,
                parts: 2 
            },
            { 
                name: '1_to_1500', 
                start: -1, 
                end: 1500,
                parts: 3
            },
            { 
                name: '1501_to_1800', 
                start: 1501, 
                end: 1800,
                parts: 2
            },
            { 
                name: '1801_to_1900', 
                start: 1801, 
                end: 1900,
                parts: 3
            },
            { 
                name: '1901_to_2024', 
                start: 1901, 
                end: 2024,
                parts: 10
            }
        ];
    }

    getPeriodForYear(year) {
        console.log(`Finding period for year ${year}`);
        if (year >= -1 && year <= 0) {
            return this.periods[1];
        }
        return this.periods.find(period => 
            year >= period.start && year <= period.end
        );
    }

    async loadPeriodData(period) {
        try {
            let allFeatures = [];
            
            for (let i = 1; i <= period.parts; i++) {
                const response = await fetch(`./maps/${period.name}_part${i}.json`, {
                    mode: 'cors',
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for part ${i}`);
                }
                
                const data = await response.json();
                allFeatures = allFeatures.concat(data.features);
            }

            const completeData = {
                type: "FeatureCollection",
                features: allFeatures
            };

            this.cachedData[period.name] = completeData;
            return completeData;
        } catch (error) {
            console.error(`Error loading period data ${period.name}:`, error);
            document.getElementById('loading').textContent = 'Error loading data. Please try again.';
            return null;
        }
    }

    async getData(year) {
        const period = this.getPeriodForYear(year);
        if (!period) {
            return null;
        }

        if (!this.cachedData[period.name]) {
            document.getElementById('loading').style.display = 'block';
            try {
                return await this.loadPeriodData(period);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        return this.cachedData[period.name];
    }

    clearCache() {
        this.cachedData = {};
    }
} 