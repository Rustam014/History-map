let map = null;
let countryLayer = null;
let currentYear = 1000;
let currentContrast = 0.7;
const dataManager = new DataManager();
let chainsData = null;
let warsData = null;

// Load chains.json on start
fetch('data/chains.json')
    .then(response => response.json())
    .then(data => {
        chainsData = data;
    });

// Load wars_output.json on start
fetch('data/wars_output.json')
    .then(response => response.json())
    .then(data => {
        warsData = data.wars;
    });

function initializeMap() {
    map = L.map('map', {
        zoomAnimation: true,
        wheelPxPerZoomLevel: 500,
        wheelDebounceTime: 100,
        scrollWheelZoom: 'center',
        zoomDelta: 0.25,
        zoomSnap: 0.25
    }).setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const contrastSlider = document.getElementById('contrastSlider');
    contrastSlider.value = currentContrast * 100;
}

function filterByYear(data, year) {
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

function style(feature) {
    const countryName = feature.properties.cntry_name;
    return {
        fillColor: ColorManager.getColor(countryName),
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: currentContrast
    };
}

function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.cntry_name) {
        const properties = feature.properties;
        let startYear, endYear;

        // Check if country is in chainsData
        if (chainsData && chainsData[properties.cntry_name]) {
            const chain = chainsData[properties.cntry_name];
            // Find min start_date and max end_date
            const minStart = Math.min(...chain.map(item => item.start_date));
            const maxEnd = Math.max(...chain.map(item => item.end_date));
            startYear = minStart < 0 ? Math.abs(minStart) + " BC" : minStart;
            endYear = maxEnd < 0 ? Math.abs(maxEnd) + " BC" : maxEnd;
        } else {
            startYear = properties.gwsyear < 0 ? Math.abs(properties.gwsyear) + " BC" : properties.gwsyear;
            endYear = properties.gweyear < 0 ? Math.abs(properties.gweyear) + " BC" : properties.gweyear;
        }

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

        layer.on('click', function(e) {
            try {
                console.log('Country clicked:', properties.cntry_name);
                const panel = document.getElementById('country-info-panel');
                const content = document.getElementById('country-info-content');
                if (!panel || !content) {
                    console.error('country-info-panel or country-info-content not found');
                    return;
                }
                content.innerHTML = infoContent;
                panel.style.display = 'block';
                if (layer.closePopup) layer.closePopup();
                if (layer.bringToFront) layer.bringToFront();
                panel.scrollTop = 0;
                console.log('Panel should be visible now');
            } catch (e) {
                console.error('Error showing country info panel:', e);
            }
        });
    }
}

function updateContrast(value) {
    if (!countryLayer) return;
    
    currentContrast = value / 100;
    countryLayer.eachLayer(function(layer) {
        layer.setStyle({
            fillOpacity: currentContrast
        });
    });
}

async function updateMap() {
    const year = parseInt(document.getElementById('yearInput').value);
    if (isNaN(year)) {
        alert('Please enter a valid year');
        return;
    }
    currentYear = year;

    if (countryLayer) {
        map.removeLayer(countryLayer);
        countryLayer = null;
    }

    map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });

    document.getElementById('loading').style.display = 'block';

    try {
        const data = await dataManager.getData(year);
        if (!data) {
            throw new Error('Failed to load data');
        }

        const filteredData = filterByYear(data, year);
        if (!filteredData || !filteredData.features || filteredData.features.length === 0) {
            alert('No data available for this year');
            return;
        }

        countryLayer = L.geoJSON(filteredData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);

        updateContrast(document.getElementById('contrastSlider').value);
    } catch (error) {
        console.error('Error updating map:', error);
        alert('Error updating map: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Добавляю обработчик для закрытия панели
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        const closeBtn = document.getElementById('close-country-info');
        if (closeBtn) {
            closeBtn.onclick = function() {
                document.getElementById('country-info-panel').style.display = 'none';
            };
        }
    });
} 