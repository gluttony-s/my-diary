function loadStorage() {
  try {
    let rawData = JSON.parse(localStorage.getItem('my_simple_diary')) || {};
    
    // Авто-миграция под систему карточек, если были старые записи
    Object.keys(rawData).forEach(dateKey => {
      const item = rawData[dateKey];
      if (item && !item.cards && (item.title || item.content || item.photos)) {
        rawData[dateKey] = {
          mood: item.mood || '',
          cards: [
            {
              id: Date.now() + Math.random(),
              topic: item.title || '',
              desc: item.content || '',
              photos: item.photos || []
            }
          ]
        };
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

let editingCardId = null;
let currentPhotos = [];

// Массив для хранения диалога с ИИ в текущей сессии
let chatHistory = [];

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// DOM Элементы
const monthTitle = document.getElementById('month-title');
const weekDaysContainer = document.getElementById('week-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const cardsContainer = document.getElementById('cards-container');
const moodBtns = document.querySelectorAll('.mood-btn');

// Оверлеи
const editorOverlay = document.getElementById('editor-overlay');
const aiOverlay = document.getElementById('ai-overlay');

// Поля карточки (Полноэкранные)
const cardTopicInput = document.getElementById('card-topic-input');
const cardDescInput = document.getElementById('card-desc-input');
const modalPhotoList = document.getElementById('modal-photo-list');
const deleteCardBtn = document.getElementById('delete-card-btn');
const modalDateDisplay = document.getElementById('modal-date-display');

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

// Отрисовка ленты на 7 дней
function renderWeek() {
  weekDaysContainer.innerHTML = '';
  
  const midWeekDate = new Date(currentWeekStart);
  midWeekDate.setDate(midWeekDate.getDate() + 3);
  monthTitle.textContent = `${monthNames[midWeekDate.getMonth()]} ${midWeekDate.getFullYear()}`;

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(currentWeekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const key = getFormattedKey(dayDate);

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (key === selectedDateKey) cell.classList.add('selected');

    if (notes[key] && ((notes[key].cards && notes[key].cards.length > 0) || notes[key].mood)) {
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

  renderCards();
}

function selectDate(key, dateObj) {
  selectedDateKey = key;
  selectedDateTitle.textContent = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const dayData = notes[selectedDateKey] || { mood: '', cards: [] };
  setMood(dayData.mood || '');

  renderWeek();
}

function renderCards() {
  cardsContainer.innerHTML = '';
  const dayData = notes[selectedDateKey];

  if (!dayData || !dayData.cards || dayData.cards.length === 0) {
    cardsContainer.innerHTML = '<div style="color:#71717a; font-size:13px; text-align:center; padding:16px;">Нет карточек на этот день. Нажми +, чтобы добавить.</div>';
    return;
  }

  dayData.cards.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    if (card.topic) {
      const topicEl = document.createElement('div');
      topicEl.className = 'card-title';
      topicEl.textContent = card.topic;
      cardEl.appendChild(topicEl);
    }

    if (card.desc) {
      const descEl = document.createElement('div');
      descEl.className = 'card-desc';
      descEl.textContent = card.desc;
      cardEl.appendChild(descEl);
    }

    if (card.photos && card.photos.length > 0) {
      const photosEl = document.createElement('div');
      photosEl.className = 'card-photos';
      card.photos.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        photosEl.appendChild(img);
      });
      cardEl.appendChild(photosEl);
    }

    cardEl.onclick = () => openCardEditor(card.id);
    cardsContainer.appendChild(cardEl);
  });
}

function setMood(mood) {
  if (!notes[selectedDateKey]) notes[selectedDateKey] = { mood: '', cards: [] };
  notes[selectedDateKey].mood = mood;

  moodBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === mood);
  });

  saveStorage(notes);
  renderWeek();
}

moodBtns.forEach(btn => {
  btn.onclick = () => {
    const currentMood = notes[selectedDateKey]?.mood;
    setMood(btn.dataset.mood === currentMood ? '' : btn.dataset.mood);
  };
});

// Открытие ПОЛНОЭКРАННОГО редактора карточки
function openCardEditor(cardId = null) {
  editingCardId = cardId;
  const dayCards = notes[selectedDateKey]?.cards || [];
  
  // Показываем дату в шапке редактора
  const dateObj = new Date(selectedDateKey);
  modalDateDisplay.textContent = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  if (cardId) {
    const card = dayCards.find(c => c.id === cardId);
    cardTopicInput.value = card.topic || '';
    cardDescInput.value = card.desc || '';
    currentPhotos = [...(card.photos || [])];
    deleteCardBtn.classList.remove('hidden');
  } else {
    cardTopicInput.value = '';
    cardDescInput.value = '';
    currentPhotos = [];
    deleteCardBtn.classList.add('hidden');
  }

  renderModalPhotos();
  editorOverlay.classList.remove('hidden');
  
  // Авто-фокус на текст, если заголовок пустой
  setTimeout(() => {
    if (!cardTopicInput.value) cardTopicInput.focus();
    else cardDescInput.focus();
  }, 100);
}

// Загрузка фото
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
      currentPhotos.push(compressedBase64);
      renderModalPhotos();
    };
  };
  reader.readAsDataURL(file);
};

function renderModalPhotos() {
  modalPhotoList.innerHTML = '';
  currentPhotos.forEach((src, idx) => {
    const container = document.createElement('div');
    container.className = 'modal-photo-container';

    const img = document.createElement('img');
    img.src = src;

    const delBtn = document.createElement('button');
    delBtn.className = 'del-photo';
    delBtn.textContent = '✕';
    delBtn.onclick = () => {
      currentPhotos.splice(idx, 1);
      renderModalPhotos();
    };

    container.appendChild(img);
    container.appendChild(delBtn);
    modalPhotoList.appendChild(container);
  });
}

// Сохранение карточки
document.getElementById('save-card-btn').onclick = () => {
  const topic = cardTopicInput.value.trim();
  const desc = cardDescInput.value.trim();

  if (!topic && !desc && currentPhotos.length === 0) {
    editorOverlay.classList.add('hidden');
    return;
  }

  if (!notes[selectedDateKey]) {
    notes[selectedDateKey] = { mood: '', cards: [] };
  }

  let dayCards = notes[selectedDateKey].cards || [];

  if (editingCardId) {
    const card = dayCards.find(c => c.id === editingCardId);
    card.topic = topic;
    card.desc = desc;
    card.photos = currentPhotos;
  } else {
    dayCards.push({
      id: Date.now(),
      topic,
      desc,
      photos: currentPhotos
    });
  }

  notes[selectedDateKey].cards = dayCards;
  saveStorage(notes);

  editorOverlay.classList.add('hidden');
  renderWeek();
};

// Удаление карточки
deleteCardBtn.onclick = () => {
  if (!editingCardId || !notes[selectedDateKey]) return;

  notes[selectedDateKey].cards = notes[selectedDateKey].cards.filter(c => c.id !== editingCardId);
  saveStorage(notes);

  editorOverlay.classList.add('hidden');
  renderWeek();
};

document.getElementById('add-card-btn').onclick = () => openCardEditor(null);
document.getElementById('close-editor-btn').onclick = () => editorOverlay.classList.add('hidden');

// Листание недель
document.getElementById('prev-week').onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderWeek();
};

document.getElementById('next-week').onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderWeek();
};

// АНИМАЦИЯ РАДИАЛЬНОГО МЕНЮ
const radialToggleBtn = document.getElementById('radial-toggle-btn');
const radialOptions = document.getElementById('radial-options');

radialToggleBtn.onclick = () => {
  radialToggleBtn.classList.toggle('active');
  radialOptions.classList.toggle('hidden');
};

// Экспорт / Импорт
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
      selectDate(selectedDateKey, new Date());
      alert('Данные успешно загружены!');
    } catch (err) {
      alert('Ошибка при чтении файла бэкапа.');
    }
  };
  reader.readAsText(file);
};

// УМНЫЙ AI-ПОМОЩНИК ЧАТ
const keyInput = document.getElementById('ai-key-input');
keyInput.value = localStorage.getItem('gemini_api_key') || '';
keyInput.onchange = () => localStorage.setItem('gemini_api_key', keyInput.value.trim());

const responseArea = document.getElementById('ai-response-area');
const aiQuestionInput = document.getElementById('ai-question-input');

document.getElementById('opt-ai').onclick = () => {
  radialToggleBtn.classList.remove('active');
  radialOptions.classList.add('hidden');
  aiOverlay.classList.remove('hidden');
};

document.getElementById('close-ai-btn').onclick = () => aiOverlay.classList.add('hidden');

// Отрисовка ленты сообщений чата
function renderChat() {
  responseArea.innerHTML = '';
  responseArea.classList.remove('hidden');

  if (chatHistory.length === 0) {
    responseArea.innerHTML = '<div style="color:#71717a; font-size:13px; text-align:center;">Задай вопрос по своим записям...</div>';
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

  // Прокрутка вниз
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
    alert('Пожалуйста, введи API ключ Gemini.');
    return;
  }

  if (!query) return;

  // Добавляем вопрос пользователя в историю
  chatHistory.push({ role: 'user', text: query });
  aiQuestionInput.value = '';
  
  // Создаем сообщение-заглушку "Думаю..."
  chatHistory.push({ role: 'model', text: 'Анализирую записи...' });
  renderChat();

  // Собираем текст всех карточек блокнота
  let diaryContext = "";
  Object.keys(notes).forEach(date => {
    const day = notes[date];
    if (day.cards && day.cards.length > 0) {
      day.cards.forEach(card => {
        if (card.topic || card.desc) {
          diaryContext += `Дата: ${date} | Заголовок: ${card.topic || 'Без темы'} | Описание: ${card.desc || ''}\n`;
        }
      });
    }
  });

  if (!diaryContext) {
    chatHistory[chatHistory.length - 1].text = 'У тебя пока нет созданных карточек для анализа.';
    renderChat();
    return;
  }

  // Формируем историю диалога для отправки в Gemini
  const contentsPayload = [
    {
      role: 'user',
      parts: [{
        text: `Ты персональный ассистент по личным записям дневника. 
Вот вся история записей пользователя из дневника:
${diaryContext}

Используй эту информацию, чтобы отвечать на вопросы пользователя.`
      }]
    },
    {
      role: 'model',
      parts: [{ text: 'Понял, я ознакомился со всеми твоими записями и готов отвечать на вопросы!' }]
    }
  ];

  // Добавляем предыдущие диалоги (кроме последнего временно сделанного "Думаю...")
  for (let i = 0; i < chatHistory.length - 1; i++) {
    const item = chatHistory[i];
    contentsPayload.push({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }]
    });
  }

  // Список актуальных моделей Google Gemini
  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ];

  let aiReplyText = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contentsPayload })
      });

      const data = await res.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        aiReplyText = data.candidates[0].content.parts[0].text;
        break;
      }

      if (data.error) {
        aiReplyText = `Ошибка API: ${data.error.message}`;
      }
    } catch (e) {
      aiReplyText = 'Ошибка сети / VPN. Убедись, что соединение стабильно.';
    }
  }

  // Обновляем ответ AI в чате
  chatHistory[chatHistory.length - 1].text = aiReplyText || 'Не удалось получить ответ.';
  renderChat();
};

// Инициализация при старте
selectDate(selectedDateKey, new Date());
