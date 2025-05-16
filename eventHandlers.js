class EventHandlers {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.initializeEventHandlers();
    }

    changeYear(delta) {
        const yearInput = document.getElementById('yearInput');
        const newYear = parseInt(yearInput.value) + delta;
        yearInput.value = newYear;
        this.mapManager.updateMap();
    }

    updateYear(year) {
        document.getElementById('yearInput').value = year;
        this.mapManager.updateMap();
    }

    async updateMapToState(wikidataId, year) {
        const currentZoom = this.mapManager.map.getZoom();
        const currentCenter = this.mapManager.map.getCenter();
        
        this.updateYear(year);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (this.mapManager.countryLayer) {
            let foundState = null;
            this.mapManager.countryLayer.eachLayer(layer => {
                if (layer.feature.properties.wikidata_id === wikidataId) {
                    const currentStyle = layer.options.style || this.mapManager.style(layer.feature);
                    layer.setStyle({
                        ...currentStyle,
                        weight: 4,
                        color: '#ff0000'
                    });
                    foundState = layer;
                } else {
                    layer.setStyle(this.mapManager.style(layer.feature));
                }
            });

            this.mapManager.map.setZoom(currentZoom);
            this.mapManager.map.setView(currentCenter, currentZoom);

            if (foundState) {
                const properties = foundState.feature.properties;
                const panel = document.getElementById('country-info-panel');
                const content = document.getElementById('country-info-content');
                
                if (panel && content) {
                    let startYear = properties.gwsyear < 0 ? Math.abs(properties.gwsyear) + " BC" : properties.gwsyear;
                    let endYear = properties.gweyear < 0 ? Math.abs(properties.gweyear) + " BC" : properties.gweyear;

                    // Wars block
                    let warsBlock = '';
                    if (warsData && Array.isArray(properties.wars) && properties.wars.length > 0) {
                        warsBlock = '<h4>Wars:</h4><ul>';
                        properties.wars.forEach(warKey => {
                            const war = warsData[warKey];
                            if (war) {
                                let nameHtml = war.name;
                                if (war.wikipedia_link) {
                                    nameHtml = `<a href="${war.wikipedia_link}" target="_blank">${war.name}</a>`;
                                }
                                let dateHtml = '';
                                if (war.start_date || war.end_date) {
                                    let start = war.start_date ? war.start_date.split('T')[0] : '';
                                    let end = war.end_date ? war.end_date.split('T')[0] : '';
                                    if (start && end) {
                                        dateHtml = ` (${start} – ${end})`;
                                    } else if (start) {
                                        dateHtml = ` (${start})`;
                                    } else if (end) {
                                        dateHtml = ` (${end})`;
                                    }
                                }
                                warsBlock += `<li><strong>${nameHtml}</strong>${dateHtml}</li>`;
                            }
                        });
                        warsBlock += '</ul>';
                    }

                    const infoContent = `
                        <h3>${properties.cntry_name}</h3>
                        <p><strong>Start:</strong> ${startYear}</p>
                        <p><strong>End:</strong> ${endYear}</p>
                        ${properties.wikipedia ? `<p><a href="${properties.wikipedia}" target="_blank">Wikipedia Article</a></p>` : ''}
                        ${warsBlock}
                    `;

                    content.innerHTML = infoContent;
                    await StateRelations.addToInfoPanel(properties);
                    panel.style.display = 'block';
                    panel.scrollTop = 0;
                }
            }
        }
    }

    initializeEventHandlers() {
        // Bind methods to this instance
        this.boundChangeYear = this.changeYear.bind(this);
        this.boundUpdateYear = this.updateYear.bind(this);
        this.boundUpdateMap = this.mapManager.updateMap.bind(this.mapManager);

        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchText = e.target.value.toLowerCase();
            if (this.mapManager.countryLayer) {
                this.mapManager.countryLayer.eachLayer(layer => {
                    const countryName = layer.feature.properties.cntry_name.toLowerCase();
                    if (countryName.includes(searchText)) {
                        layer.setStyle({
                            weight: 4,
                            color: '#ff0000'
                        });
                    } else {
                        layer.setStyle(this.mapManager.style(layer.feature));
                    }
                });
            }
        });

        document.getElementById('yearInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.boundUpdateMap();
            }
        });

        document.getElementById('updateButton').addEventListener('click', () => {
            this.boundUpdateMap();
        });

        window.addEventListener('load', () => {
            document.getElementById('updateButton').click();
        });
    }
} 