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


// --- УМНЫЙ ЭКСПОРТ И СЛИЯНИЕ (СИНХРОНИЗАЦИЯ) ---
const syncOverlay = document.getElementById('sync-overlay');
document.getElementById('opt-smart-export').addEventListener('click', () => {
    syncOverlay.classList.remove('hidden');
    radialOptions.classList.add('hidden');
});
document.getElementById('sync-close-btn').addEventListener('click', () => syncOverlay.classList.add('hidden'));

// Функция фильтрации данных по параметрам
function getFilteredData() {
    const keyword = document.getElementById('sync-search-input').value.toLowerCase().trim();
    const dateStart = document.getElementById('sync-date-start').value;
    const dateEnd = document.getElementById('sync-date-end').value;
    
    let filtered = {};

    Object.keys(diaryData).forEach(date => {
        // Проверка диапазона дат
        if (dateStart && date < dateStart) return;
        if (dateEnd && date > dateEnd) return;

        const day = diaryData[date];
        let dayHasMatch = false;
        let matchedSubtopics = [];

        // Фильтр по подтемам
        if (day.subtopics) {
            matchedSubtopics = day.subtopics.filter(s => 
                !keyword || s.title.toLowerCase().includes(keyword) || (s.body && s.body.toLowerCase().includes(keyword))
            );
            if (matchedSubtopics.length > 0) dayHasMatch = true;
        }

        if (dayHasMatch) {
            filtered[date] = {
                ...day,
                subtopics: matchedSubtopics
            };
        }
    });

    return filtered;
}

// 1. Скачать отфильтрованное как новый файл
document.getElementById('sync-export-new-btn').addEventListener('click', () => {
    const dataToExport = getFilteredData();
    if (Object.keys(dataToExport).length === 0) {
        alert('Ничего не найдено по этим фильтрам.');
        return;
    }
    const keyword = document.getElementById('sync-search-input').value.trim() || 'filtered';
    downloadFile(JSON.stringify(dataToExport, null, 2), `${keyword}_${formatDateKey(new Date())}.json`);
    syncOverlay.classList.add('hidden');
});

// 2. Влить отфильтрованное в существующий файл
document.getElementById('sync-merge-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const dataToMerge = getFilteredData();
    if (Object.keys(dataToMerge).length === 0) {
        alert('Нет данных для слияния по текущим фильтрам.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            // Читаем старый файл
            let existingData = JSON.parse(event.target.result);
            
            // Вливаем новые отфильтрованные данные
            Object.keys(dataToMerge).forEach(date => {
                if (!existingData[date]) {
                    existingData[date] = dataToMerge[date];
                } else {
                    // Если день уже есть, аккуратно добавляем подтемы, избегая дубликатов по ID
                    const existingSubtopics = existingData[date].subtopics || [];
                    const newSubtopics = dataToMerge[date].subtopics || [];
                    
                    newSubtopics.forEach(newSub => {
                        const idx = existingSubtopics.findIndex(s => s.id === newSub.id);
                        if (idx >= 0) existingSubtopics[idx] = newSub; // Обновляем
                        else existingSubtopics.push(newSub); // Добавляем новую
                    });
                    existingData[date].subtopics = existingSubtopics;
                }
            });

            // Скачиваем обновленный результат
            downloadFile(JSON.stringify(existingData, null, 2), file.name);
            alert('Слияние прошло успешно! Обновленный файл скачан.');
            syncOverlay.classList.add('hidden');
        } catch (err) {
            alert('Ошибка чтения структуры старого файла!');
        }
        e.target.value = ''; // Сбрасываем input
    };
    reader.readAsText(file);
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
