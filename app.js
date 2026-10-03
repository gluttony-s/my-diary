// --- ИНИЦИАЛИЗАЦИЯ И ДАННЫЕ ---
let currentDate = new Date();
let diaryData = JSON.parse(localStorage.getItem('diaryData')) || {};

// DOM Элементы
const monthTitle = document.getElementById('month-title');
const weekDaysContainer = document.getElementById('week-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const calendarPicker = document.getElementById('calendar-picker');

const mainNoteInput = document.getElementById('main-note-input');
const subtopicsContainer = document.getElementById('subtopics-container');
const todoList = document.getElementById('todo-list');
const todosCounter = document.getElementById('todos-counter');
const photoList = document.getElementById('photo-list');
const photoInput = document.getElementById('photo-input');

// Модальные окна
const modalOverlay = document.getElementById('modal-overlay');
const taskOverlay = document.getElementById('task-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');

let editingSubtopicId = null;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initDayData(dateKey) {
    if (!diaryData[dateKey]) {
        diaryData[dateKey] = { mainNote: '', mood: null, subtopics: [], todos: [], photos: [] };
    }
}

function saveToStorage() {
    localStorage.setItem('diaryData', JSON.stringify(diaryData));
}

// --- РЕНДЕР КАЛЕНДАРЯ И ДНЯ ---
function renderWeek() {
    weekDaysContainer.innerHTML = '';
    const dayOfWeek = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - dayOfWeek);

    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    monthTitle.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateKey = formatDateKey(d);
        const isSelected = formatDateKey(currentDate) === dateKey;
        const hasData = diaryData[dateKey] && 
            (diaryData[dateKey].mainNote || (diaryData[dateKey].subtopics && diaryData[dateKey].subtopics.length > 0) || (diaryData[dateKey].todos && diaryData[dateKey].todos.length > 0));

        const dayEl = document.createElement('div');
        dayEl.className = `day-cell ${isSelected ? 'selected' : ''} ${hasData ? 'has-note' : ''}`;
        dayEl.innerHTML = `
            <span class="day-name">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</span>
            <span class="day-num">${d.getDate()}</span>
        `;
        dayEl.addEventListener('click', () => { currentDate = d; loadDay(); });
        weekDaysContainer.appendChild(dayEl);
    }
}

function loadDay() {
    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);
    const dayData = diaryData[dateKey];

    selectedDateTitle.textContent = currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    mainNoteInput.value = dayData.mainNote || '';
    
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === dayData.mood);
    });

    renderWeek();
    renderSubtopics();
    renderTodos();
    renderPhotos();
}

// Слушатели главной заметки и настроения
mainNoteInput.addEventListener('input', () => {
    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);
    diaryData[dateKey].mainNote = mainNoteInput.value;
    saveToStorage();
    renderWeek();
});

document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const dateKey = formatDateKey(currentDate);
        initDayData(dateKey);
        diaryData[dateKey].mood = diaryData[dateKey].mood === btn.dataset.mood ? null : btn.dataset.mood;
        saveToStorage();
        loadDay();
    });
});

// Навигация
document.getElementById('prev-week').addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 7); loadDay(); });
document.getElementById('next-week').addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); loadDay(); });
calendarPicker.addEventListener('change', (e) => {
    if (e.target.value) { currentDate = new Date(e.target.value); loadDay(); }
});

// Свайпы
let touchStartX = 0, touchEndX = 0;
const swipeArea = document.getElementById('swipe-area');
swipeArea.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, false);
swipeArea.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) { currentDate.setDate(currentDate.getDate() + 1); loadDay(); }
    if (touchEndX > touchStartX + 50) { currentDate.setDate(currentDate.getDate() - 1); loadDay(); }
}, false);

// --- ПОДТЕМЫ ---
function renderSubtopics() {
    subtopicsContainer.innerHTML = '';
    const dateKey = formatDateKey(currentDate);
    const subtopics = diaryData[dateKey].subtopics || [];

    subtopics.forEach(subtopic => {
        const card = document.createElement('div');
        card.className = 'subtopic-card';
        card.innerHTML = `
            <div class="subtopic-header">
                <span class="subtopic-title">${escapeHtml(subtopic.title)}</span>
                <div class="subtopic-actions">
                    <button class="quick-btn edit-subtopic-btn">✏️</button>
                    <button class="quick-btn copy-subtopic-btn">📋</button>
                    <button class="quick-btn del-subtopic-btn">✕</button>
                </div>
            </div>
            ${subtopic.body ? `<div class="subtopic-body-preview">${escapeHtml(subtopic.body)}</div>` : ''}
        `;

        card.querySelector('.edit-subtopic-btn').addEventListener('click', () => openSubtopicModal(subtopic));
        card.querySelector('.copy-subtopic-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(`${subtopic.title}\n\n${subtopic.body || ''}`);
            alert('Скопировано!');
        });
        card.querySelector('.del-subtopic-btn').addEventListener('click', () => {
            if (confirm('Точно удалить подтему?')) {
                diaryData[dateKey].subtopics = diaryData[dateKey].subtopics.filter(s => s.id !== subtopic.id);
                saveToStorage(); loadDay();
            }
        });
        subtopicsContainer.appendChild(card);
    });
}

function openSubtopicModal(subtopic = null) {
    if (subtopic) {
        editingSubtopicId = subtopic.id;
        modalTitle.textContent = "Редактировать подтему";
        modalInputTitle.value = subtopic.title;
        modalInputBody.value = subtopic.body || '';
    } else {
        editingSubtopicId = null;
        modalTitle.textContent = "Новая подтема";
        modalInputTitle.value = '';
        modalInputBody.value = '';
    }
    modalOverlay.classList.remove('hidden');
}

// --- ЗАДАЧИ ---
function renderTodos() {
    todoList.innerHTML = '';
    const dateKey = formatDateKey(currentDate);
    const todos = diaryData[dateKey].todos || [];
    let completedCount = 0;

    todos.forEach(todo => {
        if (todo.done) completedCount++;
        const item = document.createElement('div');
        item.className = `todo-item ${todo.done ? 'done' : ''}`;
        item.innerHTML = `
            <div class="custom-checkbox ${todo.done ? 'checked' : ''}"></div>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            ${todo.alarmTime ? `<span class="todo-alarm-badge">⏰ ${todo.alarmTime}</span>` : ''}
            <button class="del-btn">✕</button>
        `;

        item.querySelector('.custom-checkbox').addEventListener('click', () => {
            todo.done = !todo.done; saveToStorage(); loadDay();
        });
        item.querySelector('.del-btn').addEventListener('click', () => {
            if (confirm('Удалить задачу?')) {
                diaryData[dateKey].todos = diaryData[dateKey].todos.filter(t => t.id !== todo.id);
                saveToStorage(); loadDay();
            }
        });
        todoList.appendChild(item);
    });
    todosCounter.textContent = `${completedCount}/${todos.length}`;
}

// Будильники
setInterval(() => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayKey = formatDateKey(now);
    if (diaryData[todayKey] && diaryData[todayKey].todos) {
        diaryData[todayKey].todos.forEach(todo => {
            if (todo.alarmTime === currentTimeStr && !todo.alarmFired && !todo.done) {
                alert(`⏰ НАПОМИНАНИЕ О ЗАДАЧЕ:\n\n${todo.text}`);
                todo.alarmFired = true; saveToStorage();
            }
        });
    }
}, 10000);

// --- ФОТОГРАФИИ ---
function renderPhotos() {
    photoList.innerHTML = '';
    const dateKey = formatDateKey(currentDate);
    const photos = diaryData[dateKey].photos || [];

    photos.forEach(photoSrc => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = `<img src="${photoSrc}" alt="photo"><button class="del-photo-btn">✕</button>`;
        card.querySelector('.del-photo-btn').addEventListener('click', () => {
            if (confirm('Удалить фото?')) {
                diaryData[dateKey].photos = diaryData[dateKey].photos.filter(p => p !== photoSrc);
                saveToStorage(); loadDay();
            }
        });
        photoList.appendChild(card);
    });
}

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dateKey = formatDateKey(currentDate);
            initDayData(dateKey);
            diaryData[dateKey].photos.push(event.target.result);
            saveToStorage(); loadDay();
        };
        reader.readAsDataURL(file);
    }
});

// --- СОБЫТИЯ ЦЕНТРАЛЬНЫХ КНОПОК ---
document.getElementById('opt-add-topic').addEventListener('click', () => openSubtopicModal());
document.getElementById('opt-add-task').addEventListener('click', () => {
    document.getElementById('task-input-text').value = '';
    document.getElementById('task-input-time').value = '';
    taskOverlay.classList.remove('hidden');
});

// Сохранение подтемы
document.getElementById('modal-save-btn').addEventListener('click', () => {
    const title = modalInputTitle.value.trim();
    if (!title) return;
    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);

    if (editingSubtopicId) {
        const target = diaryData[dateKey].subtopics.find(s => s.id === editingSubtopicId);
        if (target) { target.title = title; target.body = modalInputBody.value; }
    } else {
        diaryData[dateKey].subtopics.push({ id: Date.now(), title: title, body: modalInputBody.value });
    }
    saveToStorage(); modalOverlay.classList.add('hidden'); loadDay();
});

const closeModal = () => modalOverlay.classList.add('hidden');
document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
document.getElementById('modal-cancel-top-btn').addEventListener('click', closeModal);

// Сохранение задачи
document.getElementById('task-save-btn').addEventListener('click', () => {
    const text = document.getElementById('task-input-text').value.trim();
    if (!text) return;
    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);
    diaryData[dateKey].todos.push({
        id: Date.now(), text: text, done: false, alarmTime: document.getElementById('task-input-time').value || null
    });
    saveToStorage(); taskOverlay.classList.add('hidden'); loadDay();
});

const closeTaskModal = () => taskOverlay.classList.add('hidden');
document.getElementById('task-cancel-btn').addEventListener('click', closeTaskModal);
document.getElementById('task-cancel-top-btn').addEventListener('click', closeTaskModal);


// --- БАЗОВЫЙ ЭКСПОРТ / ИМПОРТ ---
const radialToggleBtn = document.getElementById('radial-toggle-btn');
const radialOptions = document.getElementById('radial-options');
radialToggleBtn.addEventListener('click', () => radialOptions.classList.toggle('hidden'));

document.getElementById('opt-export').addEventListener('click', () => {
    downloadFile(JSON.stringify(diaryData, null, 2), `diary_full_${formatDateKey(new Date())}.json`);
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                diaryData = JSON.parse(event.target.result);
                saveToStorage(); loadDay(); alert('Данные восстановлены!');
            } catch (err) { alert('Ошибка чтения файла!'); }
        };
        reader.readAsText(file);
    }
});


// --- УМНЫЙ ПОИСК / ВЫБОР / СЛИЯНИЕ ---
const syncOverlay = document.getElementById('sync-overlay');
const syncSearchInput = document.getElementById('sync-search-input');
const syncDateStart = document.getElementById('sync-date-start');
const syncDateEnd = document.getElementById('sync-date-end');
const syncResults = document.getElementById('sync-results');
const syncResultsCount = document.getElementById('sync-results-count');
const syncSelectedCount = document.getElementById('sync-selected-count');
const syncNewCount = document.getElementById('sync-new-count');
const syncMergeInput = document.getElementById('sync-merge-input');
const syncFileName = document.getElementById('sync-file-name');
const syncMergeSelectedBtn = document.getElementById('sync-merge-selected-btn');

let syncTargetData = null;
let syncTargetFileName = '';
let syncSelectedItems = new Set();

function normalizeSyncText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeSyncItemKey(date, type, id) {
    return `${date}|${type}|${String(id)}`;
}

function getSyncItems() {
    const keyword = syncSearchInput.value.toLowerCase().trim();
    const dateStart = syncDateStart.value;
    const dateEnd = syncDateEnd.value;
    const items = [];

    Object.keys(diaryData).forEach(date => {
        if (dateStart && date < dateStart) return;
        if (dateEnd && date > dateEnd) return;

        const day = diaryData[date] || {};

        // Ищем одновременно по подтемам и задачам.
        (day.subtopics || []).forEach(subtopic => {
            const title = String(subtopic.title || '');
            const body = String(subtopic.body || '');

            if (
                !keyword ||
                title.toLowerCase().includes(keyword) ||
                body.toLowerCase().includes(keyword)
            ) {
                items.push({
                    key: makeSyncItemKey(date, 'subtopic', subtopic.id),
                    date,
                    type: 'subtopic',
                    id: subtopic.id,
                    title: title || 'Без названия',
                    preview: body,
                    data: { ...subtopic }
                });
            }
        });

        (day.todos || []).forEach(todo => {
            const title = String(todo.text || '');

            if (!keyword || title.toLowerCase().includes(keyword)) {
                items.push({
                    key: makeSyncItemKey(date, 'todo', todo.id),
                    date,
                    type: 'todo',
                    id: todo.id,
                    title: title || 'Без названия',
                    preview: todo.alarmTime ? `Будильник: ${todo.alarmTime}` : '',
                    data: { ...todo }
                });
            }
        });
    });

    items.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.title.localeCompare(b.title, 'ru');
    });

    return items.slice(0, 300);
}

function getTargetCollection(item) {
    if (!syncTargetData || !syncTargetData[item.date]) return [];

    const name = item.type === 'subtopic' ? 'subtopics' : 'todos';
    return syncTargetData[item.date][name] || [];
}

function isSyncItemInTarget(item) {
    const collection = getTargetCollection(item);

    if (collection.some(entry => String(entry.id) === String(item.id))) {
        return true;
    }

    // Если ID разный, считаем совпадением одинаковое название
    // в ту же дату и в той же категории.
    const sourceText = normalizeSyncText(
        item.type === 'subtopic' ? item.data.title : item.data.text
    );

    return collection.some(entry => normalizeSyncText(
        item.type === 'subtopic' ? entry.title : entry.text
    ) === sourceText);
}

function getVisibleSelectedSyncItems() {
    return getSyncItems().filter(item => syncSelectedItems.has(item.key));
}

function renderSyncResults() {
    const items = getSyncItems();
    syncResults.innerHTML = '';

    let newCount = 0;

    items.forEach(item => {
        const inTarget = isSyncItemInTarget(item);
        const selected = syncSelectedItems.has(item.key);

        if (!inTarget) newCount++;

        const row = document.createElement('button');
        row.type = 'button';
        row.className = `sync-result-item ${selected ? 'selected' : ''} ${inTarget ? 'in-file' : 'new-item'}`;
        row.setAttribute('aria-pressed', String(selected));

        const checkbox = document.createElement('span');
        checkbox.className = `sync-result-checkbox ${selected ? 'checked' : ''}`;
        checkbox.textContent = selected ? '✓' : '';

        const main = document.createElement('span');
        main.className = 'sync-result-main';

        const title = document.createElement('span');
        title.className = 'sync-result-title';
        title.textContent = item.title;

        const meta = document.createElement('span');
        meta.className = 'sync-result-meta';
        meta.textContent =
            `${item.date} • ${item.type === 'subtopic' ? 'Подтема' : 'Задача'}` +
            (item.preview ? ` • ${item.preview}` : '');

        main.appendChild(title);
        main.appendChild(meta);

        const badge = document.createElement('span');
        badge.className = `sync-result-badge ${inTarget ? 'exists' : 'missing'}`;
        badge.textContent = inTarget ? 'В файле' : 'Нет в файле';

        row.appendChild(checkbox);
        row.appendChild(main);
        row.appendChild(badge);

        row.addEventListener('click', () => {
            if (syncSelectedItems.has(item.key)) {
                syncSelectedItems.delete(item.key);
            } else {
                syncSelectedItems.add(item.key);
            }
            renderSyncResults();
        });

        syncResults.appendChild(row);
    });

    syncResultsCount.textContent = `Найдено: ${items.length}`;
    syncSelectedCount.textContent = `Выбрано: ${syncSelectedItems.size}`;
    syncNewCount.textContent = `Новых: ${newCount}`;
    syncMergeSelectedBtn.disabled =
        !syncTargetData || syncSelectedItems.size === 0;

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sync-empty';
        empty.textContent = 'Ничего не найдено. Попробуйте другой запрос.';
        syncResults.appendChild(empty);
    }
}

function buildSelectedData(items) {
    const selectedData = {};

    items.forEach(item => {
        if (!selectedData[item.date]) {
            selectedData[item.date] = {
                mainNote: '',
                mood: null,
                subtopics: [],
                todos: [],
                photos: []
            };
        }

        if (item.type === 'subtopic') {
            selectedData[item.date].subtopics.push({ ...item.data });
        } else {
            selectedData[item.date].todos.push({ ...item.data });
        }
    });

    return selectedData;
}

function mergeSelectedItemsIntoTarget(items) {
    if (!syncTargetData) {
        throw new Error('Файл для добавления не выбран.');
    }

    items.forEach(item => {
        if (!syncTargetData[item.date]) {
            syncTargetData[item.date] = {
                mainNote: '',
                mood: null,
                subtopics: [],
                todos: [],
                photos: []
            };
        }

        const collectionName = item.type === 'subtopic' ? 'subtopics' : 'todos';
        const collection = syncTargetData[item.date][collectionName] || [];

        const sameIdIndex = collection.findIndex(
            entry => String(entry.id) === String(item.id)
        );

        if (sameIdIndex >= 0) {
            collection[sameIdIndex] = { ...item.data };
        } else {
            const sourceText = normalizeSyncText(
                item.type === 'subtopic' ? item.data.title : item.data.text
            );

            const sameTextIndex = collection.findIndex(entry =>
                normalizeSyncText(
                    item.type === 'subtopic' ? entry.title : entry.text
                ) === sourceText
            );

            if (sameTextIndex >= 0) {
                collection[sameTextIndex] = { ...item.data };
            } else {
                collection.push({ ...item.data });
            }
        }

        syncTargetData[item.date][collectionName] = collection;
    });
}

document.getElementById('opt-smart-export').addEventListener('click', () => {
    syncSelectedItems.clear();
    syncOverlay.classList.remove('hidden');
    radialOptions.classList.add('hidden');
    renderSyncResults();
    syncSearchInput.focus();
});

document.getElementById('sync-close-btn').addEventListener('click', () => {
    syncOverlay.classList.add('hidden');
});

[syncSearchInput, syncDateStart, syncDateEnd].forEach(input => {
    input.addEventListener('input', renderSyncResults);
    input.addEventListener('change', renderSyncResults);
});

syncMergeInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target.result);

            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Некорректная структура');
            }

            syncTargetData = parsed;
            syncTargetFileName = file.name;
            syncFileName.textContent = `Выбран: ${file.name}`;
            syncFileName.title = file.name;

            renderSyncResults();
        } catch (err) {
            syncTargetData = null;
            syncTargetFileName = '';
            syncFileName.textContent = 'Не удалось прочитать JSON';
            alert('Ошибка: файл не является корректным JSON дневника.');
            e.target.value = '';
            renderSyncResults();
        }
    };

    reader.readAsText(file);
});

document.getElementById('sync-export-new-btn').addEventListener('click', () => {
    const selected = getVisibleSelectedSyncItems();

    if (selected.length === 0) {
        alert('Сначала выберите записи в списке.');
        return;
    }

    const dataToExport = buildSelectedData(selected);
    const keyword =
        syncSearchInput.value.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'selected';

    downloadFile(
        JSON.stringify(dataToExport, null, 2),
        `${keyword}_${formatDateKey(new Date())}.json`
    );
});

syncMergeSelectedBtn.addEventListener('click', () => {
    if (!syncTargetData) {
        alert('Сначала выберите существующий JSON-файл.');
        return;
    }

    const selected = getVisibleSelectedSyncItems();

    if (selected.length === 0) {
        alert('Сначала выберите записи, которые нужно добавить.');
        return;
    }

    // Добавляем только записи, которых ещё нет в целевом файле.
    const newItems = selected.filter(item => !isSyncItemInTarget(item));

    if (newItems.length === 0) {
        alert('Среди выбранных записей нет новых для этого файла.');
        return;
    }

    mergeSelectedItemsIntoTarget(newItems);

    downloadFile(
        JSON.stringify(syncTargetData, null, 2),
        syncTargetFileName || `diary_merged_${formatDateKey(new Date())}.json`
    );

    alert(`Добавлено новых записей: ${newItems.length}. Обновлённый файл скачан.`);
    renderSyncResults();
});

function downloadFile(content, fileName) {
    const a = document.createElement('a');
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

// Запуск
loadDay();
