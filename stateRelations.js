class StateRelationsView {
    static createNoRelationsMessage(message) {
        return {
            type: 'no-relations',
            message: message
        };
    }

    static createRelationsBlock(relations) {
        return {
            type: 'relations',
            predecessors: relations.predecessors,
            successors: relations.successors
        };
    }
}

class StateRelations {
    static async addToInfoPanel(properties) {
        console.log('Adding to info panel:', properties);
        const content = document.getElementById('country-info-content');
        if (!content) {
            console.error('Content element not found');
            return;
        }

        const relationsBlock = await this.createRelationsBlock(properties);
        console.log('Created relations block:', relationsBlock);
        if (relationsBlock) {
            const html = this.renderRelationsBlock(relationsBlock);
            content.innerHTML += html;
            console.log('Added relations block to content');
        }
    }

    static renderRelationsBlock(block) {
        if (block.type === 'no-relations') {
            return `<div class="state-relations"><p class="no-relations">${block.message}</p></div>`;
        }

        if (block.type === 'relations') {
            let html = '<div class="state-relations">';
            
            if (block.predecessors.length > 0) {
                html += '<div class="predecessors"><h4>Predecessors:</h4><ul>';
                block.predecessors.forEach(state => {
                    html += `<li><a href="#" onclick="eventHandlers.updateMapToState('${state.id}', ${state.year}); return false;">${state.name}</a> (${state.year})</li>`;
                });
                html += '</ul></div>';
            }

            if (block.successors.length > 0) {
                html += '<div class="successors"><h4>Successors:</h4><ul>';
                block.successors.forEach(state => {
                    html += `<li><a href="#" onclick="eventHandlers.updateMapToState('${state.id}', ${state.year}); return false;">${state.name}</a> (${state.year})</li>`;
                });
                html += '</ul></div>';
            }

            if (block.predecessors.length === 0 && block.successors.length === 0) {
                html += '<p class="no-relations">No predecessors or successors found for this state.</p>';
            }

            html += '</div>';
            return html;
        }

        return '';
    }

    static async createRelationsBlock(properties) {
        console.log('Creating relations block for properties:', properties);
        if (!properties.wikidata_id) {
            console.log('No wikidata_id in properties');
            return StateRelationsView.createNoRelationsMessage('Information about predecessors and successors is not available for this state.');
        }

        try {
            // Wait for dataManager to be available
            console.log('Checking for dataManager...');
            console.log('Current window.dataManager:', window.dataManager);
            let attempts = 0;
            while (!window.dataManager && attempts < 10) {
                console.log('Waiting for dataManager, attempt:', attempts + 1);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.dataManager) {
                console.error('dataManager not found after waiting');
                return StateRelationsView.createNoRelationsMessage('Unable to load state relations data.');
            }

            console.log('dataManager found:', window.dataManager);
            console.log('Getting state relations for:', properties.wikidata_id, properties.gwsyear);
            const relations = await window.dataManager.getStateRelations(
                properties.wikidata_id,
                properties.gwsyear
            );
            console.log('Got relations:', relations);

            if (relations.error || relations.loading) {
                console.log('Relations error or loading:', relations);
                return StateRelationsView.createNoRelationsMessage('Unable to load state relations data.');
            }

            return StateRelationsView.createRelationsBlock(relations);
        } catch (error) {
            console.error('Error creating relations block:', error);
            console.error('Error stack:', error.stack);
            return StateRelationsView.createNoRelationsMessage('Error loading state relations data.');
        }
    }
} 