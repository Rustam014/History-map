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

    async findStateDate(wikidataId, currentYear, isSuccessor) {
        console.log(`Searching for state with ID ${wikidataId} around year ${currentYear} (isSuccessor: ${isSuccessor})`);
        
        const currentPeriod = this.getPeriodForYear(currentYear);
        if (!currentPeriod) {
            console.log(`No period found for year ${currentYear}`);
            return null;
        }

        const currentPeriodIndex = this.periods.findIndex(p => p.name === currentPeriod.name);
        
        const periodsToSearch = [
            this.periods[currentPeriodIndex - 1], 
            currentPeriod,                       
            this.periods[currentPeriodIndex + 1] 
        ].filter(p => p); 

        console.log('Searching in periods:', periodsToSearch.map(p => p.name).join(', '));

        let targetYear = null;
        let targetState = null;

        for (const period of periodsToSearch) {
            if (!this.cachedData[period.name]) {
                await this.loadPeriodData(period);
            }

            const features = this.cachedData[period.name].features;
            for (const feature of features) {
                if (feature.properties.wikidata_id === wikidataId) {
                    const stateYear = feature.properties.gwsyear;
                    console.log(`Found state ${feature.properties.cntry_name} in year ${stateYear} (period: ${period.name})`);
                    
                    if (isSuccessor) {
                        if (stateYear > currentYear && (!targetYear || stateYear < targetYear)) {
                            targetYear = stateYear;
                            targetState = feature;
                            console.log(`Selected as successor: ${feature.properties.cntry_name} (${stateYear})`);
                        }
                    } else {
                        if (stateYear < currentYear && (!targetYear || stateYear > targetYear)) {
                            targetYear = stateYear;
                            targetState = feature;
                            console.log(`Selected as predecessor: ${feature.properties.cntry_name} (${stateYear})`);
                        }
                    }
                }
            }
        }

        if (!targetState) {
            console.log(`No state found for ID ${wikidataId} in searched periods`);
        }

        return targetState;
    }

    async getStateRelations(wikidataId, currentYear) {
        const relations = {
            predecessors: [],
            successors: [],
            loading: true
        };

        this.updateUI(relations);

        try {
            const currentState = await this.findStateDate(wikidataId, currentYear, false);
            if (!currentState) {
                relations.error = true;
                relations.loading = false;
                return relations;
            }

            const predecessorIds = [
                ...(currentState.properties.P155 || []),
                ...(currentState.properties.P1365 || [])
            ];
            
            for (const id of predecessorIds) {
                const predecessor = await this.findStateDate(id, currentYear, false);
                if (predecessor) {
                    relations.predecessors.push({
                        id: id,
                        name: predecessor.properties.cntry_name,
                        year: predecessor.properties.gwsyear
                    });
                }
            }

            const successorIds = [
                ...(currentState.properties.P156 || []),
                ...(currentState.properties.P1366 || [])
            ];
            
            for (const id of successorIds) {
                const successor = await this.findStateDate(id, currentYear, true);
                if (successor) {
                    relations.successors.push({
                        id: id,
                        name: successor.properties.cntry_name,
                        year: successor.properties.gwsyear
                    });
                }
            }

            relations.loading = false;
        } catch (error) {
            console.error('Error loading state relations:', error);
            relations.error = true;
            relations.loading = false;
        }

        return relations;
    }

    updateUI(relations) {
        if (relations.loading) {
            return `
                <div class="state-relations">
                    <div class="loading">Loading state relations...</div>
                </div>
            `;
        }

        if (relations.error) {
            return `
                <div class="state-relations">
                    <div class="error">Error loading state relations</div>
                </div>
            `;
        }

        const predecessors = relations.predecessors.length > 0 
            ? `<div class="predecessors">
                <h4>Predecessors:</h4>
                <ul>${relations.predecessors.map(state => 
                    `<li>
                        <a href="#" onclick="updateMapToState('${state.id}', ${state.year})">
                            ${state.name} (${state.year})
                        </a>
                    </li>`
                ).join('')}</ul>
               </div>`
            : '';

        const successors = relations.successors.length > 0
            ? `<div class="successors">
                <h4>Successors:</h4>
                <ul>${relations.successors.map(state => 
                    `<li>
                        <a href="#" onclick="updateMapToState('${state.id}', ${state.year})">
                            ${state.name} (${state.year})
                        </a>
                    </li>`
                ).join('')}</ul>
               </div>`
            : '';

        return `
            <div class="state-relations">
                ${predecessors}
                ${successors}
            </div>
        `;
    }
} 