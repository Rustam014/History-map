function changeYear(delta) {
    const yearInput = document.getElementById('yearInput');
    const newYear = parseInt(yearInput.value) + delta;
    yearInput.value = newYear;
    updateMap();
}

function updateYear(year) {
    document.getElementById('yearInput').value = year;
    updateMap();
}

function initializeEventHandlers() {
    document.getElementById('searchInput').addEventListener('input', function(e) {
        const searchText = e.target.value.toLowerCase();
        if (countryLayer) {
            countryLayer.eachLayer(layer => {
                const countryName = layer.feature.properties.cntry_name.toLowerCase();
                if (countryName.includes(searchText)) {
                    layer.setStyle({
                        weight: 4,
                        color: '#ff0000'
                    });
                } else {
                    layer.setStyle(style(layer.feature));
                }
            });
        }
    });

    document.getElementById('yearInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            updateMap();
        }
    });

    document.getElementById('updateButton').addEventListener('click', updateMap);

    window.addEventListener('load', function() {
        document.getElementById('updateButton').click();
    });
} 