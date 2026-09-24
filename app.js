// --- БЕЗОПАСНАЯ РАБОТА С ХРАНИЛИЩЕМ ---
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
  } catch (e) {}
}

let notes = loadStorage();
let viewDate = new Date();
let selectedDateKey = getFormattedKey(new Date());
let selectedMood = '';

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// Элементы
const monthTitle = document.getElementById('month-title');
const calendarDays = document.getElementById('calendar-days');
const selectedDateText = document.getElementById('selected-date-text');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const moodBtns = document.querySelectorAll('.mood-btn');

function getFormattedKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Отрисовка сетки календаря
function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  monthTitle.textContent = `${monthNames[month]} ${year}`;
  calendarDays.innerHTML = '';

  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1; // Коррекция Пн-Вс

  const totalDays = new Date(year, month + 1, 0).getDate();

  // Пустые ячейки в начале месяца
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    calendarDays.appendChild(empty);
  }

  // Заполнение дней
  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day);
    const key = getFormattedKey(dateObj);

    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.textContent = day;

    if (key === selectedDateKey) dayEl.classList.add('selected');
    if (notes[key] && (notes[key].title || notes[key].content)) {
      dayEl.classList.add('has-note');
    }

    dayEl.onclick = () => selectDate(key, dateObj);
    calendarDays.appendChild(dayEl);
  }
}

// Выбор конкретного дня
function selectDate(key, dateObj) {
  selectedDateKey = key;
  selectedDateText.textContent = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const note = notes[key] || { title: '', content: '', mood: '' };
  noteTitle.value = note.title || '';
  noteContent.value = note.content || '';
  setMood(note.mood || '');

  renderCalendar();
}

// Переключение настроения
function setMood(mood) {
  selectedMood = mood;
  moodBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === mood);
  });
  save();
}

moodBtns.forEach(btn => {
  btn.onclick = () => setMood(btn.dataset.mood === selectedMood ? '' : btn.dataset.mood);
});

// Сохранение изменений в текущей заметке
function save() {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title && !content && !selectedMood) {
    delete notes[selectedDateKey];
  } else {
    notes[selectedDateKey] = { title, content, mood: selectedMood };
  }

  saveStorage(notes);
  renderCalendar();
}

noteTitle.oninput = save;
noteContent.oninput = save;

// Переключение месяцев
document.getElementById('prev-month').onclick = () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById('next-month').onclick = () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  renderCalendar();
};

// --- ЭКСПОРТ (Скачать бэкап) ---
document.getElementById('export-btn').onclick = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `diary_backup_${getFormattedKey(new Date())}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// --- ИМПОРТ (Загрузить через кнопку) ---
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
      alert('Записи успешно загружены!');
    } catch (err) {
      alert('Ошибка при чтении файла бэкапа.');
    }
  };
  reader.readAsText(file);
};

// --- ИМПОРТ (Загрузить перетаскиванием файла мышкой для ПК) ---
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        notes = { ...notes, ...importedNotes };
        saveStorage(notes);
        selectDate(selectedDateKey, new Date());
        alert('Записи успешно загружены!');
      } catch (err) {
        alert('Ошибка при чтении файла бэкапа.');
      }
    };
    reader.readAsText(file);
  }
});

// Старт
selectDate(selectedDateKey, new Date());
