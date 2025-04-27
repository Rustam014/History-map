let map = null;
let countryLayer = null;
let currentYear = 1000;
let currentContrast = 0.7;
const dataManager = new DataManager();

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
        const startYear = properties.gwsyear < 0 ? Math.abs(properties.gwsyear) + " BC" : properties.gwsyear;
        const endYear = properties.gweyear < 0 ? Math.abs(properties.gweyear) + " BC" : properties.gweyear;
        
        const popupContent = `
            <h3>${properties.cntry_name}</h3>
            <p><strong>Start:</strong> ${startYear}</p>
            <p><strong>End:</strong> ${endYear}</p>
        `;
        layer.bindPopup(popupContent);
    }
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

function updateContrast(value) {
    if (!countryLayer) return;
    
    const opacity = value / 100;
    countryLayer.eachLayer(function(layer) {
        layer.setStyle({
            fillOpacity: opacity
        });
    });
} 