const TSV_URLS = {
    states: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR50RVx4gB1sYBhj10BZOtegk9pu9VHsSfjCN7bp9gn9w1zR-dQwzCxjhvcghnmaOeTdktiU1GguKZM/pubhtml?gid=0&single=true",
    cidades: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR50RVx4gB1sYBhj10BZOtegk9pu9VHsSfjCN7bp9gn9w1zR-dQwzCxjhvcghnmaOeTdktiU1GguKZM/pubhtml?gid=497303681&single=true",
    localization: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR50RVx4gB1sYBhj10BZOtegk9pu9VHsSfjCN7bp9gn9w1zR-dQwzCxjhvcghnmaOeTdktiU1GguKZM/pubhtml?gid=1428568000&single=true"
};

// --- СИСТЕМА ЛОКАЛИЗАЦИИ ---
const translations = {
    portuguese: {},
    english: {}
};
let currentLang = 'portuguese'; // Язык по умолчанию

// Функция, которая ищет перевод по ключу
function t(key) {
    if (!key) return "";
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    return key; // Если перевода нет, вернет сам ключ
}

// Глобальная функция смены языка интерфейса
window.changeLanguage = function(lang) {
    currentLang = lang;
    
    // Обновляем статические тексты в интерфейсе (если добавите ключи для кнопок/заголовков)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });

    // Перерисовываем текущий экран
    if (!screens.stateSelection.classList.contains('hidden')) renderStateSelection();
    // Логику перерисовки самого квиза можно добавить при необходимости
};

// --- НАШИ КЛАССЫ ДАННЫХ ---
class FlagData {
    constructor(url, coord) {
        this.url = url;
        this.coord = coord;
    }
}

class StateData {
    constructor(stateId, nameKey, mottoKey, histKey, capitalKey, flagData) {
        if (!(flagData instanceof FlagData)) throw new Error(`Ошибка во флагах штата ${stateId}`);
        this.state = stateId;
        this.nameKey = nameKey;
        this.mottoKey = mottoKey;
        this.histKey = histKey;
        this.capitalKey = capitalKey;
        this.flagData = flagData;
    }
    // Геттеры автоматически возвращают переведенный текст
    get name() { return t(this.nameKey); }
    get motto() { return t(this.mottoKey); }
    get hist() { return t(this.histKey); }
    get capital() { return t(this.capitalKey); }
}

class CidadeData {
    constructor(cityId, stateId, nameKey, mottoKey, histKey, flagData) {
        if (!(flagData instanceof FlagData)) throw new Error(`Ошибка во флагах города ${nameKey}`);
        this.city = cityId;
        this.state = stateId;
        this.nameKey = nameKey;
        this.mottoKey = mottoKey;
        this.histKey = histKey;
        this.flagData = flagData;
    }
    get name() { return t(this.nameKey); }
    get motto() { return t(this.mottoKey); }
    get hist() { return t(this.histKey); }
}

const quizData = {
    stateData: [],
    cidadeData: []
};

let currentIndex = 0;
let score = 0;
let currentQuizArray = [];

const screens = {
    start: document.getElementById('start-screen'),
    stateSelection: document.getElementById('state-selection-screen'),
    quiz: document.getElementById('quiz-screen'),
    context: document.getElementById('context-screen'),
    result: document.getElementById('result-screen')
};

// --- ФУНКЦИИ ЗАГРУЗКИ ---
function parseTSV(tsvText) {
    const lines = tsvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const headers = lines[0].split('\t');
    
    return lines.slice(1).map(line => {
        const columns = line.split('\t');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = columns[index] || "";
        });
        return obj;
    });
}

async function initializeApp() {
    const startBtn = document.querySelector('#start-screen .primary-btn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerText = "Загрузка...";
    }

    try {
        const [statesRes, cidadesRes, locRes] = await Promise.all([
            fetch(TSV_URLS.states),
            fetch(TSV_URLS.cidades),
            fetch(TSV_URLS.localization)
        ]);

        const statesText = await statesRes.text();
        const cidadesText = await cidadesRes.text();
        const locText = await locRes.text();

        // 1. Сначала парсим локализацию, чтобы словари были готовы
        const parsedLoc = parseTSV(locText);
        parsedLoc.forEach(row => {
            const key = row.ui;
            if (key) {
                translations.portuguese[key] = row.portuguese;
                translations.english[key] = row.english;
            }
        });

        // 2. Парсим Штаты (используем новые имена столбцов: url, coord)
        const parsedStates = parseTSV(statesText);
        parsedStates.forEach(row => {
            const flag = new FlagData(row.url, row.coord);
            const state = new StateData(row.state, row.name, row.motto, row.hist, row.capital, flag);
            quizData.stateData.push(state);
        });

        // 3. Парсим Города
        const parsedCidades = parseTSV(cidadesText);
        parsedCidades.forEach(row => {
            const flag = new FlagData(row.url, row.coord); 
            const city = new CidadeData(row.city, row.state, row.name, row.motto, row.hist, flag);
            quizData.cidadeData.push(city);
        });

        if (startBtn) {
            startBtn.disabled = false;
            // Можно добавить стартовой кнопке ключ в localization таблице
            startBtn.innerText = t("ui_start_btn") || "Начать квиз"; 
        }

    } catch (error) {
        console.error(error);
        if (startBtn) startBtn.innerText = "Ошибка загрузки";
    }
}

// --- ЛОГИКА КВИЗА ---
function hideAllScreens() {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });
}

function startGame() {
    hideAllScreens();
    renderStateSelection();
    screens.stateSelection.classList.remove('hidden');
}

function renderStateSelection() {
    const container = document.getElementById('states-container');
    container.innerHTML = '';
    
    quizData.stateData.forEach(stateObj => {
        const card = document.createElement('div');
        card.className = 'state-card';
        card.onclick = () => startCityQuiz(stateObj.state);
        
        // stateObj.name автоматически переводится геттером внутри класса
        card.innerHTML = `
            <img src="${stateObj.flagData.url}" alt="Флаг">
            <span>${stateObj.name}</span>
        `;
        container.appendChild(card);
    });
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startCityQuiz(stateId) {
    const citiesInState = quizData.cidadeData.filter(city => city.state === stateId);
    
    if (citiesInState.length < 4) {
        alert("Минимум 4 города!");
        return;
    }

    currentQuizArray = shuffleArray(citiesInState);
    currentIndex = 0;
    score = 0;
    
    hideAllScreens();
    document.getElementById('total-q-num').innerText = currentQuizArray.length;
    screens.quiz.classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    const targetCity = currentQuizArray[currentIndex];
    document.getElementById('current-q-num').innerText = currentIndex + 1;
    document.getElementById('flag-image').src = targetCity.flagData.url;
    
    const allCitiesInState = quizData.cidadeData.filter(city => city.state === targetCity.state);
    const otherCities = allCitiesInState.filter(city => city.city !== targetCity.city);
    const wrongCities = shuffleArray(otherCities).slice(0, 3);
    
    // Сохраняем ключи объектов для генерации кнопок
    let optionsObjects = [targetCity, ...wrongCities];
    optionsObjects = shuffleArray(optionsObjects); 
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 
    
    optionsObjects.forEach(cityObj => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        // Имя берется через геттер и переводится автоматически
        btn.innerText = cityObj.name; 
        // Валидация по ID города (city)
        btn.onclick = () => checkAnswer(cityObj.city, targetCity);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedCityId, targetCity) {
    const isCorrect = (selectedCityId === targetCity.city);
    
    if (isCorrect) {
        score++;
        document.getElementById('result-badge').style.backgroundColor = '#009c3b';
        document.getElementById('result-badge').innerText = t("ui_correct") || 'Верно!';
    } else {
        document.getElementById('result-badge').style.backgroundColor = '#ce1126';
        document.getElementById('result-badge').innerText = (t("ui_wrong") || 'Ошибка. Ответ: ') + targetCity.name;
    }

    document.getElementById('context-city-name').innerText = targetCity.name;
    document.getElementById('context-history').innerText = targetCity.hist;
    document.getElementById('context-symbolism').innerText = targetCity.motto; // Вывод девиза 

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

initializeApp();
