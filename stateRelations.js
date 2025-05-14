class StateRelations {
    static async createRelationsBlock(properties) {
        console.log('Creating relations block for:', properties);
        const relationsBlock = document.createElement('div');
        relationsBlock.className = 'state-relations';

        // Get relations from DataManager
        console.log('Getting relations for wikidata_id:', properties.wikidata_id, 'year:', properties.gwsyear);
        const relations = await dataManager.getStateRelations(properties.wikidata_id, properties.gwsyear);
        console.log('Received relations:', relations);
        
        // Predecessors
        const predecessors = document.createElement('div');
        predecessors.className = 'predecessors';
        if (relations.predecessors && relations.predecessors.length > 0) {
            console.log('Found predecessors:', relations.predecessors);
            predecessors.innerHTML = `
                <h4>Predecessors:</h4>
                <ul>
                    ${relations.predecessors.map(state => `
                        <li>
                            <a href="#" onclick="updateMapToState('${state.id}', ${state.year})">
                                ${state.name} (${state.year})
                            </a>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            console.log('No predecessors found');
            predecessors.innerHTML = `
                <h4>Predecessors:</h4>
                <p>No predecessors found</p>
            `;
        }
        relationsBlock.appendChild(predecessors);

        // Successors
        const successors = document.createElement('div');
        successors.className = 'successors';
        if (relations.successors && relations.successors.length > 0) {
            console.log('Found successors:', relations.successors);
            successors.innerHTML = `
                <h4>Successors:</h4>
                <ul>
                    ${relations.successors.map(state => `
                        <li>
                            <a href="#" onclick="updateMapToState('${state.id}', ${state.year})">
                                ${state.name} (${state.year})
                            </a>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            console.log('No successors found');
            successors.innerHTML = `
                <h4>Successors:</h4>
                <p>No successors found</p>
            `;
        }
        relationsBlock.appendChild(successors);

        console.log('Created relations block:', relationsBlock);
        return relationsBlock;
    }

    static async addToInfoPanel(properties) {
        console.log('Adding to info panel:', properties);
        const content = document.getElementById('country-info-content');
        if (!content) {
            console.error('country-info-content not found');
            return;
        }

        const relationsBlock = await this.createRelationsBlock(properties);
        console.log('Appending relations block to content');
        content.appendChild(relationsBlock);
    }
} 