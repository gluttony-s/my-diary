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

  // Формируем историю сообщений в формате Google Gemini API
  const contentsPayload = [];
  
  // Добавляем прошлые сообщения (без статуса "Думаю...")
  for (let i = 0; i < chatHistory.length - 1; i++) {
    const item = chatHistory[i];
    contentsPayload.push({
      role: item.role === 'user' ? 'user' : 'model',
      parts: [{ text: item.text }]
    });
  }

  // Системный контекст (инструкция) передается отдельно
  const systemInstruction = {
    parts: [{
      text: `Ты персональный ассистент по личным записям дневника. 
Вот вся история записей пользователя из дневника:
${diaryContext}

Используй эту информацию, чтобы точно и кратко отвечать на вопросы пользователя.`
    }]
  };

  // Пробуем универсальные и актуальные эндпоинты
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash'
  ];

  let aiReplyText = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemInstruction,
          contents: contentsPayload
        })
      });

      const data = await res.json();

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        aiReplyText = data.candidates[0].content.parts[0].text;
        break; // Успешно получили ответ — выходим из цикла
      }

      // Если модель не найдена (404), цикл просто идет к следующей модели в списке
    } catch (e) {
      // Игнорируем сетевую ошибку для отдельной модели и пробуем следующую
    }
  }

  // Обновляем ответ AI в чате
  chatHistory[chatHistory.length - 1].text = aiReplyText || 'Не удалось получить ответ. Проверь API ключ и VPN.';
  renderChat();
};
