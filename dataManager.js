class DataManager {
    constructor() {
        this.cachedData = null;
    }

    async loadAllData() {
        try {
            document.getElementById('loading').style.display = 'block';
            
            // Получаем список всех JSON файлов в директории
            const response = await fetch('./data-files-list.json');
            const filesList = await response.json();
            
            // Загружаем все файлы и объединяем их данные
            const allData = await Promise.all(
                filesList.map(async (filename) => {
                    try {
                        const response = await fetch(`./data/${filename}`);
                        return await response.json();
                    } catch (error) {
                        console.error(`Error loading ${filename}:`, error);
                        return null;
                    }
                })
            );

            // Объединяем все валидные данные
            const mergedData = {
                type: "FeatureCollection",
                features: allData
                    .filter(data => data !== null)
                    .flatMap(data => data.features || [])
            };

            this.cachedData = mergedData;
            return mergedData;

        } catch (error) {
            console.error('Error loading data:', error);
            alert('Ошибка загрузки данных. Проверьте консоль для деталей.');
            return null;
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    async getData() {
        if (!this.cachedData) {
            return await this.loadAllData();
        }
        return this.cachedData;
    }
} 