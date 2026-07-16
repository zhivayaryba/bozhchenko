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

    if (screens.stateSelection && !screens.stateSelection.classList.contains('hidden')) {
        renderStateSelection();
    }
    
    // ДОБАВЛЕННЫЙ БЛОК: Динамический перевод текста на экране контекста
    if (screens.context && !screens.context.classList.contains('hidden') && activeTargetCity) {
        document.getElementById('context-symbolism').innerText = activeTargetCity.hist;

        // Логика мотто (бронебойная проверка)
        const mottoCont = document.getElementById('motto-container');
        const mottoKey = activeTargetCity.mottoKey; // Оригинальный ключ из таблицы
        const translatedMotto = activeTargetCity.motto; // Попытка перевода

        // 1. Очищаем от пробелов, табов и \r\n
        const cleanKey = mottoKey ? mottoKey.trim() : "";
        const cleanTranslation = translatedMotto ? translatedMotto.trim() : "";

        // 2. Блокируем, если:
        // - Ключ пустой
        // - Ключ равен "N/A" (если вы так заполняли таблицу)
        // - Перевод равен самому ключу (нет в словаре)
        // - Перевод пустой
        if (!cleanKey || cleanKey.toUpperCase() === "N/A" || cleanTranslation === cleanKey || cleanTranslation === "") {
            mottoCont.style.display = 'none'; // Жестко прячем блок
        } else {
            mottoCont.style.display = 'block';
            document.getElementById('context-motto').innerText = cleanTranslation;
        }
    }
    
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
    constructor(cityId, stateId, nameKey, mottoKey, histKey, flagData, coatUrl) {
        this.city = cityId;
        this.state = stateId;
        this.nameKey = nameKey;
        this.mottoKey = mottoKey;
        this.histKey = histKey;
        this.flagData = flagData;
        this.coatUrl = coatUrl;
    } // <--- ВОТ ЭТА СКОБКА ВЕРОЯТНО БЫЛА УДАЛЕНА!

    get name() { return t(this.nameKey); }
    get motto() { return t(this.mottoKey); }
    get hist() { return t(this.histKey); }
}

const quizData = {
    stateData: [],
    cidadeData: []
};

let currentIndex = 0;
let activeTargetCity = null; // Запоминает город, который мы сейчас рассматриваем
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
            // ВАЖНО: добавили row.coat_url в конец! (Проверьте, чтобы столбец в таблице назывался coat_url)
            const city = new CidadeData(row.city, row.state, row.name, row.motto, row.hist, flag, row.coat_url);
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

    // Запускаем лупу для экрана вопроса
    initLoupeEffect(targetCity.flagData.url, targetCity.coatUrl, 'quiz-flag-zoom-container', 'quiz-zoom-lens', 'flag-image');
    
    const allCitiesInState = quizData.cidadeData.filter(city => city.state === targetCity.state);
    const otherCities = allCitiesInState.filter(city => city.city !== targetCity.city);
    const wrongCities = shuffleArray(otherCities).slice(0, 3);
    
    let optionsObjects = [targetCity, ...wrongCities];
    optionsObjects = shuffleArray(optionsObjects); 
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 
    
    optionsObjects.forEach(cityObj => {
        const btn = document.createElement('button');
        btn.innerText = cityObj.name; // БЫЛО: option.name
        btn.className = 'option-btn'; 
        btn.dataset.id = cityObj.city; // БЫЛО: option.city
        btn.onclick = () => checkAnswer(cityObj.city, targetCity); // БЫЛО: currentTarget
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedCityId, targetCity) {
    activeTargetCity = targetCity; 
    const isCorrect = (selectedCityId === targetCity.city);
    
    // 1. ПОДСВЕТКА КНОПОК
    const options = document.querySelectorAll('#options-container button');
    options.forEach(btn => {
        btn.disabled = true; // Блокируем кнопки от двойного клика
        
        if (btn.dataset.id === targetCity.city) {
            btn.classList.add('correct'); // Всегда подсвечиваем правильный ответ зеленым
        } else if (btn.dataset.id === selectedCityId && !isCorrect) {
            btn.classList.add('wrong'); // Если игрок выбрал этот ответ и он неверный - красным
        }
    });

    // 2. ЖДЕМ 1 СЕКУНДУ И ПЕРЕХОДИМ НА ЭКРАН СПРАВКИ
    setTimeout(() => {
        const resultBadge = document.getElementById('result-badge');
        
        // Заполняем данные контекста
        document.getElementById('context-flag-image').src = targetCity.flagData.url;
        document.getElementById('context-city-name').innerText = targetCity.name;
        document.getElementById('context-symbolism').innerText = targetCity.hist; 
        
        // --- БРОНЕБОЙНАЯ ЛОГИКА МОТТО ---
        const mottoCont = document.getElementById('motto-container');
        const mottoKey = activeTargetCity.mottoKey; 
        const translatedMotto = activeTargetCity.motto; 

        const cleanKey = mottoKey ? mottoKey.trim() : "";
        const cleanTranslation = translatedMotto ? translatedMotto.trim() : "";

        if (!cleanKey || cleanKey.toUpperCase() === "N/A" || cleanTranslation === cleanKey || cleanTranslation === "") {
            mottoCont.style.display = 'none'; // Жестко прячем блок
        } else {
            mottoCont.style.display = 'block';
            document.getElementById('context-motto').innerText = cleanTranslation;
        }
        // --------------------------------

        // Обновляем текст и цвет плашки на экране справки
        if (isCorrect) {
            score++;
            resultBadge.innerText = t("uid_correct");
            resultBadge.className = "badge badge-correct";
        } else {
            resultBadge.innerText = t("uid_wrong") + " " + targetCity.name;
            resultBadge.className = "badge badge-wrong";
        }

        // Показываем экран
        hideAllScreens();
        screens.context.classList.remove('hidden');

        // Даем браузеру 150мс на то, чтобы отрисовать CSS, и только потом рендерим карту и лупу
        setTimeout(() => {
            if (targetCity.coord) {
                setupMap(targetCity.coord);
            }
            // Запускаем лупу для экрана справки (ОБНОВЛЕННЫЙ ВЫЗОВ)
            initLoupeEffect(targetCity.flagData.url, targetCity.coatUrl, 'flag-zoom-container', 'zoom-lens', 'context-flag-image');
        }, 150);

    }, 1000); // 1 секунда задержки
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

// --- ФУНКЦИИ ЛУПЫ И КАРТЫ ---

function setupMap(coordString) {
    const match = coordString.match(/Point\(([^ ]+) ([^)]+)\)/);
    if (!match) return;

    const lon = parseFloat(match[1]);
    const lat = parseFloat(match[2]);

    if (!mapInstance) {
        mapInstance = L.map('city-map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstance);
    }
    
    // Обязательный пересчет размера для Leaflet после снятия display: none
    mapInstance.invalidateSize(); 
    mapInstance.setView([lat, lon], 11);
    
    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker) { mapInstance.removeLayer(layer); }
    });
    L.marker([lat, lon]).addTo(mapInstance);
}

function initLoupeEffect(flagUrl, coatUrl, containerId, lensId, imgId) {
    const container = document.getElementById(containerId);
    const lens = document.getElementById(lensId);
    const img = document.getElementById(imgId);

    if (!container || !lens || !img) return;

    // Защита от пустых ячеек
    const cleanCoatUrl = (coatUrl && coatUrl.trim() !== "") ? coatUrl.trim() : flagUrl;
    lens.style.backgroundImage = `url('${cleanCoatUrl}')`;

    function applyLensSize() {
        // Вычисляем масштаб только если картинка имеет ширину больше 0
        if (img.clientWidth > 0) {
            lens.style.backgroundSize = `${img.clientWidth * 1.5}px`; 
        }
    }

    if (img.complete) {
        applyLensSize();
    } else {
        img.onload = applyLensSize;
    }

    container.onmousemove = function(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        lens.style.left = x + 'px';
        lens.style.top = y + 'px';

        // Двигаем фон ВНУТРИ линзы
        const bgPosX = (x / img.clientWidth) * 100;
        const bgPosY = (y / img.clientHeight) * 100;
        
        lens.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
    };
}
