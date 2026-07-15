let currentIndex = 0;
let score = 0;

// Элементы интерфейса
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    context: document.getElementById('context-screen'),
    result: document.getElementById('result-screen')
};

function hideAllScreens() {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
}

function startGame() {
    hideAllScreens();
    document.getElementById('total-q-num').innerText = quizData.length;
    screens.quiz.classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    const currentData = quizData[currentIndex];
    document.getElementById('current-q-num').innerText = currentIndex + 1;
    
    // Загружаем флаг
    document.getElementById('flag-image').src = currentData.flagUrl;
    
    // Генерируем кнопки
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; // Очищаем старые
    
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
        document.getElementById('result-badge').innerText = `Ошибка. Правильный ответ: ${currentData.correct}`;
    }

    // Заполняем историческую справку
    document.getElementById('context-city-name').innerText = currentData.name;
    document.getElementById('context-history').innerText = currentData.history;
    document.getElementById('context-symbolism').innerText = currentData.symbolism;

    // Переключаем экраны
    hideAllScreens();
    screens.context.classList.remove('hidden');
}

function nextQuestion() {
    currentIndex++;
    hideAllScreens();
    
    if (currentIndex < quizData.length) {
        screens.quiz.classList.remove('hidden');
        loadQuestion();
    } else {
        // Конец квиза
        document.getElementById('score-display').innerText = score;
        document.getElementById('total-score-display').innerText = quizData.length;
        screens.result.classList.remove('hidden');
    }
}
