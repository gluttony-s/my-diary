// Безопасное чтение из памати (чтобы Brave не блокировал скрипт)
function loadStorage() {
  try {
    return JSON.parse(localStorage.getItem('my_simple_diary')) || {};
  } catch (e) {
    console.warn('LocalStorage заблокирован защитой браузера');
    return {};
  }
}

function saveStorage(data) {
  try {
    localStorage.setItem('my_simple_diary', JSON.stringify(data));
  } catch (e) {
    console.warn('Не удалось сохранить данные в LocalStorage');
  }
}

let notes = loadStorage();
let viewDate = new Date();
let selectedDateKey = getFormattedKey(new Date());
let selectedMood = '';

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

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
    if (notes[key] && (notes[key].title || notes[key].content)) {
      dayEl.classList.add('has-note');
    }

    dayEl.onclick = () => selectDate(key, dateObj);
    calendarDays.appendChild(dayEl);
  }
}

function selectDate(key, dateObj) {
  selectedDateKey = key;
  selectedDateText.textContent = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const note = notes[key] || { title: '', content: '', mood: '' };
  noteTitle.value = note.title || '';
  noteContent.value = note.content || '';
  setMood(note.mood || '');

  renderCalendar();
}

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

document.getElementById('prev-month').onclick = () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById('next-month').onclick = () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  renderCalendar();
};

selectDate(selectedDateKey, new Date());
