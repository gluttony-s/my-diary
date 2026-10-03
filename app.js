// База данных для примера (категории и дни)
const database = [
    { id: 1, topic: "Тренировки", day: "Понедельник", content: "Подтягивания: 4 подхода на максимум.\nБрусья (+13 кг): 4 подхода по 8-10 повторений." },
    { id: 2, topic: "Тренировки", day: "Среда", content: "Работа с блинами 5 кг: выпады, приседания.\nШаги: минимум 8000." },
    { id: 3, topic: "Программирование", day: "Вторник", content: "C++: Написать логику движения змейки через SFML." },
    { id: 4, topic: "Микроконтроллеры", day: "Четверг", content: "Arduino Uno: Подключить драйвер A4988 к шаговому двигателю NEMA 17." },
    { id: 5, topic: "Учеба", day: "Пятница", content: "Физика: Разобрать вольтамперную характеристику диода." }
];

// Уникальные темы и дни для меню
const topics = [...new Set(database.map(item => item.topic))];
const days = [...new Set(database.map(item => item.day))];

const topicListEl = document.getElementById('topic-list');
const dayListEl = document.getElementById('day-list');
const dataContainer = document.getElementById('data-container');

let selectedTopics = new Set(topics);
let selectedDays = new Set(days);

// Инициализация меню
function initMenu() {
    topics.forEach(topic => {
        topicListEl.innerHTML += `
            <li><label><input type="checkbox" value="${topic}" class="topic-cb" checked> ${topic}</label></li>
        `;
    });

    days.forEach(day => {
        dayListEl.innerHTML += `
            <li><label><input type="checkbox" value="${day}" class="day-cb" checked> ${day}</label></li>
        `;
    });

    // Слушатели изменений
    document.querySelectorAll('.topic-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.target.checked ? selectedTopics.add(e.target.value) : selectedTopics.delete(e.target.value);
            renderData();
        });
    });

    document.querySelectorAll('.day-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.target.checked ? selectedDays.add(e.target.value) : selectedDays.delete(e.target.value);
            renderData();
        });
    });
}

// Отрисовка карточек
function renderData() {
    dataContainer.innerHTML = '';
    const filtered = database.filter(item => selectedTopics.has(item.topic) && selectedDays.has(item.day));
    
    filtered.forEach(item => {
        dataContainer.innerHTML += `
            <div class="card">
                <h3>${item.topic} — ${item.day}</h3>
                <p>${item.content}</p>
            </div>
        `;
    });
}

// Форматирование данных для экспорта
function getFormattedData() {
    const filtered = database.filter(item => selectedTopics.has(item.topic) && selectedDays.has(item.day));
    if (filtered.length === 0) return null;

    let text = `\n--- Экспорт от ${new Date().toLocaleDateString()} ---\n\n`;
    filtered.forEach(item => {
        text += `[${item.topic}] ${item.day}:\n${item.content}\n\n`;
    });
    return text;
}

// Скачать как новый файл
document.getElementById('btn-download-new').addEventListener('click', () => {
    const text = getFormattedData();
    if (!text) return alert("Нет данных для скачивания!");

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// Добавить в существующий файл (File System Access API)
document.getElementById('btn-append-file').addEventListener('click', async () => {
    const textToAppend = getFormattedData();
    if (!textToAppend) return alert("Нет данных для скачивания!");

    try {
        // Просим пользователя выбрать файл
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }]
        });

        // Читаем текущее содержимое
        const file = await fileHandle.getFile();
        const currentContent = await file.text();

        // Создаем поток для записи (перезаписываем всё: старое + новое)
        const writable = await fileHandle.createWritable();
        await writable.write(currentContent + textToAppend);
        await writable.close();

        alert("Данные успешно дописаны в файл!");
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            alert("Ваш браузер не поддерживает прямую запись файлов, либо произошла ошибка.");
        }
    }
});

// Запуск
initMenu();
renderData();
