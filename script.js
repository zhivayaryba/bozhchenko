let currentIndex = 0;
let score = 0;
let currentQuizArray = []; // Сюда загрузятся вопросы выбранного штата

const screens = {
    start: document.getElementById('start-screen'),
    stateSelection: document.getElementById('state-selection-screen'),
    quiz: document.getElementById('quiz-screen'),
    context: document.getElementById('context-screen'),
    result: document.getElementById('result-screen')
};

function hideAllScreens() {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });
}

// Изменено: теперь кнопка Начать открывает выбор штата
function startGame() {
    hideAllScreens();
    renderStateSelection();
    screens.stateSelection.classList.remove('hidden');
}

// Новая функция: отрисовка кнопок штатов
function renderStateSelection() {
    const container = document.getElementById('states-container');
    container.innerHTML = '';
    
    statesData.forEach(state => {
        const card = document.createElement('div');
        card.className = 'state-card';
        card.onclick = () => startCityQuiz(state.id);
        
        card.innerHTML = `
            <img src="${state.flagUrl}" alt="Флаг ${state.name}">
            <span>${state.name}</span>
        `;
        container.appendChild(card);
    });
}

// Новая функция: запуск квиза по конкретному штату
function startCityQuiz(stateId) {
    currentQuizArray = quizData[stateId];
    
    if (!currentQuizArray || currentQuizArray.length === 0) {
        alert("Вопросы для городов этого штата пока не добавлены!");
        return;
    }
    
    currentIndex = 0;
    score = 0;
    
    hideAllScreens();
    document.getElementById('total-q-num').innerText = currentQuizArray.length;
    screens.quiz.classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    const currentData = currentQuizArray[currentIndex];
    document.getElementById('current-q-num').innerText = currentIndex + 1;
    document.getElementById('flag-image').src = currentData.flagUrl;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 
    
    currentData.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = option;
        btn.onclick = () => checkAnswer(option, currentData);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedOption, currentData) {
    const isCorrect = (selectedOption === currentData.correct);
    
    if (isCorrect) {
        score++;
        document.getElementById('result-badge').style.backgroundColor = '#009c3b';
        document.getElementById('result-badge').innerText = 'Верно!';
    } else {
        document.getElementById('result-badge').style.backgroundColor = '#ce1126';
        document.getElementById('result-badge').innerText = `Ошибка. Ответ: ${currentData.correct}`;
    }

    document.getElementById('context-city-name').innerText = currentData.name;
    document.getElementById('context-history').innerText = currentData.history;
    document.getElementById('context-symbolism').innerText = currentData.symbolism;

    hideAllScreens();
    screens.context.classList.remove('hidden');
}

function nextQuestion() {
    currentIndex++;
    hideAllScreens();
    
    if (currentIndex < currentQuizArray.length) {
        screens.quiz.classList.remove('hidden');
        loadQuestion();
    } else {
        document.getElementById('score-display').innerText = score;
        document.getElementById('total-score-display').innerText = currentQuizArray.length;
        screens.result.classList.remove('hidden');
    }
}
