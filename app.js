function loadStorage() {
  try {
    let rawData = JSON.parse(localStorage.getItem('my_simple_diary')) || {};
    
    // Миграция старых данных в новый формат (поддержка типов: 'task' / 'heading')
    Object.keys(rawData).forEach(dateKey => {
      const item = rawData[dateKey];
      if (item && item.todos) {
        item.todos = item.todos.map(t => {
          if (typeof t === 'string') return { text: t, done: false, type: 'task' };
          if (!t.type) t.type = 'task';
          return t;
        });
      }
    });

    return rawData;
  } catch (e) {
    return {};
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem('my_simple_diary', JSON.stringify(data));
  } catch (e) {
    alert('Превышен лимит памяти браузера!');
  }
}

let notes = loadStorage();
let selectedDateKey = getFormattedKey(new Date());
let currentWeekStart = getMonday(new Date());
let chatHistory = [];

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// DOM Элементы
const monthTitle = document.getElementById('month-title');
const monthSelector = document.getElementById('month-selector');
const calendarPicker = document.getElementById('calendar-picker');
const weekDaysContainer = document.getElementById('week-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const moodBtns = document.querySelectorAll('.mood-btn');

const mainNoteInput = document.getElementById('main-note-input');
const newTodoInput = document.getElementById('new-todo-input');
const todoList = document.getElementById('todo-list');
const todosCounter = document.getElementById('todos-counter');
const photoList = document.getElementById('photo-list');

// Элементы плюсика
const addTriggerBtn = document.getElementById('add-trigger-btn');
const plusOptions = document.getElementById('plus-options');
const addHeadingBtn = document.getElementById('add-heading-btn');
const addTaskBtn = document.getElementById('add-task-btn');

const aiOverlay = document.getElementById('ai-overlay');

function getFormattedKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

// Отрисовка недели
function renderWeek() {
  weekDaysContainer.innerHTML = '';
  
  const selectedDateObj = new Date(selectedDateKey + 'T00:00:00');
  monthTitle.textContent = `${monthNames[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()} 📅`;
  calendarPicker.value = selectedDateKey;

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const key = getFormattedKey(dayDate);

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (key === selectedDateKey) cell.classList.add('selected');

    const dayData = notes[key];
    if (dayData && (dayData.text || (dayData.todos && dayData.todos.length > 0) || dayData.mood)) {
      cell.classList.add('has-note');
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'day-name';
    nameEl.textContent = dayNamesShort[i];

    const numEl = document.createElement('span');
    numEl.className = 'day-num';
    numEl.textContent = dayDate.getDate();

    cell.appendChild(nameEl);
    cell.appendChild(numEl);

    cell.onclick = () => selectDate(key, dayDate);
    weekDaysContainer.appendChild(cell);
  }

  loadDayData();
}

function selectDate(key, dateObj) {
  selectedDateKey = key;
  selectedDateTitle.textContent = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  renderWeek();
}

function loadDayData() {
  if (!notes[selectedDateKey]) {
    notes[selectedDateKey] = { mood: '', text: '', todos: [], photos: [] };
  }

  const dayData = notes[selectedDateKey];

  moodBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === (dayData.mood || ''));
  });

  mainNoteInput.value = dayData.text || '';

  renderTodos();
  renderPhotos();
}

mainNoteInput.oninput = () => {
  if (!notes[selectedDateKey]) notes[selectedDateKey] = { mood: '', text: '', todos: [], photos: [] };
  notes[selectedDateKey].text = mainNoteInput.value;
  saveStorage(notes);
  renderWeek();
};

moodBtns.forEach(btn => {
  btn.onclick = () => {
    if (!notes[selectedDateKey]) notes[selectedDateKey] = { mood: '', text: '', todos: [], photos: [] };
    const currentMood = notes[selectedDateKey].mood;
    notes[selectedDateKey].mood = btn.dataset.mood === currentMood ? '' : btn.dataset.mood;
    saveStorage(notes);
    renderWeek();
  };
});

// Управление плюс-меню
addTriggerBtn.onclick = () => {
  plusOptions.classList.toggle('hidden');
  addTriggerBtn.classList.toggle('active');
};

addHeadingBtn.onclick = () => createItem('heading');
addTaskBtn.onclick = () => createItem('task');

newTodoInput.onkeypress = (e) => {
  if (e.key === 'Enter') {
    createItem('task'); // По умолчанию Enter создает задачу
  }
};

function createItem(type) {
  const text = newTodoInput.value.trim();
  if (!text) return;

  if (!notes[selectedDateKey]) notes[selectedDateKey] = { mood: '', text: '', todos: [], photos: [] };
  if (!notes[selectedDateKey].todos) notes[selectedDateKey].todos = [];

  notes[selectedDateKey].todos.push({
    text,
    done: false,
    type: type // 'task' или 'heading'
  });

  newTodoInput.value = '';
  plusOptions.classList.add('hidden');
  addTriggerBtn.classList.remove('active');

  saveStorage(notes);
  renderWeek();
}

// Отрисовка списка задач и тем
function renderTodos() {
  todoList.innerHTML = '';
  const dayTodos = notes[selectedDateKey]?.todos || [];

  let tasksCount = 0;
  let completedCount = 0;

  dayTodos.forEach((todo, idx) => {
    const isHeading = todo.type === 'heading';

    if (!isHeading) {
      tasksCount++;
      if (todo.done) completedCount++;
    }

    const itemDiv = document.createElement('div');
    itemDiv.className = `todo-item ${isHeading ? 'item-heading' : 'item-task'} ${todo.done ? 'done' : ''}`;

    if (isHeading) {
      // Оформление темы / оглавления
      const titleSpan = document.createElement('span');
      titleSpan.className = 'heading-text';
      titleSpan.textContent = todo.text;
      itemDiv.appendChild(titleSpan);
    } else {
      // Оформление интерактивной задачи
      const customCheckbox = document.createElement('div');
      customCheckbox.className = `custom-checkbox ${todo.done ? 'checked' : ''}`;
      customCheckbox.onclick = () => toggleTodo(idx);

      const taskSpan = document.createElement('span');
      taskSpan.className = 'task-text';
      taskSpan.textContent = todo.text;
      taskSpan.onclick = () => toggleTodo(idx);

      itemDiv.appendChild(customCheckbox);
      itemDiv.appendChild(taskSpan);
    }

    // Кнопка удаления
    const delBtn = document.createElement('button');
    delBtn.className = 'del-todo';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTodo(idx);
    };

    itemDiv.appendChild(delBtn);
    todoList.appendChild(itemDiv);
  });

  todosCounter.textContent = `${completedCount}/${tasksCount}`;
}

function toggleTodo(idx) {
  if (notes[selectedDateKey].todos[idx].type === 'heading') return;
  notes[selectedDateKey].todos[idx].done = !notes[selectedDateKey].todos[idx].done;
  saveStorage(notes);
  renderWeek();
}

function deleteTodo(idx) {
  notes[selectedDateKey].todos.splice(idx, 1);
  saveStorage(notes);
  renderWeek();
}

// Управление фото
document.getElementById('photo-input').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600;
      const scaleSize = MAX_WIDTH / img.width;
      
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      
      if (!notes[selectedDateKey]) notes[selectedDateKey] = { mood: '', text: '', todos: [], photos: [] };
      if (!notes[selectedDateKey].photos) notes[selectedDateKey].photos = [];

      notes[selectedDateKey].photos.push(compressedBase64);
      saveStorage(notes);
      renderWeek();
    };
  };
  reader.readAsDataURL(file);
};

function renderPhotos() {
  photoList.innerHTML = '';
  const dayPhotos = notes[selectedDateKey]?.photos || [];

  dayPhotos.forEach((src, idx) => {
    const container = document.createElement('div');
    container.className = 'photo-card';

    const img = document.createElement('img');
    img.src = src;

    const delBtn = document.createElement('button');
    delBtn.className = 'del-photo-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = () => {
      notes[selectedDateKey].photos.splice(idx, 1);
      saveStorage(notes);
      renderWeek();
    };

    container.appendChild(img);
    container.appendChild(delBtn);
    photoList.appendChild(container);
  });
}

// Календарь
monthSelector.onclick = () => {
  if (typeof calendarPicker.showPicker === 'function') {
    calendarPicker.showPicker();
  } else {
    calendarPicker.focus();
    calendarPicker.click();
  }
};

calendarPicker.onchange = (e) => {
  if (!e.target.value) return;
  const pickedDate = new Date(e.target.value + 'T00:00:00');
  selectedDateKey = getFormattedKey(pickedDate);
  currentWeekStart = getMonday(pickedDate);
  selectDate(selectedDateKey, pickedDate);
};

document.getElementById('prev-week').onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  const newSelectedDate = new Date(currentWeekStart);
  selectedDateKey = getFormattedKey(newSelectedDate);
  selectDate(selectedDateKey, newSelectedDate);
};

document.getElementById('next-week').onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  const newSelectedDate = new Date(currentWeekStart);
  selectedDateKey = getFormattedKey(newSelectedDate);
  selectDate(selectedDateKey, newSelectedDate);
};

// Нижнее меню
const radialToggleBtn = document.getElementById('radial-toggle-btn');
const radialOptions = document.getElementById('radial-options');

radialToggleBtn.onclick = () => {
  radialToggleBtn.classList.toggle('active');
  radialOptions.classList.toggle('hidden');
};

document.getElementById('opt-export').onclick = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `diary_backup_${getFormattedKey(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

document.getElementById('import-file').onchange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedNotes = JSON.parse(e.target.result);
      notes = { ...notes, ...importedNotes };
      saveStorage(notes);
      selectDate(selectedDateKey, new Date(selectedDateKey + 'T00:00:00'));
      alert('Данные загружены!');
    } catch (err) {
      alert('Ошибка при импорте.');
    }
  };
  reader.readAsText(file);
};

// AI-Чат
const keyInput = document.getElementById('ai-key-input');
keyInput.value = localStorage.getItem('openrouter_api_key') || '';
keyInput.onchange = () => localStorage.setItem('openrouter_api_key', keyInput.value.trim());

const responseArea = document.getElementById('ai-response-area');
const aiQuestionInput = document.getElementById('ai-question-input');

document.getElementById('opt-ai').onclick = () => {
  radialToggleBtn.classList.remove('active');
  radialOptions.classList.add('hidden');
  aiOverlay.classList.remove('hidden');
};

document.getElementById('close-ai-btn').onclick = () => aiOverlay.classList.add('hidden');

function renderChat() {
  responseArea.innerHTML = '';
  responseArea.classList.remove('hidden');

  if (chatHistory.length === 0) {
    responseArea.innerHTML = '<div style="color:#71717a; font-size:13px; text-align:center;">Спроси о чем угодно или проанализируй записи...</div>';
    return;
  }

  chatHistory.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '12px';
    msgDiv.style.padding = '8px 12px';
    msgDiv.style.borderRadius = '10px';
    msgDiv.style.fontSize = '14px';
    msgDiv.style.lineHeight = '1.4';

    if (msg.role === 'user') {
      msgDiv.style.backgroundColor = '#27272a';
      msgDiv.style.color = '#ffffff';
      msgDiv.style.alignSelf = 'flex-end';
      msgDiv.innerHTML = `<b>Ты:</b> ${escapeHtml(msg.text)}`;
    } else {
      msgDiv.style.backgroundColor = '#18181b';
      msgDiv.style.color = '#d4d4d8';
      msgDiv.style.border = '1px solid #27272a';
      msgDiv.innerHTML = `<b>AI:</b> ${escapeHtml(msg.text)}`;
    }

    responseArea.appendChild(msgDiv);
  });

  responseArea.scrollTop = responseArea.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.getElementById('ai-ask-btn').onclick = async () => {
  const query = aiQuestionInput.value.trim();
  const apiKey = keyInput.value.trim();

  if (!apiKey) {
    alert('Введи API ключ OpenRouter.');
    return;
  }

  if (!query) return;

  chatHistory.push({ role: 'user', text: query });
  aiQuestionInput.value = '';
  chatHistory.push({ role: 'assistant', text: 'Думаю...' });
  renderChat();

  let diaryContext = "";
  Object.keys(notes).forEach(date => {
    const day = notes[date];
    const hasText = day.text && day.text.trim().length > 0;
    const hasTodos = day.todos && day.todos.length > 0;

    if (hasText || hasTodos) {
      diaryContext += `=== Дата: ${date} ===\n`;
      if (hasText) diaryContext += `Запись: ${day.text}\n`;
      if (hasTodos) {
        diaryContext += `План/Задачи:\n`;
        day.todos.forEach(t => {
          if (t.type === 'heading') {
            diaryContext += `\n[ТЕМА: ${t.text}]\n`;
          } else {
            diaryContext += `- [${t.done ? 'X' : ' '}] ${t.text}\n`;
          }
        });
      }
      diaryContext += `\n`;
    }
  });

  const messagesPayload = [
    {
      role: 'system',
      content: `Ты универсальный и умный ИИ-ассистент. 
Ты можешь отвечать на абсолютно любые вопросы пользователя (программирование, наука, фитнес, общение).

Контекст личного дневника пользователя:
${diaryContext || 'Записей в дневнике нет.'}

Если запрос связан с дневником — используй контекст. Если нет — просто отвечай как помощник.`
    }
  ];

  for (let i = 0; i < chatHistory.length - 1; i++) {
    const item = chatHistory[i];
    messagesPayload.push({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.text
    });
  }

  const modelsToTry = [
    'deepseek/deepseek-chat',
    'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.3-70b-instruct'
  ];

  let aiReplyText = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages: messagesPayload })
      });

      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        aiReplyText = data.choices[0].message.content;
        break;
      }
    } catch (e) {}
  }

  chatHistory[chatHistory.length - 1].text = aiReplyText || 'Ошибка подключения.';
  renderChat();
};

// Инициализация
selectDate(selectedDateKey, new Date());
