const fs = require('fs');
const path = require('path');

const statesFilePath = '../data/states_with_lineage.json';
const mapsDirectoryPath = '../maps';
const unmatchedOutputPath = '../data/unmatched_states.json';

const fieldsToCopy = ['wikidata_id', 'wikipedia', 'P155', 'P156', 'P1365', 'P1366', 'wars'];

// Загрузка данных о государствах
function loadStates(callback) {
    fs.readFile(statesFilePath, 'utf8', (err, data) => {
        if (err) return callback(err);
        const parsed = JSON.parse(data);
        callback(null, parsed.states);
    });
}

// Основная обработка
function processMaps(states) {
    const unmatchedStates = new Set(Object.keys(states)); // изначально считаем, что все — необработаны

    fs.readdir(mapsDirectoryPath, (err, files) => {
        if (err) {
            console.error('Ошибка при чтении папки maps:', err);
            return;
        }

        const jsonFiles = files.filter(file => path.extname(file) === '.json');

        jsonFiles.forEach(file => {
            const fullPath = path.join(mapsDirectoryPath, file);

            fs.readFile(fullPath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Ошибка при чтении файла ${file}:`, err);
                    return;
                }

                let modified = false;
                let mapData;

                try {
                    mapData = JSON.parse(data);
                } catch (parseErr) {
                    console.error(`Ошибка при разборе JSON в файле ${file}:`, parseErr);
                    return;
                }

                for (const feature of mapData.features || []) {
                    const props = feature.properties;
                    const countryName = props.cntry_name;
                    const mapStartYear = parseInt(props.gwsyear, 10);
                    const mapEndYear = parseInt(props.gweyear, 10);

                    for (const [stateKey, state] of Object.entries(states)) {
                        const startDate = parseInt(state.start_date, 10);
                        const endDate = parseInt(state.end_date, 10);

                        if (
                            state.name === countryName &&
                            startDate === mapStartYear &&
                            endDate === mapEndYear
                        ) {
                            let changed = false;

                            for (const field of fieldsToCopy) {
                                if (!(field in props)) {
                                    props[field] = state[field];
                                    changed = true;
                                }
                            }

                            if (changed) {
                                console.log(`Добавлены поля в "${countryName}" (${startDate}–${endDate}) в файле ${file}`);
                                modified = true;
                            }

                            // Помечаем это состояние как обработанное
                            unmatchedStates.delete(stateKey);
                            break; // Не продолжаем поиск по другим state
                        }
                    }
                }

                if (modified) {
                    fs.writeFile(fullPath, JSON.stringify(mapData, null, 2), 'utf8', (err) => {
                        if (err) {
                            console.error(`Ошибка при сохранении файла ${file}:`, err);
                        } else {
                            console.log(`✅ Файл обновлён: ${file}`);
                        }
                    });
                }

                // После обработки всех файлов — сохраняем unmatched
                if (file === jsonFiles[jsonFiles.length - 1]) {
                    const unmatchedData = {};
                    for (const key of unmatchedStates) {
                        unmatchedData[key] = states[key];
                    }

                    fs.writeFile(unmatchedOutputPath, JSON.stringify(unmatchedData, null, 2), 'utf8', (err) => {
                        if (err) {
                            console.error('Ошибка при сохранении unmatched_states.json:', err);
                        } else {
                            console.log(`📄 Список необработанных государств сохранён в ${unmatchedOutputPath}`);
                        }
                    });
                }
            });
        });
    });
}

// Запуск
loadStates((err, states) => {
    if (err) {
        console.error('Ошибка при загрузке states_with_lineage:', err);
        return;
    }

    processMaps(states);
});
