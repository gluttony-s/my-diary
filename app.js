// --- ИНИЦИАЛИЗАЦИЯ И ДАННЫЕ ---
let currentDate = new Date();
let diaryData = JSON.parse(localStorage.getItem('diaryData')) || {};
let openRouterApiKey = localStorage.getItem('openRouterApiKey') || '';

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
const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');

let editingSubtopicId = null;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initDayData(dateKey) {
    if (!diaryData[dateKey]) {
        diaryData[dateKey] = {
            mainNote: '',
            mood: null,
            subtopics: [],
            todos: [],
            photos: []
        };
    }
}

function saveToStorage() {
    localStorage.setItem('diaryData', JSON.stringify(diaryData));
}

// --- АВТОМАТИЧЕСКИЙ ПЕРЕНОС НЕВЫПОЛНЕННЫХ ЗАДАЧ НА СЕГОДНЯ ---
function checkAndRolloverTasks() {
    const todayKey = formatDateKey(new Date());
    const lastVisited = localStorage.getItem('lastVisitedDateKey');

    if (lastVisited && lastVisited !== todayKey) {
        initDayData(todayKey);

        // Находим все невыполненные задачи из прошлых дней
        Object.keys(diaryData).forEach(dateKey => {
            if (dateKey < todayKey && diaryData[dateKey].todos) {
                diaryData[dateKey].todos.forEach(todo => {
                    if (!todo.done && !todo.rolledOver) {
                        // Переносим задачу в сегодняшний день
                        diaryData[todayKey].todos.push({
                            id: Date.now() + Math.random(),
                            text: todo.text,
                            done: false,
                            alarmTime: todo.alarmTime || null
                        });
                        // Помечаем в старом дне, чтобы не дублировать
                        todo.rolledOver = true;
                    }
                });
            }
        });
        saveToStorage();
    }
    localStorage.setItem('lastVisitedDateKey', todayKey);
}

// --- РЕНДЕР ДНЕЙ И НЕДЕЛИ ---
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
        dayEl.addEventListener('click', () => {
            currentDate = d;
            loadDay();
        });
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

// Сохранение главной заметки
mainNoteInput.addEventListener('input', () => {
    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);
    diaryData[dateKey].mainNote = mainNoteInput.value;
    saveToStorage();
    renderWeek();
});

// Выбор настроения
document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const dateKey = formatDateKey(currentDate);
        initDayData(dateKey);
        diaryData[dateKey].mood = diaryData[dateKey].mood === btn.dataset.mood ? null : btn.dataset.mood;
        saveToStorage();
        loadDay();
    });
});

// Навигация по неделям и календарь
document.getElementById('prev-week').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 7);
    loadDay();
});
document.getElementById('next-week').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 7);
    loadDay();
});
calendarPicker.addEventListener('change', (e) => {
    if (e.target.value) {
        currentDate = new Date(e.target.value);
        loadDay();
    }
});

// --- СВАЙПЫ МЕЖДУ ДНЯМИ ---
let touchStartX = 0;
let touchEndX = 0;
const swipeArea = document.getElementById('swipe-area');

swipeArea.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

swipeArea.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const swipeThreshold = 50; // Минимальная дистанция свайпа
    if (touchEndX < touchStartX - swipeThreshold) {
        // Свайп влево -> Следующий день
        currentDate.setDate(currentDate.getDate() + 1);
        loadDay();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        // Свайп вправо -> Предыдущий день
        currentDate.setDate(currentDate.getDate() - 1);
        loadDay();
    }
}

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
                    <button class="quick-btn copy-subtopic-btn" title="Скопировать">📋</button>
                    <button class="quick-btn download-subtopic-btn" title="Скачать файлом">💾</button>
                    <button class="quick-btn del-subtopic-btn" title="Удалить">✕</button>
                </div>
            </div>
            <div class="subtopic-body">
                <textarea placeholder="Содержимое...">${escapeHtml(subtopic.body || '')}</textarea>
            </div>
        `;

        const textarea = card.querySelector('textarea');
        textarea.addEventListener('input', () => {
            subtopic.body = textarea.value;
            saveToStorage();
        });

        // Быстрое копирование
        card.querySelector('.copy-subtopic-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(`${subtopic.title}\n\n${subtopic.body || ''}`);
            alert('Текст подтемы скопирован!');
        });

        // Скачивание отдельного куска
        card.querySelector('.download-subtopic-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            downloadFile(`${subtopic.title}\n\n${subtopic.body || ''}`, `${subtopic.title}.txt`);
        });

        // Удаление с подтверждением
        card.querySelector('.del-subtopic-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Точно удалить эту подтему?')) {
                diaryData[dateKey].subtopics = diaryData[dateKey].subtopics.filter(s => s.id !== subtopic.id);
                saveToStorage();
                loadDay();
            }
        });

        subtopicsContainer.appendChild(card);
    });
}

// --- ЗАДАЧИ И БУДИЛЬНИКИ ---
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

        // Переключение готовности
        item.querySelector('.custom-checkbox').addEventListener('click', () => {
            todo.done = !todo.done;
            saveToStorage();
            loadDay();
        });

        // Удаление с подтверждением
        item.querySelector('.del-btn').addEventListener('click', () => {
            if (confirm('Удалить эту задачу?')) {
                diaryData[dateKey].todos = diaryData[dateKey].todos.filter(t => t.id !== todo.id);
                saveToStorage();
                loadDay();
            }
        });

        todoList.appendChild(item);
    });

    todosCounter.textContent = `${completedCount}/${todos.length}`;
}

// Проверка будильников раз в минуту
setInterval(() => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayKey = formatDateKey(now);

    if (diaryData[todayKey] && diaryData[todayKey].todos) {
        diaryData[todayKey].todos.forEach(todo => {
            if (todo.alarmTime === currentTimeStr && !todo.alarmFired && !todo.done) {
                alert(`⏰ НАПОМИНАНИЕ О ЗАДАЧЕ:\n\n${todo.text}`);
                todo.alarmFired = true;
                saveToStorage();
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
        card.innerHTML = `
            <img src="${photoSrc}" alt="photo">
            <button class="del-photo-btn">✕</button>
        `;

        card.querySelector('.del-photo-btn').addEventListener('click', () => {
            if (confirm('Точно удалить эту фотографию?')) {
                diaryData[dateKey].photos = diaryData[dateKey].photos.filter(p => p !== photoSrc);
                saveToStorage();
                loadDay();
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
            saveToStorage();
            loadDay();
        };
        reader.readAsDataURL(file);
    }
});

// --- ЦЕНТРАЛЬНЫЕ КНОПКИ И МОДАЛЬНЫЕ ОКНА ---
const optAddTopic = document.getElementById('opt-add-topic');
const optAddTask = document.getElementById('opt-add-task');

optAddTopic.addEventListener('click', () => {
    editingSubtopicId = null;
    modalInputTitle.value = '';
    modalInputBody.value = '';
    modalOverlay.classList.remove('hidden');
});

optAddTask.addEventListener('click', () => {
    document.getElementById('task-input-text').value = '';
    document.getElementById('task-input-time').value = '';
    taskOverlay.classList.remove('hidden');
});

// Сохранение новой подтемы
document.getElementById('modal-save-btn').addEventListener('click', () => {
    const title = modalInputTitle.value.trim();
    if (!title) return;

    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);

    diaryData[dateKey].subtopics.push({
        id: Date.now(),
        title: title,
        body: modalInputBody.value
    });

    saveToStorage();
    modalOverlay.classList.add('hidden');
    loadDay();
});

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

// Сохранение новой задачи
document.getElementById('task-save-btn').addEventListener('click', () => {
    const text = document.getElementById('task-input-text').value.trim();
    const alarmTime = document.getElementById('task-input-time').value;

    if (!text) return;

    const dateKey = formatDateKey(currentDate);
    initDayData(dateKey);

    diaryData[dateKey].todos.push({
        id: Date.now(),
        text: text,
        done: false,
        alarmTime: alarmTime || null
    });

    saveToStorage();
    taskOverlay.classList.add('hidden');
    loadDay();
});

document.getElementById('task-cancel-btn').addEventListener('click', () => {
    taskOverlay.classList.add('hidden');
});

// --- МЕНЮ НАСТРОЕК И ЭКСПОРТ ---
const radialToggleBtn = document.getElementById('radial-toggle-btn');
const radialOptions = document.getElementById('radial-options');

radialToggleBtn.addEventListener('click', () => {
    radialOptions.classList.toggle('hidden');
});

// Скачивание полной копии (Полный бэкап)
document.getElementById('opt-export').addEventListener('click', () => {
    downloadFile(JSON.stringify(diaryData, null, 2), `backup_full_${formatDateKey(new Date())}.json`);
});

// Скачивание задач и подтем для ИИ (Без личных мыслей)
document.getElementById('opt-export-ai').addEventListener('click', () => {
    let aiContent = "СПИСОК ЗАДАЧ И ПОДТЕМ ДЛЯ ИИ:\n\n";
    
    Object.keys(diaryData).forEach(date => {
        const day = diaryData[date];
        if ((day.subtopics && day.subtopics.length > 0) || (day.todos && day.todos.length > 0)) {
            aiContent += `=== Дата: ${date} ===\n`;
            
            if (day.subtopics && day.subtopics.length > 0) {
                aiContent += "-- Подтемы:\n";
                day.subtopics.forEach(s => {
                    aiContent += `  * ${s.title}: ${s.body || ''}\n`;
                });
            }
            
            if (day.todos && day.todos.length > 0) {
                aiContent += "-- Задачи:\n";
                day.todos.forEach(t => {
                    aiContent += `  [${t.done ? 'X' : ' '}] ${t.text}\n`;
                });
            }
            aiContent += "\n";
        }
    });

    downloadFile(aiContent, `ai_context_${formatDateKey(new Date())}.txt`);
});

// Импорт бэкапа
document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                diaryData = JSON.parse(event.target.result);
                saveToStorage();
                loadDay();
                alert('Данные успешно импортированы!');
            } catch (err) {
                alert('Ошибка чтения файла бэкапа!');
            }
        };
        reader.readAsText(file);
    }
});

function downloadFile(content, fileName) {
    const a = document.createElement('a');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- AI АССИСТЕНТ ---
const optAi = document.getElementById('opt-ai');
const aiOverlay = document.getElementById('ai-overlay');
const closeAiBtn = document.getElementById('close-ai-btn');
const aiKeyInput = document.getElementById('ai-key-input');
const aiQuestionInput = document.getElementById('ai-question-input');
const aiAskBtn = document.getElementById('ai-ask-btn');
const aiResponseArea = document.getElementById('ai-response-area');
const clearChatBtn = document.getElementById('clear-chat-btn');

optAi.addEventListener('click', () => {
    aiOverlay.classList.remove('hidden');
    aiKeyInput.value = openRouterApiKey;
});

closeAiBtn.addEventListener('click', () => {
    aiOverlay.classList.add('hidden');
});

aiKeyInput.addEventListener('change', () => {
    openRouterApiKey = aiKeyInput.value.trim();
    localStorage.setItem('openRouterApiKey', openRouterApiKey);
});

clearChatBtn.addEventListener('click', () => {
    aiResponseArea.innerHTML = '';
});

aiAskBtn.addEventListener('click', async () => {
    const question = aiQuestionInput.value.trim();
    if (!question) return;

    if (!openRouterApiKey) {
        alert('Пожалуйста, введи OpenRouter API Ключ!');
        return;
    }

    // Собираем контекст БЕЗ личных мыслей
    const dateKey = formatDateKey(currentDate);
    const dayData = diaryData[dateKey] || {};
    
    let context = `Контекст за ${dateKey}:\n`;
    if (dayData.subtopics) {
        context += "Подтемы:\n" + dayData.subtopics.map(s => `- ${s.title}: ${s.body}`).join('\n') + "\n";
    }
    if (dayData.todos) {
        context += "Задачи:\n" + dayData.todos.map(t => `- [${t.done ? 'Готово' : 'В процессе'}] ${t.text}`).join('\n') + "\n";
    }

    appendChatMessage('user', question);
    aiQuestionInput.value = '';

    const aiMsgEl = appendChatMessage('ai', 'Думаю...');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    { role: 'system', content: 'Ты умный ассистент дневника. Тебе передаются задачи и подтемы пользователя. Личные мысли пользователя скрыты. Отвечай кратко и по делу.' },
                    { role: 'user', content: `${context}\nВопрос: ${question}` }
                ]
            })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            aiMsgEl.innerHTML = marked.parse(data.choices[0].message.content);
        } else {
            aiMsgEl.textContent = 'Ошибка получения ответа от ИИ.';
        }
    } catch (err) {
        aiMsgEl.textContent = 'Ошибка сети при запросе к ИИ.';
    }
});

function appendChatMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role === 'user' ? 'user-msg' : 'ai-msg'}`;
    msg.textContent = text;
    aiResponseArea.appendChild(msg);
    aiResponseArea.scrollTop = aiResponseArea.scrollHeight;
    return msg;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

// --- ЗАПУСК ПРИ СТАРТЕ ---
checkAndRolloverTasks();
loadDay();
