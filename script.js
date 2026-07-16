const TSV_URLS = {
    states: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR50RVx4gB1sYBhj10BZOtegk9pu9VHsSfjCN7bp9gn9w1zR-dQwzCxjhvcghnmaOeTdktiU1GguKZM/pub?gid=0&single=true&output=tsv",
    cidades: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR50RVx4gB1sYBhj10BZOtegk9pu9VHsSfjCN7bp9gn9w1zR-dQwzCxjhvcghnmaOeTdktiU1GguKZM/pub?gid=497303681&single=true&output=tsv",
    localization: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR50RVx4gB1sYBhj10BZOtegk9pu9VHsSfjCN7bp9gn9w1zR-dQwzCxjhvcghnmaOeTdktiU1GguKZM/pub?gid=1428568000&single=true&output=tsv"
};

// --- СИСТЕМА ЛОКАЛИЗАЦИИ ---
const translations = {
    portuguese: {},
    english: {}
};
let currentLang = 'portuguese';

function t(key) {
    if (!key) return "";
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    return key; 
}

window.changeLanguage = function(lang) {
    currentLang = lang;
    
    // Обновляем все статические тексты на странице
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });

    // БЕЗОПАСНАЯ ПРОВЕРКА: обращаемся к classList только если элемент найден
    if (screens.stateSelection && !screens.stateSelection.classList.contains('hidden')) {
        renderStateSelection();
    }
    
    // Обновляем кнопку старта
    const startBtn = document.getElementById('start-btn');
    if (startBtn && !startBtn.disabled) {
        startBtn.innerText = t("uid_start_btn");
    }
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
        this.state = stateId;
        this.nameKey = nameKey;
        this.mottoKey = mottoKey;
        this.histKey = histKey;
        this.capitalKey = capitalKey;
        this.flagData = flagData;
    }
    get name() { return t(this.nameKey); }
    get motto() { return t(this.mottoKey); }
    get hist() { return t(this.histKey); }
    get capital() { return t(this.capitalKey); }
}

class CidadeData {
    constructor(cityId, stateId, nameKey, mottoKey, histKey, flagData) {
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
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.disabled = true;
        // Заглушка до того, как загрузятся словари (потом переведется)
        startBtn.innerText = "Carregando..."; 
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

        // 1. Локализация
        const parsedLoc = parseTSV(locText);
        parsedLoc.forEach(row => {
            const key = row.ui;
            if (key) {
                translations.portuguese[key] = row.portuguese;
                translations.english[key] = row.english;
            }
        });

        // 2. Штаты
        const parsedStates = parseTSV(statesText);
        parsedStates.forEach(row => {
            const flag = new FlagData(row.url, row.coord);
            const state = new StateData(row.state, row.name, row.motto, row.hist, row.capital, flag);
            quizData.stateData.push(state);
        });

        // 3. Города
        const parsedCidades = parseTSV(cidadesText);
        parsedCidades.forEach(row => {
            const flag = new FlagData(row.url, row.coord); 
            const city = new CidadeData(row.city, row.state, row.name, row.motto, row.hist, flag);
            quizData.cidadeData.push(city);
        });

        // Применяем язык по умолчанию ко всему интерфейсу
        changeLanguage(currentLang);

        if (startBtn) {
            startBtn.disabled = false;
        }

    } catch (error) {
        console.error(error);
        // Если словари не загрузились, обращаемся к t(), но он вернет ключ.
        // Поэтому для ошибки критического сбоя можно оставить хардкод, либо надеяться на словарь.
        if (startBtn) {
            startBtn.innerText = t("uid_error_loading"); 
        }
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
        
        card.innerHTML = `
            <img src="${stateObj.flagData.url}" alt="Flag">
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
        alert(t("uid_error_min_cities"));
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
    
    let optionsObjects = [targetCity, ...wrongCities];
    optionsObjects = shuffleArray(optionsObjects); 
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 
    
    optionsObjects.forEach(cityObj => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = cityObj.name; 
        btn.onclick = () => checkAnswer(cityObj.city, targetCity);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedCityId, targetCity) {
    const isCorrect = (selectedCityId === targetCity.city);
    const resultBadge = document.getElementById('result-badge');
    
    if (isCorrect) {
        score++;
        resultBadge.style.backgroundColor = '#009c3b';
        resultBadge.innerText = t("uid_correct");
    } else {
        resultBadge.style.backgroundColor = '#ce1126';
        resultBadge.innerText = t("uid_wrong") + " " + targetCity.name;
    }

    document.getElementById('context-city-name').innerText = targetCity.name;
    document.getElementById('context-history').innerText = targetCity.hist;
    document.getElementById('context-symbolism').innerText = targetCity.motto;

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
