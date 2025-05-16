class MapManager {
    constructor() {
        this.map = null;
        this.countryLayer = null;
        this.currentYear = 1000;
        this.currentContrast = 0.7;
        this.dataManager = new DataManager();
        // Make dataManager globally accessible
        window.dataManager = this.dataManager;
        console.log('dataManager initialized:', this.dataManager);
        console.log('window.dataManager set:', window.dataManager);
        this.chainsData = null;
        this.warsData = null;
        this.initializeData();
    }

    initializeData() {
        fetch('data/chains.json')
            .then(response => response.json())
            .then(data => {
                this.chainsData = data;
            })
            .catch(error => console.error('Error loading chains.json:', error));

        fetch('data/wars_output.json')
            .then(response => response.json())
            .then(data => {
                this.warsData = data.wars;
            })
            .catch(error => console.error('Error loading wars_output.json:', error));
    }

    initializeMap() {
        this.map = L.map('map', {
            zoomAnimation: true,
            wheelPxPerZoomLevel: 500,
            wheelDebounceTime: 100,
            scrollWheelZoom: 'center',
            zoomDelta: 0.25,
            zoomSnap: 0.25
        }).setView([0, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        const contrastSlider = document.getElementById('contrastSlider');
        contrastSlider.value = this.currentContrast * 100;
    }

    filterByYear(data, year) {
        if (!data) return null;
        
        return {
            type: data.type,
            features: data.features.filter(feature => {
                const startYear = feature.properties.gwsyear;
                const endYear = feature.properties.gweyear;
                
                if (startYear < 0 || endYear < 0) {
                    return startYear <= year && endYear >= year;
                }
                
                const targetDate = new Date(year, 0, 1);
                const startDate = new Date(
                    startYear,
                    feature.properties.gwsmonth - 1,
                    feature.properties.gwsday
                );
                const endDate = new Date(
                    endYear,
                    feature.properties.gwemonth - 1,
                    feature.properties.gweday
                );

                return startDate <= targetDate && endDate > targetDate;
            })
        };
    }

    style(feature) {
        const countryName = feature.properties.cntry_name;
        return {
            fillColor: ColorManager.getColor(countryName),
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: this.currentContrast
        };
    }

    getStateYears(properties) {
        if (this.chainsData?.[properties.cntry_name]) {
            const chain = this.chainsData[properties.cntry_name];
            const minStart = Math.min(...chain.map(item => item.start_date));
            const maxEnd = Math.max(...chain.map(item => item.end_date));
            return {
                startYear: minStart < 0 ? Math.abs(minStart) + " BC" : minStart,
                endYear: maxEnd < 0 ? Math.abs(maxEnd) + " BC" : maxEnd
            };
        }
        return {
            startYear: properties.gwsyear < 0 ? Math.abs(properties.gwsyear) + " BC" : properties.gwsyear,
            endYear: properties.gweyear < 0 ? Math.abs(properties.gweyear) + " BC" : properties.gweyear
        };
    }

    generateWarsBlock(properties) {
        if (!this.warsData || !Array.isArray(properties.wars) || !properties.wars.length) {
            return '';
        }

        let warsBlock = '<h4>Wars:</h4><ul>';
        properties.wars.forEach(warKey => {
            const war = this.warsData[warKey];
            if (war) {
                let nameHtml = war.name;
                if (war.wikipedia_link) {
                    nameHtml = `<a href="${war.wikipedia_link}" target="_blank">${war.name}</a>`;
                }
                let dateHtml = this.formatWarDates(war);
                warsBlock += `<li><strong>${nameHtml}</strong>${dateHtml}</li>`;
            }
        });
        warsBlock += '</ul>';
        return warsBlock;
    }

    formatWarDates(war) {
        if (!war.start_date && !war.end_date) return '';
        
        let start = war.start_date ? war.start_date.split('T')[0] : '';
        let end = war.end_date ? war.end_date.split('T')[0] : '';
        
        if (start && end) return ` (${start} – ${end})`;
        if (start) return ` (${start})`;
        if (end) return ` (${end})`;
        return '';
    }

    generateInfoContent(properties, startYear, endYear, warsBlock) {
        return `
            <h3>${properties.cntry_name}</h3>
            <p><strong>Start:</strong> ${startYear}</p>
            <p><strong>End:</strong> ${endYear}</p>
            ${properties.wikipedia ? `<p><a href="${properties.wikipedia}" target="_blank">Wikipedia Article</a></p>` : ''}
            ${warsBlock}
        `;
    }

    async setupLayerClickHandler(layer, infoContent, properties) {
        console.log('Setting up click handler for:', properties.cntry_name);
        layer.on('click', async (e) => {
            console.log('Click event triggered for:', properties.cntry_name);
            console.log('Properties being passed to StateRelations:', JSON.stringify(properties, null, 2));
            try {
                const panel = document.getElementById('country-info-panel');
                const content = document.getElementById('country-info-content');
                console.log('Panel element:', panel);
                console.log('Content element:', content);
                
                if (!panel || !content) {
                    console.error('country-info-panel or country-info-content not found');
                    return;
                }
                
                console.log('Setting content:', infoContent);
                content.innerHTML = infoContent;
                
                console.log('Adding state relations...');
                await StateRelations.addToInfoPanel(properties);
                
                console.log('Showing panel...');
                panel.style.display = 'block';
                
                // Add close button handler
                const closeBtn = document.getElementById('close-country-info');
                if (closeBtn) {
                    closeBtn.onclick = function() {
                        panel.style.display = 'none';
                    };
                }
                
                if (layer.closePopup) layer.closePopup();
                if (layer.bringToFront) layer.bringToFront();
                panel.scrollTop = 0;
                console.log('Panel should be visible now');
            } catch (e) {
                console.error('Error showing country info panel:', e);
                console.error('Error stack:', e.stack);
            }
        });
    }

    onEachFeature(feature, layer) {
        if (!feature.properties?.cntry_name) {
            console.log('No country name in properties');
            return;
        }
        
        console.log('Setting up feature for:', feature.properties.cntry_name);
        const properties = feature.properties;
        const { startYear, endYear } = this.getStateYears(properties);
        const warsBlock = this.generateWarsBlock(properties);
        const infoContent = this.generateInfoContent(properties, startYear, endYear, warsBlock);
        
        this.setupLayerClickHandler(layer, infoContent, properties);
    }

    updateContrast(value) {
        if (!this.countryLayer) return;
        
        this.currentContrast = value / 100;
        this.countryLayer.eachLayer((layer) => {
            layer.setStyle({
                fillOpacity: this.currentContrast
            });
        });
    }

    async updateMap() {
        const year = parseInt(document.getElementById('yearInput').value);
        if (isNaN(year)) {
            alert('Please enter a valid year');
            return;
        }
        this.currentYear = year;

        if (this.countryLayer) {
            this.map.removeLayer(this.countryLayer);
            this.countryLayer = null;
        }

        this.map.eachLayer((layer) => {
            if (layer instanceof L.GeoJSON) {
                this.map.removeLayer(layer);
            }
        });

        document.getElementById('loading').style.display = 'block';

        try {
            const data = await this.dataManager.getData(year);
            if (!data) {
                throw new Error('Failed to load data');
            }

            const filteredData = this.filterByYear(data, year);
            if (!filteredData || !filteredData.features || filteredData.features.length === 0) {
                alert('No data available for this year');
                return;
            }

            this.countryLayer = L.geoJSON(filteredData, {
                style: this.style.bind(this),
                onEachFeature: this.onEachFeature.bind(this)
            }).addTo(this.map);

            this.updateContrast(document.getElementById('contrastSlider').value);
        } catch (error) {
            console.error('Error updating map:', error);
            alert('Error updating map: ' + error.message);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }
}

// Initialize map manager when DOM is loaded
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        const mapManager = new MapManager();
        mapManager.initializeMap();
        
        const closeBtn = document.getElementById('close-country-info');
        if (closeBtn) {
            closeBtn.onclick = function() {
                document.getElementById('country-info-panel').style.display = 'none';
            };
        }
    });
} 