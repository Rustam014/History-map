const fs = require('fs');

const BASE_FILE = './data/states_data.json';
const CANDIDATES_FILE = './data/states_data_candidates.json';
const OUTPUT_FILE = './data/states_with_chains.json';

const baseStates = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')).states;
const candidateStates = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8')).states;

const output = {};
const grouped = {};

// Группируем состояния по имени и датам
for (const [key, state] of Object.entries(candidateStates)) {
  const name = state.name;
  const startDate = state.start_date;
  const endDate = state.end_date;

  // Создаем ключ для группировки состояний с одинаковым именем и датами
  const groupKey = `${name}`;

  if (!grouped[groupKey]) grouped[groupKey] = [];
  grouped[groupKey].push({ key, state });
}

// Обрабатываем каждую группу состояний (каждое имя с разными датами)
for (const group of Object.values(grouped)) {
  // Сортируем по дате начала
  group.sort((a, b) => (a.state.start_date ?? -999999) - (b.state.start_date ?? -999999));

  const total = group.length;

  // Прописываем chain_index, total_in_chain, previous_state и next_state
  group.forEach((entry, index) => {
    const { key, state } = entry;
    const original = baseStates[key];

    if (!original || original.start_date !== state.start_date || original.end_date !== state.end_date) return;

    // Добавляем в выходной файл состояние с цепочкой
    const enriched = {
      ...state,
      boundaries_file: original.boundaries_file,
      chain_index: index + 1,  // Индекс в цепочке
      total_in_chain: total,  // Всего в цепочке
      previous_state: index > 0 ? group[index - 1].key : null,  // Предыдущее состояние
      next_state: index < total - 1 ? group[index + 1].key : null  // Следующее состояние
    };

    output[key] = enriched;
  });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ states: output }, null, 2));
