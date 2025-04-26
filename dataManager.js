class DataManager {
    constructor() {
        this.cachedData = {};
        this.periods = [
            { name: '12300BC_to_0', start: -123000, end: -1 },
            { name: '1_to_1500', start: -1, end: 1500 },
            { name: '1501_to_1800', start: 1501, end: 1800 },
            { name: '1801_to_1900', start: 1801, end: 1900 },
            { name: '1901_to_2024', start: 1901, end: 2024 }
        ];
    }

    getPeriodForYear(year) {
        console.log(`Finding period for year ${year}`);
        if (year >= -1 && year <= 0) {
            return this.periods[1];
        }
        const period = this.periods.find(period => 
            year >= period.start && year <= period.end
        );
        console.log(`Found period:`, period);
        return period;
    }

    async loadPeriodData(period) {
        try {
            console.log(`Loading data for period: ${period.name}`);
            const response = await fetch(`./maps/${period.name}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Loaded ${data.features.length} features for period ${period.name}`);
            this.cachedData[period.name] = data;
            return data;
        } catch (error) {
            console.error(`Error loading period data ${period.name}:`, error);
            return null;
        }
    }

    async getData(year) {
        console.log(`Getting data for year ${year}`);
        const period = this.getPeriodForYear(year);
        if (!period) {
            console.error(`No period found for year ${year}`);
            return null;
        }

        if (!this.cachedData[period.name]) {
            console.log(`Data not cached for period ${period.name}, loading...`);
            document.getElementById('loading').style.display = 'block';
            try {
                const data = await this.loadPeriodData(period);
                console.log(`Data loaded for period ${period.name}:`, data ? 'success' : 'failed');
                return data;
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }

        console.log(`Returning cached data for period ${period.name}`);
        return this.cachedData[period.name];
    }

    clearCache() {
        console.log('Clearing cache');
        this.cachedData = {};
    }
} 