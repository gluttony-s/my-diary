// База данных в LocalStorage (ключ — дата формата YYYY-MM-DD)
let diaryData = JSON.parse(localStorage.getItem('my_book_diary')) || {};

// Текущее состояние
let currentDate = new Date();
let currentSelectedDateKey = formatDateKey(new Date());
let selectedMood = '😊';

// Месяцы для шапки
const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Элементы UI
const calendarScreen = document.getElementById('calendar-screen');
const bookScreen = document.getElementById('book-screen');
const viewCalendarBtn = document.getElementById('view-calendar-btn');
const viewBookBtn = document.getElementById('view-book-btn');

const calendarDays = document.getElementById('calendar-days');
const currentMonthLabel = document.getElementById('current-month-label');

const pageCard = document.getElementById('page-card');
const entryDateBadge = document.getElementById('entry-date');
const titleInput = document.getElementById('entry-title');
const contentInput = document.getElementById('entry-content');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДАТЫ ---
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateKey) {
  const [y, m, d] = dateKey.split('-');
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// --- РЕНДЕР КАЛЕНДАРЯ ---
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  currentMonthLabel.textContent = `${monthNames[month]} ${year}`;
  calendarDays.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  // Приводим воскресенье (0) к евро-стандарту (7)
  const shift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = formatDateKey(new Date());

  // Пустые ячейки в начале
  for (let i = 0; i < shift; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    calendarDays.appendChild(emptyCell);
  }

  // Заполнение дней
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dateKey = formatDateKey(dateObj);
    const entry = diaryData[dateKey];

    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    if (dateKey === todayKey) dayCell.classList.add('today');
    if (entry) dayCell.classList.add('has-entry');

    dayCell.innerHTML = `<span>${day}</span>`;
    if (entry && entry.mood) {
      dayCell.innerHTML += `<span class="mood-dot">${entry.mood}</span>`;
    }

    dayCell.onclick = () => {
      currentSelectedDateKey = dateKey;
      openPage(dateKey);
      switchScreen('book');
    };

    calendarDays.appendChild(dayCell);
  }
}

// --- ЛИСТАНИЕ И РЕДАКТИРОВАНИЕ СТРАНИЦ ---
function openPage(dateKey) {
  entryDateBadge.textContent = formatDateDisplay(dateKey);
  const entry = diaryData[dateKey] || { title: '', content: '', mood: '😊' };

  titleInput.value = entry.title || '';
  contentInput.value = entry.content || '';
  setMood(entry.mood || '😊');
}

function setMood(mood) {
  selectedMood = mood;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === mood);
  });
  saveCurrentPage();
}

function saveCurrentPage() {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title && !content) {
    delete diaryData[currentSelectedDateKey];
  } else {
    diaryData[currentSelectedDateKey] = {
      title: title,
      content: content,
      mood: selectedMood
    };
  }

  localStorage.setItem('my_book_diary', JSON.stringify(diaryData));
  renderCalendar();
}

titleInput.oninput = saveCurrentPage;
contentInput.oninput = saveCurrentPage;

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.onclick = () => setMood(btn.dataset.mood);
});

// Анимация перелистывания (Вперед / Назад)
function flipPage(direction) {
  const [y, m, d] = currentSelectedDateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  if (direction === 'next') {
    dateObj.setDate(dateObj.getDate() + 1);
    pageCard.classList.add('flip-next');
  } else {
    dateObj.setDate(dateObj.getDate() - 1);
    pageCard.classList.add('flip-prev');
  }

  setTimeout(() => {
    currentSelectedDateKey = formatDateKey(dateObj);
    openPage(currentSelectedDateKey);
    pageCard.classList.remove('flip-next', 'flip-prev');
  }, 200);
}

document.getElementById('prev-day-btn').onclick = () => flipPage('prev');
document.getElementById('next-day-btn').onclick = () => flipPage('next');

// Очистить страницу
document.getElementById('delete-btn').onclick = () => {
  delete diaryData[currentSelectedDateKey];
  localStorage.setItem('my_book_diary', JSON.stringify(diaryData));
  openPage(currentSelectedDateKey);
  renderCalendar();
};

// Переключение месяцев в календаре
document.getElementById('prev-month-btn').onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById('next-month-btn').onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

// --- ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ ---
function switchScreen(screenName) {
  if (screenName === 'calendar') {
    calendarScreen.classList.add('active');
    bookScreen.classList.remove('active');
    viewCalendarBtn.classList.add('active');
    viewBookBtn.classList.remove('active');
  } else {
    bookScreen.classList.add('active');
    calendarScreen.classList.remove('active');
    viewBookBtn.classList.add('active');
    viewCalendarBtn.classList.remove('active');
  }
}

viewCalendarBtn.onclick = () => switchScreen('calendar');
viewBookBtn.onclick = () => switchScreen('book');

// Инициализация
renderCalendar();
openPage(currentSelectedDateKey);