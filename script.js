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
    
    // Динамический перевод текста на экране контекста
    if (screens.context && !screens.context.classList.contains('hidden') && activeTargetCity) {
        document.getElementById('context-symbolism').innerText = activeTargetCity.hist;

        // Логика мотто
        const mottoCont = document.getElementById('motto-container');
        const mottoKey = activeTargetCity.mottoKey;
        const translatedMotto = activeTargetCity.motto;

        const cleanKey = mottoKey ? mottoKey.trim() : "";
        const cleanTranslation = translatedMotto ? translatedMotto.trim() : "";

        if (!cleanKey || cleanKey.toUpperCase() === "N/A" || cleanTranslation === cleanKey || cleanTranslation === "") {
            mottoCont.style.display = 'none';
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

class FlagData {
    constructor(url, coord, coatUrl) {
        this.url = url;
        this.coord = coord;
        this.coatUrl = coatUrl;
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
let activeTargetCity = null;
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
            const flag = new FlagData(row.url, row.coord, row.coatUrl); 
            const city = new CidadeData(row.city, row.state, row.name, row.motto, row.hist, flag);
            quizData.cidadeData.push(city);
        });

        changeLanguage(currentLang);

        if (startBtn) {
            startBtn.disabled = false;
        }

        // АКТИВИРУЕМ ЛОГИКУ СТАРТОВОГО ЭКРАНА
        initStartScreen();

    } catch (error) {
        console.error(error);
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

    initLoupeEffect(targetCity.flagData.url, targetCity.flagData.coatUrl, 'quiz-flag-zoom-container', 'quiz-zoom-lens', 'flag-image');
    
    const allCitiesInState = quizData.cidadeData.filter(city => city.state === targetCity.state);
    const otherCities = allCitiesInState.filter(city => city.city !== targetCity.city);
    const wrongCities = shuffleArray(otherCities).slice(0, 3);
    
    let optionsObjects = [targetCity, ...wrongCities];
    optionsObjects = shuffleArray(optionsObjects); 
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 
    
    optionsObjects.forEach(cityObj => {
        const btn = document.createElement('button');
        btn.innerText = cityObj.name; 
        btn.className = 'option-btn'; 
        btn.dataset.id = cityObj.city; 
        btn.onclick = () => checkAnswer(cityObj.city, targetCity); 
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedCityId, targetCity) {
    activeTargetCity = targetCity; 
    const isCorrect = (selectedCityId === targetCity.city);
    
    const options = document.querySelectorAll('#options-container button');
    options.forEach(btn => {
        btn.disabled = true; 
        
        if (btn.dataset.id === targetCity.city) {
            btn.classList.add('correct'); 
        } else if (btn.dataset.id === selectedCityId && !isCorrect) {
            btn.classList.add('wrong'); 
        }
    });

    setTimeout(() => {
        const resultBadge = document.getElementById('result-badge');
        
        document.getElementById('context-flag-image').src = targetCity.flagData.url;
        document.getElementById('context-city-name').innerText = targetCity.name;
        document.getElementById('context-symbolism').innerText = targetCity.hist; 
        
        const mottoCont = document.getElementById('motto-container');
        const mottoKey = activeTargetCity.mottoKey; 
        const translatedMotto = activeTargetCity.motto; 

        const cleanKey = mottoKey ? mottoKey.trim() : "";
        const cleanTranslation = translatedMotto ? translatedMotto.trim() : "";

        if (!cleanKey || cleanKey.toUpperCase() === "N/A" || cleanTranslation === cleanKey || cleanTranslation === "") {
            mottoCont.style.display = 'none'; 
        } else {
            mottoCont.style.display = 'block';
            document.getElementById('context-motto').innerText = cleanTranslation;
        }

        if (isCorrect) {
            score++;
            resultBadge.innerText = t("uid_correct");
            resultBadge.className = "badge badge-correct";
        } else {
            resultBadge.innerText = t("uid_wrong") + " " + targetCity.name;
            resultBadge.className = "badge badge-wrong";
        }

        hideAllScreens();
        screens.context.classList.remove('hidden');

        setTimeout(() => {
            if (targetCity.flagData.coord) {
                setupMap(targetCity.flagData.coord);
            }
            initLoupeEffect(targetCity.flagData.url, targetCity.flagData.coatUrl, 'flag-zoom-container', 'zoom-lens', 'context-flag-image');
        }, 150);

    }, 1000); 
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

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let mapInstance = null; 

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

    const cleanCoatUrl = (coatUrl && coatUrl.trim() !== "") ? coatUrl.trim() : flagUrl;
    
    lens.style.backgroundImage = `url('${cleanCoatUrl}')`;

    function applyLensSize() {
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

        const bgPosX = (x / img.clientWidth) * 100;
        const bgPosY = (y / img.clientHeight) * 100;
        
        lens.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
    };
}

// --- ЛОГИКА СТАРТОВОГО ЭКРАНА ---

function initStartScreen() {
    const container = document.getElementById('start-zoom-container');
    const svg = document.getElementById('start-svg-flag');
    const lens = document.getElementById('start-lens');
    const infoText = document.getElementById('start-info-text');

    if (!container || !svg || !lens || !infoText) return;

    let currentHighlighted = null;
    let zoomFactor = 8; // Начальный зум
    const minZoom = 2;   
    const maxZoom = 20; 

    function refreshLensBackground() {
        let svgData = new XMLSerializer().serializeToString(svg);
        const injectedStyles = `
            <style>
                .active-hitbox {
                    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 1)) brightness(1.5);
                    stroke: white !important;
                    stroke-width: 2px;
                }
            </style>
        `;
        svgData = svgData.replace(/^(<svg[^>]*>)/i, '$1' + injectedStyles);
        const encodedData = encodeURIComponent(svgData);
        lens.style.backgroundImage = `url('data:image/svg+xml;utf8,${encodedData}')`;
    }

    function setZoom(delta) {
        zoomFactor = Math.max(minZoom, Math.min(maxZoom, zoomFactor + delta));
        if (container.clientWidth > 0) {
            lens.style.backgroundSize = `${container.clientWidth * zoomFactor}px ${container.clientHeight * zoomFactor}px`;
        }
    }
    
    refreshLensBackground();
    setTimeout(() => setZoom(0), 100);
    window.addEventListener('resize', () => setZoom(0));

    function updateText(element) {
        const hitbox = element.closest('.hitbox');
        if (hitbox && hitbox.id) {
            infoText.innerText = t(hitbox.id);
        }
    }

    function updateLoupePosition(clientX, clientY) {
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        lens.style.left = (x - lens.offsetWidth / 2) + 'px';
        lens.style.top = (y - lens.offsetHeight / 2) + 'px';

        const bgPosX = (lens.offsetWidth / 2) - (x * zoomFactor);
        const bgPosY = (lens.offsetHeight / 2) - (y * zoomFactor);
        lens.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }

    function clearHighlight() {
        if (currentHighlighted) {
            currentHighlighted.classList.remove('active-hitbox');
            currentHighlighted = null;
            refreshLensBackground();
        }
    }

    function setHighlight(element) {
        const hitbox = element.closest('.hitbox');
        if (hitbox === currentHighlighted) return;
        clearHighlight();
        if (hitbox) {
            currentHighlighted = hitbox;
            currentHighlighted.classList.add('active-hitbox');
            refreshLensBackground(); 
        }
    }
    
    // --- ЛОГИКА ДЛЯ ПК ---
    container.addEventListener('mousemove', (e) => {
        updateLoupePosition(e.clientX, e.clientY);
        lens.style.opacity = '0';
        
        if (e.buttons === 1) {
            lens.style.opacity = '1'; 
            updateText(e.target);
            setHighlight(e.target);
        }
    });
    
    container.addEventListener('mouseup', (e) => {
        updateText(e.target);
        lens.style.opacity = '0';
    });

    container.addEventListener('mouseleave', () => {
        lens.style.opacity = '0';
    });
    
    // СНИЖЕННАЯ ЧУВСТВИТЕЛЬНОСТЬ КОЛЕСИКА (шаг 0.2 вместо 0.5)
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        setZoom(delta);
        updateLoupePosition(e.clientX, e.clientY);
    });

    // --- НОВОЕ: СБРОС ПРИ КЛИКЕ ВНЕ ФЛАГА ---
    document.addEventListener('mousedown', (e) => {
        // Если клик был не внутри контейнера с флагом
        if (!container.contains(e.target)) {
            clearHighlight();
            infoText.innerText = ""; // Очищаем текст
        }
    });

    // --- ЛОГИКА ДЛЯ МОБИЛЬНЫХ ---
    let initialPinchDistance = null;

    function getDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    container.addEventListener('touchstart', (e) => {
        lens.style.opacity = '1';
        if (e.touches.length === 2) {
            initialPinchDistance = getDistance(e.touches);
        }
    });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            updateLoupePosition(touch.clientX, touch.clientY);
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (el) {
                updateText(el);
                setHighlight(el);
            }
        } else if (e.touches.length === 2) {
            const currentDistance = getDistance(e.touches);
            if (initialPinchDistance) {
                // Снижена чувствительность зума двумя пальцами
                const delta = (currentDistance - initialPinchDistance) * 0.01;
                setZoom(delta);
                initialPinchDistance = currentDistance;
            }
        }
    }, { passive: false });

    container.addEventListener('touchend', () => lens.style.opacity = '0');
}

function initInlineSVGLoupe(containerId, lensId, svgId, checkHolding) {
    const container = document.getElementById(containerId);
    const lens = document.getElementById(lensId);
    const svg = document.getElementById(svgId);

    if (!container || !lens || !svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const encodedData = encodeURIComponent(svgData);
    const svgDataUrl = `data:image/svg+xml;utf8,${encodedData}`;
    
    lens.style.backgroundImage = `url('${svgDataUrl}')`;

    function applyLensSize() {
        if (container.clientWidth > 0) {
            lens.style.backgroundSize = `${container.clientWidth * 1.5}px`; 
        }
    }
    applyLensSize();
    window.addEventListener('resize', applyLensSize);

    container.onmousemove = function(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        lens.style.left = x + 'px';
        lens.style.top = y + 'px';

        const bgPosX = (x / container.clientWidth) * 100;
        const bgPosY = (y / container.clientHeight) * 100;
        
        lens.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
    };
}

document.addEventListener('DOMContentLoaded', initializeApp);
