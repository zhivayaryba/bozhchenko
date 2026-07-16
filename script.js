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
    get start() { return document.getElementById('start-screen'); },
    get stateSelection() { return document.getElementById('state-selection-screen'); },
    get quiz() { return document.getElementById('quiz-screen'); },
    get context() { return document.getElementById('context-screen'); },
    get result() { return document.getElementById('result-screen'); }
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
    
    // Заполняем основные данные
    document.getElementById('context-flag-image').src = targetCity.flagData.url;
    document.getElementById('context-city-name').innerText = targetCity.name;
    
    // 1. Устанавливаем Символизм (ранее History)
    document.getElementById('context-symbolism').innerText = targetCity.hist; 
    
    // 2. Логика для Мотто
    const mottoCont = document.getElementById('motto-container');
    const mottoText = targetCity.motto; // Получаем значение из таблицы

// ... (начало функции checkAnswer, заполнение текстов)

    // Запускаем карту, передавая строку координат из вашей таблицы (столбец coord)
    if (targetCity.coord) {
        setupMap(targetCity.coord);
    }

    // Запускаем лупу (нужно убедиться, что у вас в таблице есть колонка coatUrl для гербов)
    // Таймер нужен, чтобы картинка успела отрендериться, и мы знали её размеры (img.width)
    setTimeout(() => {
        initLoupeEffect(targetCity.flagData.url, targetCity.coatUrl);
        // Если Leaflet прятался (был hidden), ему нужно обновить размеры при показе
        if (mapInstance) mapInstance.invalidateSize();
    }, 100);

// ... (показ экрана контекста)
    
    // Проверяем: если t(mottoText) вернуло пустоту или сам текст пуст
    const translatedMotto = t(mottoText);
    
    if (translatedMotto && translatedMotto.trim() !== "") {
        mottoCont.style.display = 'block';
        document.getElementById('context-motto').innerText = translatedMotto;
    } else {
        mottoCont.style.display = 'none';
    }

    // Обработка правильности
    if (isCorrect) {
        score++;
        resultBadge.innerText = t("uid_correct");
    } else {
        resultBadge.innerText = t("uid_wrong") + " " + targetCity.name;
    }

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

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let mapInstance = null; // Храним карту здесь

// --- ФУНКЦИИ ЛУПЫ И КАРТЫ ---

function setupMap(coordString) {
    // Викидата отдает координаты в формате "Point(-51.0227 -27.6108)" [Долгота Широта]
    // Нам нужно достать эти цифры
    const match = coordString.match(/Point\(([^ ]+) ([^)]+)\)/);
    if (!match) return;

    const lon = parseFloat(match[1]);
    const lat = parseFloat(match[2]);

    if (!mapInstance) {
        // Создаем карту в первый раз
        mapInstance = L.map('city-map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
    }
    
    // Переносим камеру на новый город (масштаб 11)
    mapInstance.setView([lat, lon], 11);
    
    // Очищаем старые маркеры и ставим новый
    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker) { mapInstance.removeLayer(layer); }
    });
    L.marker([lat, lon]).addTo(mapInstance);
}

function initLoupeEffect(flagUrl, coatUrl) {
    const container = document.getElementById('flag-zoom-container');
    const lens = document.getElementById('zoom-lens');
    const img = document.getElementById('context-flag-image');

    // Устанавливаем герб как фон линзы
    // Если герба нет, подставляем сам флаг, чтобы лупа просто увеличивала
    const zoomImgUrl = coatUrl || flagUrl; 
    lens.style.backgroundImage = `url('${zoomImgUrl}')`;

    // Устанавливаем масштаб фона в линзе (например, 200% или 300% от размера линзы)
    lens.style.backgroundSize = `${img.width * 1.5}px`; 

    container.onmousemove = function(e) {
        // Получаем позицию мыши внутри контейнера
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Двигаем линзу за курсором
        lens.style.left = x + 'px';
        lens.style.top = y + 'px';

        // Двигаем фон ВНУТРИ линзы в противоположную сторону
        // Чтобы казалось, что мы смотрим на фиксированную картинку
        // Вычисляем процент положения курсора
        const bgPosX = (x / img.width) * 100;
        const bgPosY = (y / img.height) * 100;
        
        lens.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
    };
}
