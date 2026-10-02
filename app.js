// --- ИНИЦИАЛИЗАЦИЯ И ДАТЫ ---
let currentDate = new Date();
let diaryData = JSON.parse(localStorage.getItem('diary_data') || '{}');
let openRouterApiKey = localStorage.getItem('ai_api_key') || '';
let currentEditingSubtopicIndex = null;

// Элементы DOM
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

// Кнопки навигации и действий
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const optAddTopic = document.getElementById('opt-add-topic');
const optAddTask = document.getElementById('opt-add-task');

// Модальное окно (Подтемы)
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCancelTopBtn = document.getElementById('modal-cancel-top-btn');

// Модальное окно (Задачи)
const taskOverlay = document.getElementById('task-overlay');
const taskInputText = document.getElementById('task-input-text');
const taskInputTime = document.getElementById('task-input-time');
const taskSaveBtn = document.getElementById('task-save-btn');
const taskCancelBtn = document.getElementById('task-cancel-btn');
const taskCancelTopBtn = document.getElementById('task-cancel-top-btn');

// AI Оверлей
const aiOverlay = document.getElementById('ai-overlay');
const closeAiBtn = document.getElementById('close-ai-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const aiKeyInput = document.getElementById('ai-key-input');
const aiResponseArea = document.getElementById('ai-response-area');
const aiQuestionInput = document.getElementById('ai-question-input');
const aiAskBtn = document.getElementById('ai-ask-btn');

// Настройки (Радиальное меню)
const radialToggleBtn = document.getElementById('radial-toggle-btn');
const radialOptions = document.getElementById('radial-options');
const optAi = document.getElementById('opt-ai');
const optExport = document.getElementById('opt-export');
const optExportAi = document.getElementById('opt-export-ai');
const importFile = document.getElementById('import-file');

// Форматирование ключа даты (YYYY-MM-DD)
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Получить данные текущего дня
function getCurrentDayData() {
    const key = formatDateKey(currentDate);
    if (!diaryData[key]) {
        diaryData[key] = {
            mainNote: '',
            mood: '',
            subtopics: [],
            todos: [],
            photos: []
        };
    }
    return diaryData[key];
}

// Сохранение в localStorage
function saveData() {
    localStorage.setItem('diary_data', JSON.stringify(diaryData));
}

// --- РЕНДЕР ИНТЕРФЕЙСА ---
function initApp() {
    renderHeader();
    renderWeekStrip();
    renderDayContent();
    
    if (openRouterApiKey) {
        aiKeyInput.value = openRouterApiKey;
    }
}

function renderHeader() {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    monthTitle.textContent = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    calendarPicker.value = formatDateKey(currentDate);
}

// Лента 7 дней недели (текущая неделя по центру или выбранный день)
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
        const isSelected = dateKey === formatDateKey(currentDate);
        if (isSelected) dayCell.classList.add('selected');

        const data = diaryData[dateKey];
        const hasNotes = data && (data.mainNote || (data.subtopics && data.subtopics.length > 0) || (data.todos && data.todos.length > 0));
        if (hasNotes) {
            dayCell.classList.add('has-note');
        }

        const weekdaysNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        dayCell.innerHTML = `
            <span class="day-name">${weekdaysNames[i]}</span>
            <span class="day-number">${d.getDate()}</span>
        `;

        dayCell.addEventListener('click', () => {
            currentDate = new Date(d);
            initApp();
        });

        weekDaysContainer.appendChild(dayCell);
    }
}

function renderDayContent() {
    const dayData = getCurrentDayData();
    
    const options = { day: 'numeric', month: 'long', weekday: 'long' };
    selectedDateTitle.textContent = currentDate.toLocaleDateString('ru-RU', options);

    mainNoteInput.value = dayData.mainNote || '';

    document.querySelectorAll('.mood-btn').forEach(btn => {
        if (btn.dataset.mood === dayData.mood) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderSubtopics();
    renderTodos();
    renderPhotos();
}

// --- ПОДТЕМЫ ---
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
                <div class="subtopic-controls">
                    <button class="icon-btn edit-sub" title="Редактировать">✏️</button>
                    <button class="icon-btn delete-sub" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="subtopic-body markdown-body">${marked.parse(sub.body || '')}</div>
        `;

        card.querySelector('.edit-sub').addEventListener('click', () => openSubtopicModal(index));
        card.querySelector('.delete-sub').addEventListener('click', () => {
            dayData.subtopics.splice(index, 1);
            saveData();
            renderSubtopics();
            renderWeekStrip();
        });

        subtopicsContainer.appendChild(card);
    });

    renderMathInElement(subtopicsContainer, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false
    });
}

function openSubtopicModal(index = null) {
    currentEditingSubtopicIndex = index;
    const dayData = getCurrentDayData();

    if (index !== null) {
        modalTitle.textContent = 'Редактировать подтему';
        modalInputTitle.value = dayData.subtopics[index].title;
        modalInputBody.value = dayData.subtopics[index].body;
    } else {
        modalTitle.textContent = 'Новая подтема';
        modalInputTitle.value = '';
        modalInputBody.value = '';
    }

    modalOverlay.classList.remove('hidden');
    modalInputTitle.focus();
}

function closeSubtopicModal() {
    modalOverlay.classList.add('hidden');
    currentEditingSubtopicIndex = null;
}

// --- ЗАДАЧИ ---
function renderTodos() {
    todoList.innerHTML = '';
    const dayData = getCurrentDayData();
    if (!dayData.todos) dayData.todos = [];

    let completedCount = 0;

    dayData.todos.forEach((todo, index) => {
        if (todo.done) completedCount++;

        const item = document.createElement('div');
        item.className = `todo-item ${todo.done ? 'done' : ''}`;
        item.innerHTML = `
            <label class="todo-checkbox-label">
                <input type="checkbox" ${todo.done ? 'checked' : ''}>
                <span class="todo-text">${escapeHtml(todo.text)} ${todo.time ? `<small>(${todo.time})</small>` : ''}</span>
            </label>
            <button class="icon-btn delete-todo" title="Удалить">🗑️</button>
        `;

        item.querySelector('input').addEventListener('change', (e) => {
            todo.done = e.target.checked;
            saveData();
            renderTodos();
        });

        item.querySelector('.delete-todo').addEventListener('click', () => {
            dayData.todos.splice(index, 1);
            saveData();
            renderTodos();
            renderWeekStrip();
        });

        todoList.appendChild(item);
    });

    todosCounter.textContent = `${completedCount}/${dayData.todos.length}`;
}

// --- ФОТОГРАФИИ ---
function renderPhotos() {
    photoList.innerHTML = '';
    const dayData = getCurrentDayData();
    if (!dayData.photos) dayData.photos = [];

    dayData.photos.forEach((photoUrl, index) => {
        const wrap = document.createElement('div');
        wrap.className = 'photo-thumb-wrap';
        wrap.innerHTML = `
            <img src="${photoUrl}" alt="Фото дня">
            <button class="delete-photo-btn" title="Удалить">✕</button>
        `;

        wrap.querySelector('.delete-photo-btn').addEventListener('click', () => {
            dayData.photos.splice(index, 1);
            saveData();
            renderPhotos();
        });

        photoList.appendChild(wrap);
    });
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---

prevWeekBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 7);
    initApp();
});

nextWeekBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 7);
    initApp();
});

calendarPicker.addEventListener('change', (e) => {
    if (e.target.value) {
        currentDate = new Date(e.target.value);
        initApp();
    }
});

mainNoteInput.addEventListener('input', () => {
    const dayData = getCurrentDayData();
    dayData.mainNote = mainNoteInput.value;
    saveData();
    renderWeekStrip();
});

document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const dayData = getCurrentDayData();
        dayData.mood = btn.dataset.mood;
        saveData();
        renderDayContent();
    });
});

optAddTopic.addEventListener('click', () => openSubtopicModal(null));
optAddTask.addEventListener('click', () => {
    taskInputText.value = '';
    taskInputTime.value = '';
    taskOverlay.classList.remove('hidden');
    taskInputText.focus();
});

modalSaveBtn.addEventListener('click', () => {
    const title = modalInputTitle.value.trim();
    const body = modalInputBody.value.trim();
    if (!title && !body) {
        closeSubtopicModal();
        return;
    }

    const dayData = getCurrentDayData();
    if (!dayData.subtopics) dayData.subtopics = [];

    if (currentEditingSubtopicIndex !== null) {
        dayData.subtopics[currentEditingSubtopicIndex] = { title, body };
    } else {
        dayData.subtopics.push({ title, body });
    }

    saveData();
    closeSubtopicModal();
    renderSubtopics();
    renderWeekStrip();
});

modalCancelBtn.addEventListener('click', closeSubtopicModal);
modalCancelTopBtn.addEventListener('click', closeSubtopicModal);

taskSaveBtn.addEventListener('click', () => {
    const text = taskInputText.value.trim();
    const time = taskInputTime.value;
    if (!text) {
        taskOverlay.classList.add('hidden');
        return;
    }

    const dayData = getCurrentDayData();
    if (!dayData.todos) dayData.todos = [];
    dayData.todos.push({ text, time, done: false });

    saveData();
    taskOverlay.classList.add('hidden');
    renderTodos();
    renderWeekStrip();
});

taskCancelBtn.addEventListener('click', () => taskOverlay.classList.add('hidden'));
taskCancelTopBtn.addEventListener('click', () => taskOverlay.classList.add('hidden'));

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const dayData = getCurrentDayData();
            if (!dayData.photos) dayData.photos = [];
            dayData.photos.push(dataUrl);

            saveData();
            renderPhotos();
            photoInput.value = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

radialToggleBtn.addEventListener('click', () => {
    radialOptions.classList.toggle('hidden');
});

optAi.addEventListener('click', () => {
    radialOptions.classList.add('hidden');
    aiOverlay.classList.remove('hidden');
});

closeAiBtn.addEventListener('click', () => {
    aiOverlay.classList.add('hidden');
});

aiKeyInput.addEventListener('input', () => {
    openRouterApiKey = aiKeyInput.value.trim();
    localStorage.setItem('ai_api_key', openRouterApiKey);
});

clearChatBtn.addEventListener('click', () => {
    aiResponseArea.innerHTML = '';
});

// Отправка запроса к ИИ через актуальный эндпоинт Google AI Studio (Gemini 2.5 Flash)
aiAskBtn.addEventListener('click', async () => {
    const question = aiQuestionInput.value.trim();
    if (!question) return;

    if (!openRouterApiKey) {
        alert('Введи бесплатный API-ключ от Google AI Studio!');
        return;
    }

    const dateKey = formatDateKey(currentDate);
    const dayData = diaryData[dateKey] || {};
    
    let context = `Контекст за ${dateKey}:\n`;
    if (dayData.subtopics) context += "Подтемы:\n" + dayData.subtopics.map(s => `- ${s.title}: ${s.body}`).join('\n') + "\n";
    if (dayData.todos) context += "Задачи:\n" + dayData.todos.map(t => `- [${t.done ? 'Готово' : 'В процессе'}] ${t.text}`).join('\n') + "\n";

    appendChatMessage('user', question);
    aiQuestionInput.value = '';

    const aiMsgEl = appendChatMessage('ai', 'Думаю...');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${openRouterApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: 'Ты умный ассистент дневника. Отвечай кратко и четко на основе переданных подтем и задач.' }]
                },
                contents: [
                    {
                        parts: [
                            { text: `${context}\nВопрос: ${question}` }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            aiMsgEl.textContent = `Ошибка API: ${data.error.message || 'Неизвестная ошибка'}`;
            return;
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const answerText = data.candidates[0].content.parts[0].text;
            aiMsgEl.innerHTML = marked.parse(answerText);
        } else {
            aiMsgEl.textContent = 'Ошибка получения ответа от ИИ.';
        }
    } catch (err) {
        aiMsgEl.textContent = 'Ошибка сети. Проверь подключение к интернету или доступность сервиса.';
        console.error(err);
    }
});

function appendChatMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}-message`;
    msgDiv.textContent = text;
    aiResponseArea.appendChild(msgDiv);
    aiResponseArea.scrollTop = aiResponseArea.scrollHeight;
    return msgDiv;
}

optExport.addEventListener('click', () => {
    radialOptions.classList.add('hidden');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diaryData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `diary_backup_${formatDateKey(new Date())}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
});

optExportAi.addEventListener('click', () => {
    radialOptions.classList.add('hidden');
    let cleanExport = {};
    for (let date in diaryData) {
        cleanExport[date] = {
            subtopics: diaryData[date].subtopics || [],
            todos: diaryData[date].todos || []
        };
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanExport, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `ai_tasks_export_${formatDateKey(new Date())}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            diaryData = imported;
            saveData();
            initApp();
            alert('Бэкап успешно загружен!');
        } catch (err) {
            alert('Ошибка чтения JSON файла.');
            console.error(err);
        }
    };
    reader.readAsText(file);
});

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

initApp();
