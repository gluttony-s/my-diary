// --- ИНИЦИАЛИЗАЦИЯ И ДАННЫЕ ---
let currentDate = new Date();
let diaryData = JSON.parse(localStorage.getItem('diaryData')) || {};

const GLOBAL_KEY = '_global';
const GLOBAL_COLLAPSED_KEY = 'globalCollapsed';
const DAY_TODOS_COLLAPSED_KEY = 'dayTodosCollapsed';
const GLOBAL_TODOS_COLLAPSED_KEY = 'globalTodosCollapsed';
const PHOTOS_COLLAPSED_KEY = 'photosCollapsed';
const COLLAPSED_SUBTOPICS_KEY = 'collapsedSubtopicIds';

// DOM Элементы
const monthTitle = document.getElementById('month-title');
const weekDaysContainer = document.getElementById('week-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const calendarPicker = document.getElementById('calendar-picker');

const mainNoteInput = document.getElementById('main-note-input');
const subtopicsContainer = document.getElementById('subtopics-container');
const todoList = document.getElementById('todo-list');
const todosCounter = document.getElementById('todos-counter');
const dayTodosSection = document.getElementById('day-todos-section');
const dayTodosContent = document.getElementById('day-todos-content');
const dayTodosToggleBtn = document.getElementById('day-todos-toggle-btn');

const photosSection = document.getElementById('photos-section');
const photosContent = document.getElementById('photos-content');
const photosToggleBtn = document.getElementById('photos-toggle-btn');
const photoList = document.getElementById('photo-list');
const photoInput = document.getElementById('photo-input');

const globalSubtopicsContainer = document.getElementById('global-subtopics-container');
const globalTodoList = document.getElementById('global-todo-list');
const globalTodosCounter = document.getElementById('global-todos-counter');
const globalTodosSection = document.getElementById('global-todos-section');
const globalTodosContent = document.getElementById('global-todos-content');
const globalTodosToggleBtn = document.getElementById('global-todos-toggle-btn');
const globalToggleBtn = document.getElementById('global-toggle-btn');
const globalContent = document.getElementById('global-content');

// Модальные окна
const modalOverlay = document.getElementById('modal-overlay');
const taskOverlay = document.getElementById('task-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');

let editingSubtopicId = null;
let modalScope = 'day';
let taskScope = 'day';

// Состояние сворачивания
let collapsedSubtopicIds = new Set(
    JSON.parse(localStorage.getItem(COLLAPSED_SUBTOPICS_KEY) || '[]')
);

function saveCollapsedSubtopicIds() {
    localStorage.setItem(COLLAPSED_SUBTOPICS_KEY, JSON.stringify([...collapsedSubtopicIds]));
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initDayData(dateKey) {
    if (!diaryData[dateKey]) {
        diaryData[dateKey] = { mainNote: '', mood: null, subtopics: [], todos: [], photos: [] };
    }
    if (!Array.isArray(diaryData[dateKey].subtopics)) diaryData[dateKey].subtopics = [];
    if (!Array.isArray(diaryData[dateKey].todos)) diaryData[dateKey].todos = [];
    if (!Array.isArray(diaryData[dateKey].photos)) diaryData[dateKey].photos = [];
}

function saveToStorage() {
    localStorage.setItem('diaryData', JSON.stringify(diaryData));
}

function hasPendingTodos(dateKey) {
    const day = diaryData[dateKey];
    if (!day || !Array.isArray(day.todos)) return false;
    return day.todos.some(t => !t.done);
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
        const day = diaryData[dateKey];
        const hasData = day &&
            (day.mainNote ||
             (day.subtopics && day.subtopics.length > 0) ||
             (day.todos && day.todos.length > 0));
        const pending = hasPendingTodos(dateKey);

        const classes = ['day-cell'];
        if (isSelected) classes.push('selected');
        if (hasData) classes.push('has-note');
        if (pending) classes.push('has-pending');

        const dayEl = document.createElement('div');
        dayEl.className = classes.join(' ');
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
    renderGlobalSubtopics();
    renderGlobalTodos();
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

// Навигация по неделям — с автопереходом на понедельник
function shiftWeek(delta) {
    currentDate.setDate(currentDate.getDate() + delta * 7);
    const dow = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
    currentDate.setDate(currentDate.getDate() - dow);
    loadDay();
}

document.getElementById('prev-week').addEventListener('click', () => shiftWeek(-1));
document.getElementById('next-week').addEventListener('click', () => shiftWeek(1));

calendarPicker.addEventListener('change', (e) => {
    if (e.target.value) { currentDate = new Date(e.target.value); loadDay(); }
});

// Свайпы — по одному дню
let touchStartX = 0, touchEndX = 0;
const swipeArea = document.getElementById('swipe-area');
swipeArea.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, false);
swipeArea.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) { currentDate.setDate(currentDate.getDate() + 1); loadDay(); }
    if (touchEndX > touchStartX + 50) { currentDate.setDate(currentDate.getDate() - 1); loadDay(); }
}, false);

// --- СВОРАЧИВАНИЕ СЕКЦИЙ ---

// Глобальный блок
let globalCollapsed = localStorage.getItem(GLOBAL_COLLAPSED_KEY) === '1';
function applyGlobalCollapsed() {
    globalContent.classList.toggle('hidden', globalCollapsed);
    globalToggleBtn.textContent = globalCollapsed ? '▸' : '▾';
    globalToggleBtn.setAttribute('aria-expanded', String(!globalCollapsed));
    globalToggleBtn.title = globalCollapsed ? 'Развернуть' : 'Свернуть';
    const title = globalToggleBtn.closest('.section-title');
    if (title) title.classList.toggle('collapsed', globalCollapsed);
}
globalToggleBtn.addEventListener('click', () => {
    globalCollapsed = !globalCollapsed;
    localStorage.setItem(GLOBAL_COLLAPSED_KEY, globalCollapsed ? '1' : '0');
    applyGlobalCollapsed();
});
applyGlobalCollapsed();

// Дневные задачи
let dayTodosCollapsed = localStorage.getItem(DAY_TODOS_COLLAPSED_KEY) === '1';
function applyDayTodosCollapsed() {
    dayTodosContent.classList.toggle('hidden', dayTodosCollapsed);
    dayTodosToggleBtn.textContent = dayTodosCollapsed ? '▸' : '▾';
    dayTodosToggleBtn.setAttribute('aria-expanded', String(!dayTodosCollapsed));
    dayTodosToggleBtn.title = dayTodosCollapsed ? 'Развернуть' : 'Свернуть';
    const title = dayTodosSection.querySelector('.section-title');
    if (title) title.classList.toggle('collapsed', dayTodosCollapsed);
}
dayTodosToggleBtn.addEventListener('click', () => {
    dayTodosCollapsed = !dayTodosCollapsed;
    localStorage.setItem(DAY_TODOS_COLLAPSED_KEY, dayTodosCollapsed ? '1' : '0');
    applyDayTodosCollapsed();
});
applyDayTodosCollapsed();

// Глобальные задачи
let globalTodosCollapsed = localStorage.getItem(GLOBAL_TODOS_COLLAPSED_KEY) === '1';
function applyGlobalTodosCollapsed() {
    globalTodosContent.classList.toggle('hidden', globalTodosCollapsed);
    globalTodosToggleBtn.textContent = globalTodosCollapsed ? '▸' : '▾';
    globalTodosToggleBtn.setAttribute('aria-expanded', String(!globalTodosCollapsed));
    globalTodosToggleBtn.title = globalTodosCollapsed ? 'Развернуть' : 'Свернуть';
    const title = globalTodosSection.querySelector('.section-title');
    if (title) title.classList.toggle('collapsed', globalTodosCollapsed);
}
globalTodosToggleBtn.addEventListener('click', () => {
    globalTodosCollapsed = !globalTodosCollapsed;
    localStorage.setItem(GLOBAL_TODOS_COLLAPSED_KEY, globalTodosCollapsed ? '1' : '0');
    applyGlobalTodosCollapsed();
});
applyGlobalTodosCollapsed();

// Фотографии
let photosCollapsed = localStorage.getItem(PHOTOS_COLLAPSED_KEY) === '1';
function applyPhotosCollapsed() {
    photosContent.classList.toggle('hidden', photosCollapsed);
    photosToggleBtn.textContent = photosCollapsed ? '▸' : '▾';
    photosToggleBtn.setAttribute('aria-expanded', String(!photosCollapsed));
    photosToggleBtn.title = photosCollapsed ? 'Развернуть' : 'Свернуть';
    const title = photosSection.querySelector('.section-title');
    if (title) title.classList.toggle('collapsed', photosCollapsed);
}
photosToggleBtn.addEventListener('click', () => {
    photosCollapsed = !photosCollapsed;
    localStorage.setItem(PHOTOS_COLLAPSED_KEY, photosCollapsed ? '1' : '0');
    applyPhotosCollapsed();
});
applyPhotosCollapsed();

// --- ПОДТЕМЫ ---
function renderSubtopicList(container, dateKey) {
    container.innerHTML = '';
    initDayData(dateKey);
    const subtopics = diaryData[dateKey].subtopics || [];

    subtopics.forEach(subtopic => {
        const isCollapsed = collapsedSubtopicIds.has(subtopic.id);
        const card = document.createElement('div');
        card.className = `subtopic-card ${isCollapsed ? 'collapsed' : ''}`;

        card.innerHTML = `
            <div class="subtopic-header">
                <button class="quick-btn toggle-subtopic-btn" aria-label="Свернуть/развернуть">${isCollapsed ? '▸' : '▾'}</button>
                <span class="subtopic-title" role="button" tabindex="0">${escapeHtml(subtopic.title)}</span>
                <div class="subtopic-actions">
                    <button class="quick-btn edit-subtopic-btn">✏️</button>
                    <button class="quick-btn copy-subtopic-btn">📋</button>
                    <button class="quick-btn del-subtopic-btn">✕</button>
                </div>
            </div>
            ${subtopic.body ? `<div class="subtopic-body-preview">${escapeHtml(subtopic.body)}</div>` : ''}
        `;

        const scope = dateKey === GLOBAL_KEY ? 'global' : 'day';

        const toggleFn = () => {
            if (collapsedSubtopicIds.has(subtopic.id)) {
                collapsedSubtopicIds.delete(subtopic.id);
            } else {
                collapsedSubtopicIds.add(subtopic.id);
            }
            saveCollapsedSubtopicIds();
            loadDay();
        };

        card.querySelector('.toggle-subtopic-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFn();
        });
        card.querySelector('.subtopic-title').addEventListener('click', toggleFn);
        card.querySelector('.edit-subtopic-btn').addEventListener('click', () => openSubtopicModal(subtopic, scope));
        card.querySelector('.copy-subtopic-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(`${subtopic.title}\n\n${subtopic.body || ''}`);
            alert('Скопировано!');
        });
        card.querySelector('.del-subtopic-btn').addEventListener('click', () => {
            if (confirm('Точно удалить подтему?')) {
                diaryData[dateKey].subtopics = diaryData[dateKey].subtopics.filter(s => s.id !== subtopic.id);
                collapsedSubtopicIds.delete(subtopic.id);
                saveCollapsedSubtopicIds();
                saveToStorage(); loadDay();
            }
        });
        container.appendChild(card);
    });
}

function renderSubtopics() {
    renderSubtopicList(subtopicsContainer, formatDateKey(currentDate));
}

function renderGlobalSubtopics() {
    renderSubtopicList(globalSubtopicsContainer, GLOBAL_KEY);
}

function openSubtopicModal(subtopic = null, scope = 'day') {
    modalScope = scope;
    if (subtopic) {
        editingSubtopicId = subtopic.id;
        modalTitle.textContent = scope === 'global' ? "Редактировать глобальную подтему" : "Редактировать подтему";
        modalInputTitle.value = subtopic.title;
        modalInputBody.value = subtopic.body || '';
    } else {
        editingSubtopicId = null;
        modalTitle.textContent = scope === 'global' ? "Новая глобальная подтема" : "Новая подтема";
        modalInputTitle.value = '';
        modalInputBody.value = '';
    }
    modalOverlay.classList.remove('hidden');
}

// --- ЗАДАЧИ ---
function renderTodoList(container, counterEl, sectionEl, dateKey) {
    container.innerHTML = '';
    initDayData(dateKey);
    const todos = diaryData[dateKey].todos || [];
    let completedCount = 0;

    if (sectionEl) {
        sectionEl.classList.toggle('hidden', todos.length === 0);
    }

    // Обновляем класс "collapsed" у заголовка в зависимости от фактического состояния
    if (sectionEl) {
        const title = sectionEl.querySelector('.section-title');
        const isCollapsed = sectionEl === dayTodosSection ? dayTodosCollapsed : globalTodosCollapsed;
        if (title) title.classList.toggle('collapsed', todos.length > 0 && isCollapsed);
    }

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
        container.appendChild(item);
    });
    if (counterEl) counterEl.textContent = `${completedCount}/${todos.length}`;
}

function renderTodos() {
    renderTodoList(todoList, todosCounter, dayTodosSection, formatDateKey(currentDate));
}

function renderGlobalTodos() {
    renderTodoList(globalTodoList, globalTodosCounter, globalTodosSection, GLOBAL_KEY);
}

// Будильники — срабатывают один раз в сутки на задачу
setInterval(() => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayKey = formatDateKey(now);

    const checkTodos = (todos) => {
        (todos || []).forEach(todo => {
            if (todo.alarmTime === currentTimeStr && !todo.done) {
                const firedKey = `alarmFired_${todayKey}`;
                if (!todo[firedKey]) {
                    alert(`⏰ НАПОМИНАНИЕ О ЗАДАЧЕ:\n\n${todo.text}`);
                    todo[firedKey] = true;
                    saveToStorage();
                }
            }
        });
    };

    if (diaryData[todayKey]) checkTodos(diaryData[todayKey].todos);
    if (diaryData[GLOBAL_KEY]) checkTodos(diaryData[GLOBAL_KEY].todos);
}, 10000);

// --- ФОТОГРАФИИ ---
function renderPhotos() {
    photoList.innerHTML = '';
    const dateKey = formatDateKey(currentDate);
    const photos = diaryData[dateKey].photos || [];

    // Кнопку сворачивания показываем только когда есть фото
    if (photosToggleBtn) {
        photosToggleBtn.classList.toggle('hidden', photos.length === 0);
    }

    // Если фото нет — контент всегда виден (сворачивать пустое нечего).
    // Если фото есть — применяем сохранённое состояние.
    if (photos.length === 0) {
        photosContent.classList.remove('hidden');
    } else {
        photosContent.classList.toggle('hidden', photosCollapsed);
    }

    // Обновляем класс у заголовка, чтобы отступы были симметричны
    const title = photosSection.querySelector('.section-title');
    if (title) {
        title.classList.toggle('collapsed', photos.length > 0 && photosCollapsed);
    }

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

// --- КНОПКИ ДОБАВЛЕНИЯ ---
document.getElementById('opt-add-topic').addEventListener('click', () => openSubtopicModal(null, 'day'));
document.getElementById('opt-add-global-topic').addEventListener('click', () => openSubtopicModal(null, 'global'));

document.getElementById('opt-add-task').addEventListener('click', () => {
    taskScope = 'day';
    document.getElementById('task-input-text').value = '';
    document.getElementById('task-input-time').value = '';
    taskOverlay.classList.remove('hidden');
});

document.getElementById('opt-add-global-task').addEventListener('click', () => {
    taskScope = 'global';
    document.getElementById('task-input-text').value = '';
    document.getElementById('task-input-time').value = '';
    taskOverlay.classList.remove('hidden');
});

// Сохранение подтемы
document.getElementById('modal-save-btn').addEventListener('click', () => {
    const title = modalInputTitle.value.trim();
    if (!title) return;
    const dateKey = modalScope === 'global' ? GLOBAL_KEY : formatDateKey(currentDate);
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
    const dateKey = taskScope === 'global' ? GLOBAL_KEY : formatDateKey(currentDate);
    initDayData(dateKey);
    diaryData[dateKey].todos.push({
        id: Date.now(), text: text, done: false,
        alarmTime: document.getElementById('task-input-time').value || null
    });
    saveToStorage(); taskOverlay.classList.add('hidden'); loadDay();
});

const closeTaskModal = () => taskOverlay.classList.add('hidden');
document.getElementById('task-cancel-btn').addEventListener('click', closeTaskModal);
document.getElementById('task-cancel-top-btn').addEventListener('click', closeTaskModal);

// --- ЭКСПОРТ / ИМПОРТ ---
const radialToggleBtn = document.getElementById('radial-toggle-btn');
const radialOptions = document.getElementById('radial-options');
radialToggleBtn.addEventListener('click', () => radialOptions.classList.toggle('hidden'));

document.getElementById('opt-export').addEventListener('click', () => {
    downloadFile(
        JSON.stringify(diaryData, null, 2),
        `diary_full_${formatDateKey(new Date())}.json`
    );
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
const syncTypeFilter = document.getElementById('sync-type-filter');
const syncResults = document.getElementById('sync-results');
const syncGroups = document.getElementById('sync-groups');
const syncExistingResults = document.getElementById('sync-existing-results');
const syncNewResults = document.getElementById('sync-new-results');
const syncExistingCount = document.getElementById('sync-existing-count');
const syncNewListCount = document.getElementById('sync-new-list-count');
const syncSelectExistingBtn = document.getElementById('sync-select-existing-btn');
const syncSelectNewBtn = document.getElementById('sync-select-new-btn');
const syncResultsCount = document.getElementById('sync-results-count');
const syncSelectedCount = document.getElementById('sync-selected-count');
const syncNewCount = document.getElementById('sync-new-count');
const syncMergeInput = document.getElementById('sync-merge-input');
const syncFileName = document.getElementById('sync-file-name');
const syncMergeSelectedBtn = document.getElementById('sync-merge-selected-btn');
const syncMergeAllNewBtn = document.getElementById('sync-merge-all-new-btn');

let syncTargetData = null;
let syncTargetFileName = '';
let syncSelectedItems = new Set();

function normalizeSyncText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeSyncItemKey(date, type, id) {
    return `${date}|${type}|${String(id)}`;
}

function formatSyncDateLabel(date) {
    return date === GLOBAL_KEY ? '🌐 Глобально' : date;
}

function getSyncItems() {
    const keyword = syncSearchInput.value.toLowerCase().trim();
    const dateStart = syncDateStart.value;
    const dateEnd = syncDateEnd.value;
    const typeFilter = syncTypeFilter ? syncTypeFilter.value : 'all';
    const items = [];

    Object.keys(diaryData).forEach(date => {
        if (date !== GLOBAL_KEY) {
            if (dateStart && date < dateStart) return;
            if (dateEnd && date > dateEnd) return;
        }

        const day = diaryData[date] || {};

        if (typeFilter === 'all' || typeFilter === 'subtopic') {
            (day.subtopics || []).forEach(subtopic => {
                const title = String(subtopic.title || '');
                const body = String(subtopic.body || '');
                if (!keyword || title.toLowerCase().includes(keyword) || body.toLowerCase().includes(keyword)) {
                    items.push({
                        key: makeSyncItemKey(date, 'subtopic', subtopic.id),
                        date, type: 'subtopic', id: subtopic.id,
                        title: title || 'Без названия',
                        preview: body,
                        data: { ...subtopic }
                    });
                }
            });
        }

        if (typeFilter === 'all' || typeFilter === 'todo') {
            (day.todos || []).forEach(todo => {
                const title = String(todo.text || '');
                if (!keyword || title.toLowerCase().includes(keyword)) {
                    items.push({
                        key: makeSyncItemKey(date, 'todo', todo.id),
                        date, type: 'todo', id: todo.id,
                        title: title || 'Без названия',
                        preview: todo.alarmTime ? `Будильник: ${todo.alarmTime}` : '',
                        data: { ...todo }
                    });
                }
            });
        }
    });

    items.sort((a, b) => {
        if (a.date === GLOBAL_KEY && b.date !== GLOBAL_KEY) return -1;
        if (b.date === GLOBAL_KEY && a.date !== GLOBAL_KEY) return 1;
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
    if (collection.some(entry => String(entry.id) === String(item.id))) return true;

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

function renderSyncResultItem(item, inTarget) {
    const selected = syncSelectedItems.has(item.key);

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
        `${formatSyncDateLabel(item.date)} • ${item.type === 'subtopic' ? 'Подтема' : 'Задача'}` +
        (item.preview ? ` • ${item.preview}` : '');

    main.appendChild(title);
    main.appendChild(meta);

    const badge = document.createElement('span');
    badge.className = `sync-result-badge ${inTarget ? 'exists' : 'missing'}`;
    badge.textContent = inTarget ? 'В файле' : 'Новая';

    row.appendChild(checkbox);
    row.appendChild(main);
    row.appendChild(badge);

    row.addEventListener('click', () => {
        if (syncSelectedItems.has(item.key)) syncSelectedItems.delete(item.key);
        else syncSelectedItems.add(item.key);
        renderSyncResults();
    });

    return row;
}

function getSelectedItemsFromList(items) {
    return items.filter(item => syncSelectedItems.has(item.key));
}

function setSelectedState(items, selected) {
    items.forEach(item => {
        if (selected) syncSelectedItems.add(item.key);
        else syncSelectedItems.delete(item.key);
    });
}

function renderSyncResults() {
    const items = getSyncItems();
    syncResults.innerHTML = '';
    syncExistingResults.innerHTML = '';
    syncNewResults.innerHTML = '';

    if (!syncTargetData) {
        syncGroups.classList.add('hidden');
        syncResults.classList.remove('hidden');

        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'sync-empty';
            empty.textContent = 'Ничего не найдено. Попробуйте другой запрос.';
            syncResults.appendChild(empty);
        } else {
            items.forEach(item => syncResults.appendChild(renderSyncResultItem(item, false)));
        }

        syncResultsCount.textContent = `Найдено: ${items.length}`;
        syncSelectedCount.textContent = `Выбрано: ${getSelectedItemsFromList(items).length}`;
        syncNewCount.textContent = 'Новых: —';
        syncMergeSelectedBtn.disabled = true;
        syncMergeAllNewBtn.disabled = true;
        return;
    }

    syncResults.classList.add('hidden');
    syncGroups.classList.remove('hidden');

    const existingItems = [];
    const newItems = [];
    items.forEach(item => {
        if (isSyncItemInTarget(item)) existingItems.push(item);
        else newItems.push(item);
    });

    existingItems.forEach(item => syncExistingResults.appendChild(renderSyncResultItem(item, true)));
    newItems.forEach(item => syncNewResults.appendChild(renderSyncResultItem(item, false)));

    if (existingItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sync-empty';
        empty.textContent = 'Подходящих записей, которые уже есть в файле, нет.';
        syncExistingResults.appendChild(empty);
    }

    if (newItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'sync-empty';
        empty.textContent = 'Новых записей по этому поиску нет.';
        syncNewResults.appendChild(empty);
    }

    const selectedVisible = getSelectedItemsFromList(items);
    syncResultsCount.textContent = `Найдено: ${items.length}`;
    syncSelectedCount.textContent = `Выбрано: ${selectedVisible.length}`;
    syncNewCount.textContent = `Новых: ${newItems.length}`;
    syncExistingCount.textContent = existingItems.length;
    syncNewListCount.textContent = newItems.length;

    syncMergeSelectedBtn.disabled =
        selectedVisible.filter(item => !isSyncItemInTarget(item)).length === 0;
    syncMergeAllNewBtn.disabled = newItems.length === 0;

    syncSelectExistingBtn.textContent =
        existingItems.length > 0 && existingItems.every(item => syncSelectedItems.has(item.key))
            ? 'Снять все' : 'Выбрать все';
    syncSelectNewBtn.textContent =
        newItems.length > 0 && newItems.every(item => syncSelectedItems.has(item.key))
            ? 'Снять все' : 'Выбрать все';
}

function buildSelectedData(items) {
    const selectedData = {};
    items.forEach(item => {
        if (!selectedData[item.date]) {
            selectedData[item.date] = {
                mainNote: '', mood: null, subtopics: [], todos: [], photos: []
            };
        }
        if (item.type === 'subtopic') selectedData[item.date].subtopics.push({ ...item.data });
        else selectedData[item.date].todos.push({ ...item.data });
    });
    return selectedData;
}

function mergeSelectedItemsIntoTarget(items) {
    if (!syncTargetData) throw new Error('Файл для добавления не выбран.');

    items.forEach(item => {
        if (!syncTargetData[item.date]) {
            syncTargetData[item.date] = {
                mainNote: '', mood: null, subtopics: [], todos: [], photos: []
            };
        }

        const collectionName = item.type === 'subtopic' ? 'subtopics' : 'todos';
        const collection = syncTargetData[item.date][collectionName] || [];

        const sameIdIndex = collection.findIndex(entry => String(entry.id) === String(item.id));
        if (sameIdIndex >= 0) {
            collection[sameIdIndex] = { ...item.data };
        } else {
            const sourceText = normalizeSyncText(
                item.type === 'subtopic' ? item.data.title : item.data.text
            );
            const sameTextIndex = collection.findIndex(entry =>
                normalizeSyncText(item.type === 'subtopic' ? entry.title : entry.text) === sourceText
            );
            if (sameTextIndex >= 0) collection[sameTextIndex] = { ...item.data };
            else collection.push({ ...item.data });
        }
        syncTargetData[item.date][collectionName] = collection;
    });
}

document.getElementById('opt-smart-export').addEventListener('click', () => {
    syncSelectedItems.clear();
    syncTargetData = null;
    syncTargetFileName = '';
    syncFileName.textContent = 'Файл для добавления не выбран';
    syncFileName.title = '';
    syncMergeInput.value = '';
    syncOverlay.classList.remove('hidden');
    radialOptions.classList.add('hidden');
    renderSyncResults();
    syncSearchInput.focus();
});

document.getElementById('sync-close-btn').addEventListener('click', () => {
    syncOverlay.classList.add('hidden');
});

[syncSearchInput, syncDateStart, syncDateEnd, syncTypeFilter].forEach(input => {
    if (!input) return;
    input.addEventListener('input', renderSyncResults);
    input.addEventListener('change', renderSyncResults);
});

syncSelectExistingBtn.addEventListener('click', () => {
    if (!syncTargetData) return;
    const items = getSyncItems().filter(item => isSyncItemInTarget(item));
    const shouldSelect = !items.length || !items.every(item => syncSelectedItems.has(item.key));
    setSelectedState(items, shouldSelect);
    renderSyncResults();
});

syncSelectNewBtn.addEventListener('click', () => {
    if (!syncTargetData) return;
    const items = getSyncItems().filter(item => !isSyncItemInTarget(item));
    const shouldSelect = !items.length || !items.every(item => syncSelectedItems.has(item.key));
    setSelectedState(items, shouldSelect);
    renderSyncResults();
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

    const typeFilter = syncTypeFilter ? syncTypeFilter.value : 'all';
    const typeSuffix =
        typeFilter === 'subtopic' ? '_topics' :
        typeFilter === 'todo' ? '_tasks' : '';

    downloadFile(
        JSON.stringify(dataToExport, null, 2),
        `${keyword}${typeSuffix}_${formatDateKey(new Date())}.json`
    );
});

syncMergeSelectedBtn.addEventListener('click', () => {
    if (!syncTargetData) {
        alert('Сначала выберите существующий JSON-файл.');
        return;
    }
    const selected = getVisibleSelectedSyncItems();
    const newItems = selected.filter(item => !isSyncItemInTarget(item));

    if (newItems.length === 0) {
        alert('Среди выбранных записей нет новых для этого файла.');
        return;
    }
    mergeSelectedItemsIntoTarget(newItems);
    newItems.forEach(item => syncSelectedItems.delete(item.key));

    downloadFile(
        JSON.stringify(syncTargetData, null, 2),
        syncTargetFileName || `diary_merged_${formatDateKey(new Date())}.json`
    );
    alert(`Добавлено новых записей: ${newItems.length}. Обновлённый файл скачан.`);
    renderSyncResults();
});

syncMergeAllNewBtn.addEventListener('click', () => {
    if (!syncTargetData) {
        alert('Сначала выберите существующий JSON-файл.');
        return;
    }
    const newItems = getSyncItems().filter(item => !isSyncItemInTarget(item));
    if (newItems.length === 0) {
        alert('Новых записей по текущему поиску нет.');
        return;
    }
    mergeSelectedItemsIntoTarget(newItems);
    newItems.forEach(item => syncSelectedItems.delete(item.key));

    downloadFile(
        JSON.stringify(syncTargetData, null, 2),
        syncTargetFileName || `diary_merged_${formatDateKey(new Date())}.json`
    );
    alert(`Добавлены все новые записи: ${newItems.length}. Обновлённый файл скачан.`);
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