function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem('my_simple_diary')) || {};
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
let currentModalType = 'subtopic';

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
const subtopicsContainer = document.getElementById('subtopics-container');
const todoList = document.getElementById('todo-list');
const todosCounter = document.getElementById('todos-counter');
const photoList = document.getElementById('photo-list');

// Управление плюс-меню
const addMainBtn = document.getElementById('add-main-btn');
const plusOptions = document.getElementById('plus-options');
const optAddTopic = document.getElementById('opt-add-topic');
const optAddTask = document.getElementById('opt-add-task');

// Модальное окно
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInputTitle = document.getElementById('modal-input-title');
const modalInputBody = document.getElementById('modal-input-body');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// AI
const aiOverlay = document.getElementById('ai-overlay');
const keyInput = document.getElementById('ai-key-input');
const responseArea = document.getElementById('ai-response-area');
const aiQuestionInput = document.getElementById('ai-question-input');

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
    if (dayData && (dayData.text || (dayData.subtopics && dayData.subtopics.length > 0) || (dayData.todos && dayData.todos.length > 0) || dayData.mood)) {
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
    notes[selectedDateKey] = { mood: '', text: '', subtopics: [], todos: [], photos: [] };
  }

  const dayData = notes[selectedDateKey];

  moodBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === (dayData.mood || ''));
  });

  mainNoteInput.value = dayData.text || '';

  renderSubtopics();
  renderTodos();
  renderPhotos();
}

mainNoteInput.oninput = () => {
  ensureStorageStructure();
  notes[selectedDateKey].text = mainNoteInput.value;
  saveStorage(notes);
  renderWeek();
};

moodBtns.forEach(btn => {
  btn.onclick = () => {
    ensureStorageStructure();
    const currentMood = notes[selectedDateKey].mood;
    notes[selectedDateKey].mood = btn.dataset.mood === currentMood ? '' : btn.dataset.mood;
    saveStorage(notes);
    renderWeek();
  };
});

function ensureStorageStructure() {
  if (!notes[selectedDateKey]) notes[selectedDateKey] = {};
  if (!notes[selectedDateKey].subtopics) notes[selectedDateKey].subtopics = [];
  if (!notes[selectedDateKey].todos) notes[selectedDateKey].todos = [];
  if (!notes[selectedDateKey].photos) notes[selectedDateKey].photos = [];
}

// Плюсик и создание задач / подтем
addMainBtn.onclick = () => {
  addMainBtn.classList.toggle('active');
  plusOptions.classList.toggle('hidden');
};

optAddTopic.onclick = () => openModal('subtopic');
optAddTask.onclick = () => openModal('task');

function openModal(type) {
  currentModalType = type;
  plusOptions.classList.add('hidden');
  addMainBtn.classList.remove('active');

  modalInputTitle.value = '';
  modalInputBody.value = '';

  if (type === 'subtopic') {
    modalTitle.textContent = 'Новая подтема';
    modalInputTitle.placeholder = 'Название подтемы...';
    modalInputBody.classList.remove('hidden');
  } else {
    modalTitle.textContent = 'Новая задача';
    modalInputTitle.placeholder = 'Текст задачи...';
    modalInputBody.classList.add('hidden');
  }

  modalOverlay.classList.remove('hidden');
  modalInputTitle.focus();
}

modalCancelBtn.onclick = () => modalOverlay.classList.add('hidden');

modalSaveBtn.onclick = () => {
  const title = modalInputTitle.value.trim();
  const body = modalInputBody.value.trim();

  if (!title) return;

  ensureStorageStructure();

  if (currentModalType === 'subtopic') {
    notes[selectedDateKey].subtopics.push({ title, body, open: false });
  } else {
    notes[selectedDateKey].todos.push({ text: title, done: false });
  }

  saveStorage(notes);
  modalOverlay.classList.add('hidden');
  renderWeek();
};

// 2. ПОДТЕМЫ
function renderSubtopics() {
  subtopicsContainer.innerHTML = '';
  const subtopics = notes[selectedDateKey]?.subtopics || [];

  subtopics.forEach((sub, idx) => {
    const card = document.createElement('div');
    card.className = `subtopic-card ${sub.open ? 'expanded' : ''}`;

    const header = document.createElement('div');
    header.className = 'subtopic-header';

    const title = document.createElement('span');
    title.className = 'subtopic-title';
    title.textContent = sub.title;

    const actions = document.createElement('div');
    actions.className = 'subtopic-actions';

    const arrow = document.createElement('span');
    arrow.className = 'subtopic-arrow';
    arrow.textContent = sub.open ? '▲' : '▼';

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      notes[selectedDateKey].subtopics.splice(idx, 1);
      saveStorage(notes);
      renderWeek();
    };

    actions.appendChild(arrow);
    actions.appendChild(delBtn);

    header.appendChild(title);
    header.appendChild(actions);

    header.onclick = () => {
      sub.open = !sub.open;
      saveStorage(notes);
      renderSubtopics();
    };

    card.appendChild(header);

    if (sub.open) {
      const body = document.createElement('div');
      body.className = 'subtopic-body';

      const textarea = document.createElement('textarea');
      textarea.value = sub.body || '';
      textarea.placeholder = 'Детали и описание подтемы...';
      textarea.oninput = () => {
        sub.body = textarea.value;
        saveStorage(notes);
      };

      body.appendChild(textarea);
      card.appendChild(body);
    }

    subtopicsContainer.appendChild(card);
  });
}

// 3. ЗАДАЧИ
function renderTodos() {
  todoList.innerHTML = '';
  const todos = notes[selectedDateKey]?.todos || [];

  let completedCount = 0;

  todos.forEach((todo, idx) => {
    if (todo.done) completedCount++;

    const item = document.createElement('div');
    item.className = `todo-item ${todo.done ? 'done' : ''}`;

    const checkbox = document.createElement('div');
    checkbox.className = `custom-checkbox ${todo.done ? 'checked' : ''}`;
    checkbox.onclick = () => toggleTodo(idx);

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
    text.onclick = () => toggleTodo(idx);

    const delBtn = document.createElement('button');
    delBtn.className = 'del-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTodo(idx);
    };

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(delBtn);
    todoList.appendChild(item);
  });

  todosCounter.textContent = `${completedCount}/${todos.length}`;
}

function toggleTodo(idx) {
  notes[selectedDateKey].todos[idx].done = !notes[selectedDateKey].todos[idx].done;
  saveStorage(notes);
  renderWeek();
}

function deleteTodo(idx) {
  notes[selectedDateKey].todos.splice(idx, 1);
  saveStorage(notes);
  renderWeek();
}

// 4. ФОТОГРАФИИ
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
      
      ensureStorageStructure();
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

// Календарь и переключение недель
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

// Настройки
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
      notes = JSON.parse(e.target.result);
      saveStorage(notes);
      selectDate(selectedDateKey, new Date(selectedDateKey + 'T00:00:00'));
      alert('Данные загружены!');
    } catch (err) {
      alert('Ошибка файла.');
    }
  };
  reader.readAsText(file);
};

// AI-ЧАТ С КРАСИВЫМ РЕНДЕРИНГОМ MARKDOWN И LATEX
keyInput.value = localStorage.getItem('openrouter_api_key') || '';
keyInput.onchange = () => localStorage.setItem('openrouter_api_key', keyInput.value.trim());

document.getElementById('opt-ai').onclick = () => {
  radialToggleBtn.classList.remove('active');
  radialOptions.classList.add('hidden');
  aiOverlay.classList.remove('hidden');
  renderChat();
};

document.getElementById('close-ai-btn').onclick = () => aiOverlay.classList.add('hidden');

function renderChat() {
  responseArea.innerHTML = '';

  if (chatHistory.length === 0) {
    responseArea.innerHTML = '<div style="color:#71717a; font-size:13px; text-align:center; padding: 20px;">Задай любой вопрос или попроси проанализировать дневник...</div>';
    return;
  }

  chatHistory.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${msg.role === 'user' ? 'user-msg' : 'ai-msg'}`;

    if (msg.role === 'user') {
      msgDiv.innerHTML = `<b>Ты:</b> ${escapeHtml(msg.text)}`;
    } else {
      // Рендерим Markdown
      const rawHtml = (typeof marked !== 'undefined') ? marked.parse(msg.text) : escapeHtml(msg.text);
      msgDiv.innerHTML = `<div class="ai-role-label"><b>AI:</b></div><div class="markdown-body">${rawHtml}</div>`;

      // Рендерим математические формулы LaTeX (KaTeX)
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(msgDiv, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\[', right: '\\]', display: true},
            {left: '\\(', right: '\\)', display: false}
          ],
          throwOnError: false
        });
      }
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

  // Собираем контекст дневника
  let diaryContext = "";
  Object.keys(notes).forEach(date => {
    const day = notes[date];
    const hasText = day.text && day.text.trim().length > 0;
    const hasTopics = day.subtopics && day.subtopics.length > 0;
    const hasTodos = day.todos && day.todos.length > 0;

    if (hasText || hasTopics || hasTodos) {
      diaryContext += `=== Дата: ${date} ===\n`;
      if (hasText) diaryContext += `Главная запись: ${day.text}\n`;
      if (hasTopics) {
        day.subtopics.forEach(s => {
          diaryContext += `Подтема [${s.title}]: ${s.body || 'нет описания'}\n`;
        });
      }
      if (hasTodos) {
        diaryContext += `Задачи:\n`;
        day.todos.forEach(t => {
          diaryContext += `- [${t.done ? 'X' : ' '}] ${t.text}\n`;
        });
      }
      diaryContext += `\n`;
    }
  });

  const now = new Date();
  const currentDateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const currentYear = now.getFullYear();

  const systemPrompt = `Ты умный и полезный ИИ-ассистент.
ТЕКУЩАЯ ДАТА: ${currentDateStr} (Текущий год: ${currentYear}).
Все расчёты возраста, дат и текущих событий обязательно производи относительно ${currentYear} года!

Контекст дневника пользователя:
${diaryContext || 'Записей в дневнике пока нет.'}

Если вопрос касается дневника — используй контекст выше. Если вопрос общий — отвечай свободно.`;

  const messagesPayload = [{ role: 'system', content: systemPrompt }];

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

  chatHistory[chatHistory.length - 1].text = aiReplyText || 'Ошибка получения ответа от сервера.';
  renderChat();
};

selectDate(selectedDateKey, new Date());
