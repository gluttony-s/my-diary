function loadStorage() {
  try {
    let rawData = JSON.parse(localStorage.getItem('my_simple_diary')) || {};
    
    // Авто-миграция под систему карточек
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

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// DOM элементы
const monthTitle = document.getElementById('month-title');
const weekDaysContainer = document.getElementById('week-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const cardsContainer = document.getElementById('cards-container');
const moodBtns = document.querySelectorAll('.mood-btn');

// Оверлеи
const editorOverlay = document.getElementById('editor-overlay');
const aiOverlay = document.getElementById('ai-overlay');

// Поля карточки
const cardTopicInput = document.getElementById('card-topic-input');
const cardDescInput = document.getElementById('card-desc-input');
const modalPhotoList = document.getElementById('modal-photo-list');
const deleteCardBtn = document.getElementById('delete-card-btn');
const modalCardTitle = document.getElementById('modal-card-title');

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

// Отрисовка недельной ленты вместо 30 дней
function renderWeek() {
  weekDaysContainer.innerHTML = '';
  
  // Определяем месяц по серединному дню недели
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

// Открытие редактора карточки
function openCardEditor(cardId = null) {
  editingCardId = cardId;
  const dayCards = notes[selectedDateKey]?.cards || [];

  if (cardId) {
    const card = dayCards.find(c => c.id === cardId);
    cardTopicInput.value = card.topic || '';
    cardDescInput.value = card.desc || '';
    currentPhotos = [...(card.photos || [])];
    deleteCardBtn.classList.remove('hidden');
    modalCardTitle.textContent = 'Редактировать карточку';
  } else {
    cardTopicInput.value = '';
    cardDescInput.value = '';
    currentPhotos = [];
    deleteCardBtn.classList.add('hidden');
    modalCardTitle.textContent = 'Новая карточка';
  }

  renderModalPhotos();
  editorOverlay.classList.remove('hidden');
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

// Переключение недель
document.getElementById('prev-week').onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderWeek();
};

document.getElementById('next-week').onclick = () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderWeek();
};

// АНИМАЦИЯ И ЛОГИКА РАДИАЛЬНОГО МЕНЮ
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
      alert('Данные загружены!');
    } catch (err) {
      alert('Ошибка при чтении файла бэкапа.');
    }
  };
  reader.readAsText(file);
};

// ПРОСТОЙ И РАБОЧИЙ AI-ВОПРОС ПО ВСЕМ ЗАПИСЯМ
document.getElementById('opt-ai').onclick = () => {
  radialToggleBtn.classList.remove('active');
  radialOptions.classList.add('hidden');
  document.getElementById('ai-response-area').classList.add('hidden');
  document.getElementById('ai-question-input').value = '';
  aiOverlay.classList.remove('hidden');
};

document.getElementById('close-ai-btn').onclick = () => aiOverlay.classList.add('hidden');

document.getElementById('ai-ask-btn').onclick = () => {
  const query = document.getElementById('ai-question-input').value.trim().toLowerCase();
  const responseArea = document.getElementById('ai-response-area');

  if (!query) return;

  responseArea.textContent = 'Ищу совпадения по карточкам...';
  responseArea.classList.remove('hidden');

  // Локальный поиск по темам и описаниям всех карточек
  let foundCards = [];
  Object.keys(notes).forEach(date => {
    const cards = notes[date].cards || [];
    cards.forEach(card => {
      const t = (card.topic || '').toLowerCase();
      const d = (card.desc || '').toLowerCase();
      if (t.includes(query) || d.includes(query)) {
        foundCards.push({ date, topic: card.topic, desc: card.desc });
      }
    });
  });

  setTimeout(() => {
    if (foundCards.length === 0) {
      responseArea.textContent = `По запросу "${query}" совпадений в карточках не найдено.`;
    } else {
      let resText = `Найдено записей: ${foundCards.length}\n\n`;
      foundCards.forEach(item => {
        resText += `📅 ${item.date}\n• ${item.topic || 'Без темы'}: ${item.desc || ''}\n\n`;
      });
      responseArea.textContent = resText;
    }
  }, 400);
};

// Старт
selectDate(selectedDateKey, new Date());
