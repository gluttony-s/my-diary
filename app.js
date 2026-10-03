// --- ИНИЦИАЛИЗАЦИЯ И ДАТЫ ---
let currentDate = new Date();
let diaryData = JSON.parse(localStorage.getItem('diary_data') || '{}');
let currentEditingSubtopicIndex = null;

// DOM Элементы
const monthTitle = document.getElementById('month-title');
const calendarPicker = document.getElementById('calendar-picker');
const weekDaysContainer = document.getElementById('week-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const mainNoteInput = document.getElementById('main-note-input');
const subtopicsContainer = document.getElementById('subtopics-container');
const todoList = document.getElementById('todo-list');
const todosCounter = document.getElementById('todos-counter');
const photoList = document.getElementById('photo-list');
const photoInput = document.getElementById('photo-input');

// Кнопки
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const optAddTopic = document.getElementById('opt-add-topic');
const optAddTask = document.getElementById('opt-add-task');

// Модалки
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');
const taskOverlay = document.getElementById('task-overlay');
const taskInputText = document.getElementById('task-input-text');
const taskInputTime = document.getElementById('task-input-time');

// Экспорт
const exportOverlay = document.getElementById('export-overlay');
const openExportBtn = document.getElementById('open-export-btn');
const closeExportBtn = document.getElementById('close-export-btn');
const btnExportText = document.getElementById('btn-export-text');
const btnBackupJson = document.getElementById('btn-backup-json');
const importFile = document.getElementById('import-file');

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getCurrentDayData() {
    const key = formatDateKey(currentDate);
    if (!diaryData[key]) {
        diaryData[key] = { mainNote: '', mood: '', subtopics: [], todos: [], photos: [] };
    }
    return diaryData[key];
}

function saveData() {
    localStorage.setItem('diary_data', JSON.stringify(diaryData));
}

function initApp() {
    renderHeader();
    renderWeekStrip();
    renderDayContent();
}

function renderHeader() {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    monthTitle.textContent = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    calendarPicker.value = formatDateKey(currentDate);
}

function renderWeekStrip() {
    weekDaysContainer.innerHTML = '';
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const diff = curr.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        const dateKey = formatDateKey(d);
        if (dateKey === formatDateKey(currentDate)) dayCell.classList.add('selected');

        const data = diaryData[dateKey];
        if (data && (data.mainNote || data.subtopics?.length || data.todos?.length)) {
            dayCell.classList.add('has-note');
        }

        const weekdaysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        dayCell.innerHTML = `<span class="day-name">${weekdaysNames[i]}</span><span class="day-number">${d.getDate()}</span>`;
        dayCell.onclick = () => { currentDate = new Date(d); initApp(); };
        weekDaysContainer.appendChild(dayCell);
    }
}

function renderDayContent() {
    const dayData = getCurrentDayData();
    selectedDateTitle.textContent = currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
    mainNoteInput.value = dayData.mainNote || '';
    
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === dayData.mood);
    });

    renderSubtopics();
    renderTodos();
    renderPhotos();
}

function renderSubtopics() {
    subtopicsContainer.innerHTML = '';
    const dayData = getCurrentDayData();
    if (!dayData.subtopics) dayData.subtopics = [];

    dayData.subtopics.forEach((sub, index) => {
        const card = document.createElement('div');
        card.className = 'subtopic-card';
        card.innerHTML = `
            <div class="subtopic-header">
                <h4>${escapeHtml(sub.title)}</h4>
                <div>
                    <button class="icon-btn" onclick="openSubModal(${index})">✏️</button>
                    <button class="icon-btn" onclick="deleteSub(${index})">🗑️</button>
                </div>
            </div>
            <div class="subtopic-body markdown-body">${marked.parse(sub.body || '')}</div>
        `;
        subtopicsContainer.appendChild(card);
    });
    renderMathInElement(subtopicsContainer, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false });
}

window.openSubModal = function(index = null) {
    currentEditingSubtopicIndex = index;
    if (index !== null) {
        const sub = getCurrentDayData().subtopics[index];
        document.getElementById('modal-title').textContent = 'Редактировать';
        modalInputTitle.value = sub.title;
        modalInputBody.value = sub.body;
    } else {
        document.getElementById('modal-title').textContent = 'Новая подтема';
        modalInputTitle.value = '';
        modalInputBody.value = '';
    }
    modalOverlay.classList.remove('hidden');
}

window.deleteSub = function(index) {
    getCurrentDayData().subtopics.splice(index, 1);
    saveData(); renderSubtopics(); renderWeekStrip();
}

function renderTodos() {
    todoList.innerHTML = '';
    const dayData = getCurrentDayData();
    if (!dayData.todos) dayData.todos = [];
    let doneCount = 0;

    dayData.todos.forEach((todo, index) => {
        if (todo.done) doneCount++;
        const item = document.createElement('div');
        item.className = `todo-item ${todo.done ? 'done' : ''}`;
        item.innerHTML = `
            <label class="todo-checkbox-label">
                <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTodo(${index}, this.checked)">
                <span class="todo-text">${escapeHtml(todo.text)} ${todo.time ? `(${todo.time})` : ''}</span>
            </label>
            <button class="icon-btn" onclick="deleteTodo(${index})">🗑️</button>
        `;
        todoList.appendChild(item);
    });
    todosCounter.textContent = `${doneCount}/${dayData.todos.length}`;
}

window.toggleTodo = function(index, checked) {
    getCurrentDayData().todos[index].done = checked;
    saveData(); renderTodos();
}
window.deleteTodo = function(index) {
    getCurrentDayData().todos.splice(index, 1);
    saveData(); renderTodos(); renderWeekStrip();
}

function renderPhotos() {
    photoList.innerHTML = '';
    const dayData = getCurrentDayData();
    if (!dayData.photos) dayData.photos = [];
    dayData.photos.forEach((url, index) => {
        const wrap = document.createElement('div');
        wrap.className = 'photo-thumb-wrap';
        wrap.innerHTML = `<img src="${url}"><button class="delete-photo-btn" onclick="deletePhoto(${index})">✕</button>`;
        photoList.appendChild(wrap);
    });
}

window.deletePhoto = function(index) {
    getCurrentDayData().photos.splice(index, 1);
    saveData(); renderPhotos();
}

// Слушатели событий интерфейса
prevWeekBtn.onclick = () => { currentDate.setDate(currentDate.getDate() - 7); initApp(); }
nextWeekBtn.onclick = () => { currentDate.setDate(currentDate.getDate() + 7); initApp(); }
calendarPicker.onchange = (e) => { if (e.target.value) { currentDate = new Date(e.target.value); initApp(); } }
mainNoteInput.oninput = () => { getCurrentDayData().mainNote = mainNoteInput.value; saveData(); renderWeekStrip(); }

document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.onclick = () => { getCurrentDayData().mood = btn.dataset.mood; saveData(); renderDayContent(); }
});

optAddTopic.onclick = () => openSubModal(null);
optAddTask.onclick = () => { taskInputText.value = ''; taskInputTime.value = ''; taskOverlay.classList.remove('hidden'); }

document.getElementById('modal-save-btn').onclick = () => {
    const title = modalInputTitle.value.trim();
    const body = modalInputBody.value.trim();
    if (title || body) {
        const subs = getCurrentDayData().subtopics;
        if (currentEditingSubtopicIndex !== null) subs[currentEditingSubtopicIndex] = { title, body };
        else subs.push({ title, body });
        saveData(); initApp();
    }
    modalOverlay.classList.add('hidden');
}

document.getElementById('task-save-btn').onclick = () => {
    const text = taskInputText.value.trim();
    if (text) {
        getCurrentDayData().todos.push({ text, time: taskInputTime.value, done: false });
        saveData(); initApp();
    }
    taskOverlay.classList.add('hidden');
}

document.querySelectorAll('.cancel, .close-btn').forEach(btn => {
    btn.onclick = (e) => e.target.closest('.modal-overlay').classList.add('hidden');
});

photoInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h && w > MAX) { h *= MAX / w; w = MAX; } 
            else if (h > MAX) { w *= MAX / h; h = MAX; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            getCurrentDayData().photos.push(canvas.toDataURL('image/jpeg', 0.7));
            saveData(); renderPhotos(); photoInput.value = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// --- ЛОГИКА ЭКСПОРТА И БЭКАПА ---

openExportBtn.onclick = () => exportOverlay.classList.remove('hidden');

// Умная генерация .txt файла для нейросетей
btnExportText.onclick = () => {
    const start = document.getElementById('exp-start').value;
    const end = document.getElementById('exp-end').value;
    const doSub = document.getElementById('exp-subtopics').checked;
    const doTasks = document.getElementById('exp-tasks').checked;
    const keyword = document.getElementById('exp-keyword').value.toLowerCase().trim();

    let outputText = "=== ВЫГРУЗКА ИЗ ДНЕВНИКА ===\n\n";
    let hasAnyData = false;

    // Сортируем даты по порядку
    const dates = Object.keys(diaryData).sort();

    dates.forEach(dateKey => {
        // Фильтр по периоду
        if (start && dateKey < start) return;
        if (end && dateKey > end) return;

        const day = diaryData[dateKey];
        let dayContent = "";

        // Фильтр подтем
        if (doSub && day.subtopics && day.subtopics.length > 0) {
            const filteredSubs = day.subtopics.filter(s => s.title.toLowerCase().includes(keyword) || s.body.toLowerCase().includes(keyword));
            if (filteredSubs.length > 0) {
                dayContent += "--- ПОДТЕМЫ ---\n";
                filteredSubs.forEach(s => {
                    dayContent += `> ${s.title}\n${s.body}\n\n`;
                });
            }
        }

        // Фильтр задач
        if (doTasks && day.todos && day.todos.length > 0) {
            // Если есть ключевое слово, ищем его в задачах
            const filteredTasks = keyword ? day.todos.filter(t => t.text.toLowerCase().includes(keyword)) : day.todos;
            if (filteredTasks.length > 0) {
                dayContent += "--- ЗАДАЧИ ---\n";
                filteredTasks.forEach(t => {
                    dayContent += `[${t.done ? 'V' : ' '}] ${t.text} ${t.time ? '('+t.time+')' : ''}\n`;
                });
                dayContent += "\n";
            }
        }

        // Если для этого дня нашлось хоть что-то
        if (dayContent.trim() !== "") {
            hasAnyData = true;
            outputText += `=====================================\n`;
            outputText += `ДАТА: ${dateKey}\n`;
            outputText += `=====================================\n`;
            outputText += dayContent;
        }
    });

    if (!hasAnyData) {
        alert("По вашим фильтрам ничего не найдено.");
        return;
    }

    downloadFile(outputText, `AI_Export_${formatDateKey(new Date())}.txt`, 'text/plain');
    exportOverlay.classList.add('hidden');
};

// Полный бэкап JSON
btnBackupJson.onclick = () => {
    const dataStr = JSON.stringify(diaryData, null, 2);
    downloadFile(dataStr, `Diary_Backup_${formatDateKey(new Date())}.json`, 'application/json');
    exportOverlay.classList.add('hidden');
};

// Загрузка бэкапа
importFile.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            diaryData = JSON.parse(event.target.result);
            saveData(); initApp();
            exportOverlay.classList.add('hidden');
            alert('Бэкап успешно загружен!');
        } catch (err) {
            alert('Ошибка чтения JSON файла. Файл поврежден или имеет неверный формат.');
        }
    };
    reader.readAsText(file);
};

// Вспомогательная функция скачивания файла
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

initApp();
