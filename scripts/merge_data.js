const fs = require('fs');
const path = require('path');

// Статистика обработки
const stats = {
    totalFiles: 0,
    successfulFiles: 0,
    failedFiles: [],
    totalFeatures: 0,
    emptyFiles: [],
    invalidStructureFiles: []
};

try {
    // Путь к папке с данными
    const mapsDir = path.join(process.cwd(), 'maps');
    const outputDir = path.join(process.cwd(), '.');
    const outputFile = path.join(outputDir, 'all_data.json');

    // Проверяем существование исходной директории
    if (!fs.existsSync(mapsDir)) {
        throw new Error(`Source directory '${mapsDir}' does not exist`);
    }

    // Создаем выходную директорию, если её нет
    if (!fs.existsSync(outputDir)) {
        try {
            fs.mkdirSync(outputDir, { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create output directory '${outputDir}': ${error.message}`);
        }
    }

    // Читаем все файлы из директории maps
    const files = fs.readdirSync(mapsDir).filter(file => file.endsWith('.json'));
    stats.totalFiles = files.length;

    if (files.length === 0) {
        throw new Error(`No JSON files found in '${mapsDir}'`);
    }

    console.log(`Found ${files.length} JSON files`);

    // Объединяем все features в один массив
    const allFeatures = [];

    files.forEach(file => {
        const filePath = path.join(mapsDir, file);
        console.log(`Processing ${file}...`);
        
        try {
            // Проверяем доступность файла
            if (!fs.existsSync(filePath)) {
                throw new Error('File not found');
            }

            // Читаем содержимое файла
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (!fileContent.trim()) {
                stats.emptyFiles.push(file);
                throw new Error('File is empty');
            }

            // Парсим JSON
            const data = JSON.parse(fileContent);

            // Проверяем структуру
            if (!data || typeof data !== 'object') {
                stats.invalidStructureFiles.push(file);
                throw new Error('Invalid JSON structure');
            }

            if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
                stats.invalidStructureFiles.push(file);
                throw new Error('Not a valid GeoJSON FeatureCollection');
            }

            // Проверяем features
            if (data.features.length === 0) {
                stats.emptyFiles.push(file);
                throw new Error('No features found in file');
            }

            // Добавляем features
            allFeatures.push(...data.features);
            stats.totalFeatures += data.features.length;
            stats.successfulFiles++;

        } catch (error) {
            stats.failedFiles.push({ file, error: error.message });
            console.error(`Error processing ${file}: ${error.message}`);
        }
    });

    // Проверяем, есть ли успешно обработанные файлы
    if (allFeatures.length === 0) {
        throw new Error('No valid features found in any file');
    }

    // Создаем итоговый FeatureCollection
    const mergedData = {
        type: "FeatureCollection",
        features: allFeatures
    };

    // Сохраняем результат
    try {
        fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
    } catch (error) {
        throw new Error(`Failed to save output file: ${error.message}`);
    }

    // Выводим итоговую статистику
    console.log('\n=== Processing Summary ===');
    console.log(`Total files processed: ${stats.totalFiles}`);
    console.log(`Successfully processed: ${stats.successfulFiles}`);
    console.log(`Failed to process: ${stats.failedFiles.length}`);
    console.log(`Total features merged: ${stats.totalFeatures}`);
    console.log(`Output file size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);

    if (stats.emptyFiles.length > 0) {
        console.log('\nEmpty files:');
        stats.emptyFiles.forEach(file => console.log(`- ${file}`));
    }

    if (stats.invalidStructureFiles.length > 0) {
        console.log('\nFiles with invalid structure:');
        stats.invalidStructureFiles.forEach(file => console.log(`- ${file}`));
    }

    if (stats.failedFiles.length > 0) {
        console.log('\nProcessing errors:');
        stats.failedFiles.forEach(({file, error}) => console.log(`- ${file}: ${error}`));
    }

} catch (error) {
    console.error('\n=== CRITICAL ERROR ===');
    console.error(error.message);
    process.exit(1);
} 