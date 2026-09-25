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
let viewDate = new Date();
let selectedDateKey = getFormattedKey(new Date());

let editingCardId = null;
let currentPhotos = [];

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// DOM элементы
const monthTitle = document.getElementById('month-title');
const calendarDays = document.getElementById('calendar-days');
const selectedDateTitle = document.getElementById('selected-date-title');
const cardsContainer = document.getElementById('cards-container');
const moodBtns = document.querySelectorAll('.mood-btn');

// Оверлеи
const editorOverlay = document.getElementById('editor-overlay');
const menuOverlay = document.getElementById('menu-overlay');
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

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  monthTitle.textContent = `${monthNames[month]} ${year}`;
  calendarDays.innerHTML = '';

  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    calendarDays.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day);
    const key = getFormattedKey(dateObj);

    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.textContent = day;

    if (key === selectedDateKey) dayEl.classList.add('selected');
    
    // Точка в календаре если есть хоть одна карточка или настроение
    if (notes[key] && ((notes[key].cards && notes[key].cards.length > 0) || notes[key].mood)) {
      dayEl.classList.add('has-note');
    }

    dayEl.onclick = () => selectDate(key, dateObj);
    calendarDays.appendChild(dayEl);
  }

  renderCards();
}

function selectDate(key, dateObj) {
  selectedDateKey = key;
  selectedDateTitle.textContent = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const dayData = notes[selectedDateKey] || { mood: '', cards: [] };
  setMood(dayData.mood || '');

  renderCalendar();
}

function renderCards() {
  cardsContainer.innerHTML = '';
  const dayData = notes[selectedDateKey];

  if (!dayData || !dayData.cards || dayData.cards.length === 0) {
    cardsContainer.innerHTML = '<div style="color:#71717a; font-size:13px; text-align:center; padding:12px;">Нет карточек на этот день. Нажми +, чтобы добавить.</div>';
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

// Настроение
function setMood(mood) {
  if (!notes[selectedDateKey]) notes[selectedDateKey] = { mood: '', cards: [] };
  notes[selectedDateKey].mood = mood;

  moodBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === mood);
  });

  saveStorage(notes);
  renderCalendar();
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

// Загрузка фото в карточку
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
  renderCalendar();
};

// Удаление карточки
deleteCardBtn.onclick = () => {
  if (!editingCardId || !notes[selectedDateKey]) return;

  notes[selectedDateKey].cards = notes[selectedDateKey].cards.filter(c => c.id !== editingCardId);
  saveStorage(notes);

  editorOverlay.classList.add('hidden');
  renderCalendar();
};

// Кнопка добавления карточки (+)
document.getElementById('add-card-btn').onclick = () => openCardEditor(null);
document.getElementById('close-editor-btn').onclick = () => editorOverlay.classList.add('hidden');

// Управление меню
document.getElementById('menu-btn').onclick = () => menuOverlay.classList.remove('hidden');
document.getElementById('close-menu-btn').onclick = () => menuOverlay.classList.add('hidden');

// Переключение месяцев
document.getElementById('prev-month').onclick = () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById('next-month').onclick = () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  renderCalendar();
};

// Экспорт / Импорт
document.getElementById('export-btn').onclick = () => {
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
      alert('Записи с карточками успешно загружены!');
    } catch (err) {
      alert('Ошибка при чтении файла бэкапа.');
    }
  };
  reader.readAsText(file);
};

// AI Чат
document.getElementById('ai-chat-btn').onclick = () => {
  menuOverlay.classList.add('hidden');
  aiOverlay.classList.remove('hidden');
};
document.getElementById('close-ai-btn').onclick = () => aiOverlay.classList.add('hidden');

document.getElementById('ai-send-btn').onclick = () => {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text) return;

  const messagesDiv = document.getElementById('ai-messages');
  
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.textContent = text;
  messagesDiv.appendChild(userMsg);

  input.value = '';

  setTimeout(() => {
    const aiMsg = document.createElement('div');
    aiMsg.className = 'msg ai';
    aiMsg.textContent = `Анализирую карточки дня по запросу: "${text}"...`;
    messagesDiv.appendChild(aiMsg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, 600);
};

selectDate(selectedDateKey, new Date());
