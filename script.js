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
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });

    if (screens.stateSelection && !screens.stateSelection.classList.contains('hidden')) {
        renderStateSelection();
    }
    
    if (screens.context && !screens.context.classList.contains('hidden') && activeTargetCity) {
        document.getElementById('context-symbolism').innerText = activeTargetCity.hist;
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

const quizData = { stateData: [], cidadeData: [] };
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

function parseTSV(tsvText) {
    const lines = tsvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const headers = lines[0].split('\t');
    return lines.slice(1).map(line => {
        const columns = line.split('\t');
        const obj = {};
        headers.forEach((header, index) => { obj[header] = columns[index] || ""; });
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
            fetch(TSV_URLS.states), fetch(TSV_URLS.cidades), fetch(TSV_URLS.localization)
        ]);

        const statesText = await statesRes.text();
        const cidadesText = await cidadesRes.text();
        const locText = await locRes.text();

        const parsedLoc = parseTSV(locText);
        parsedLoc.forEach(row => {
            if (row.ui) {
                translations.portuguese[row.ui] = row.portuguese;
                translations.english[row.ui] = row.english;
            }
        });

        parseTSV(statesText).forEach(row => {
            quizData.stateData.push(new StateData(row.state, row.name, row.motto, row.hist, row.capital, new FlagData(row.url, row.coord)));
        });

        parseTSV(cidadesText).forEach(row => {
            quizData.cidadeData.push(new CidadeData(row.city, row.state, row.name, row.motto, row.hist, new FlagData(row.url, row.coord, row.coatUrl)));
        });

        changeLanguage(currentLang);
        if (startBtn) startBtn.disabled = false;
        initStartScreen();
    } catch (error) {
        console.error(error);
        if (startBtn) startBtn.innerText = t("uid_error_loading"); 
    }
}

function hideAllScreens() {
    Object.values(screens).forEach(screen => { if (screen) screen.classList.add('hidden'); });
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
        card.innerHTML = `<img src="${stateObj.flagData.url}" alt="Flag"><span>${stateObj.name}</span>`;
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
    if (citiesInState.length < 4) { alert(t("uid_error_min_cities")); return; }
    currentQuizArray = shuffleArray(citiesInState);
    currentIndex = 0; score = 0;
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
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; 
    const other = shuffleArray(quizData.cidadeData.filter(c => c.state === targetCity.state && c.city !== targetCity.city)).slice(0, 3);
    shuffleArray([targetCity, ...other]).forEach(cityObj => {
        const btn = document.createElement('button');
        btn.innerText = cityObj.name; btn.className = 'option-btn'; btn.dataset.id = cityObj.city;
        btn.onclick = () => checkAnswer(cityObj.city, targetCity);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedId, targetCity) {
    activeTargetCity = targetCity;
    const isCorrect = (selectedId === targetCity.city);
    document.querySelectorAll('#options-container button').forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.id === targetCity.city) btn.classList.add('correct');
        else if (btn.dataset.id === selectedId && !isCorrect) btn.classList.add('wrong');
    });

    setTimeout(() => {
        document.getElementById('context-flag-image').src = targetCity.flagData.url;
        document.getElementById('context-city-name').innerText = targetCity.name;
        document.getElementById('context-symbolism').innerText = targetCity.hist; 
        
        const mottoCont = document.getElementById('motto-container');
        const mottoKey = activeTargetCity.mottoKey; 
        const transMotto = activeTargetCity.motto; 
        if (!mottoKey || mottoKey.toUpperCase() === "N/A" || transMotto === mottoKey || !transMotto) mottoCont.style.display = 'none';
        else { mottoCont.style.display = 'block'; document.getElementById('context-motto').innerText = transMotto; }

        document.getElementById('result-badge').innerText = isCorrect ? t("uid_correct") : t("uid_wrong") + " " + targetCity.name;
        document.getElementById('result-badge').className = "badge " + (isCorrect ? "badge-correct" : "badge-wrong");
        
        if (isCorrect) score++;
        hideAllScreens();
        screens.context.classList.remove('hidden');
        setTimeout(() => {
            if (targetCity.flagData.coord) setupMap(targetCity.flagData.coord);
            initLoupeEffect(targetCity.flagData.url, targetCity.flagData.coatUrl, 'flag-zoom-container', 'zoom-lens', 'context-flag-image');
        }, 150);
    }, 1000);
}

function setupMap(coordString) {
    const match = coordString.match(/Point\(([^ ]+) ([^)]+)\)/);
    if (!match) return;
    const lon = parseFloat(match[1]), lat = parseFloat(match[2]);
    if (!mapInstance) {
        mapInstance = L.map('city-map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
    }
    mapInstance.invalidateSize(); mapInstance.setView([lat, lon], 11);
    mapInstance.eachLayer(layer => { if (layer instanceof L.Marker) mapInstance.removeLayer(layer); });
    L.marker([lat, lon]).addTo(mapInstance);
}

function initLoupeEffect(flagUrl, coatUrl, containerId, lensId, imgId) {
    const container = document.getElementById(containerId);
    const lens = document.getElementById(lensId);
    const img = document.getElementById(imgId);
    if (!container || !lens || !img) return;
    const cleanCoatUrl = (coatUrl && coatUrl.trim() !== "") ? coatUrl.trim() : flagUrl;
    lens.style.backgroundImage = `url('${cleanCoatUrl}')`;
    function applyLensSize() { if (img.clientWidth > 0) lens.style.backgroundSize = `${img.clientWidth * 1.5}px`; }
    img.complete ? applyLensSize() : img.onload = applyLensSize;
    container.onmousemove = function(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        lens.style.left = x + 'px'; lens.style.top = y + 'px';
        lens.style.backgroundPosition = `${(x / img.clientWidth) * 100}% ${(y / img.clientHeight) * 100}%`;
    };
}

// --- СТАРТОВЫЙ ЭКРАН (ОБНОВЛЕННЫЙ) ---
function initStartScreen() {
    const container = document.getElementById('start-zoom-container');
    const svg = document.getElementById('start-svg-flag');
    const lens = document.getElementById('start-lens');
    const infoText = document.getElementById('start-info-text');
    if (!container || !svg || !lens || !infoText) return;

    let zoomFactor = 8;
    let currentHighlighted = null;

    const svgData = new XMLSerializer().serializeToString(svg);
    lens.style.backgroundImage = `url('data:image/svg+xml;utf8,${encodeURIComponent(svgData)}')`;

    function setZoom(delta) {
        zoomFactor = Math.max(2, Math.min(20, zoomFactor + delta));
        lens.style.backgroundSize = `${container.clientWidth * zoomFactor}px ${container.clientHeight * zoomFactor}px`;
    }

    function updateText(element) {
        const hitbox = element.closest('.hitbox');
        if (hitbox && hitbox.id) infoText.innerText = t(hitbox.id);
    }

    function setHighlight(element) {
        const hitbox = element.closest('.hitbox');
        if (hitbox && hitbox !== currentHighlighted) {
            if (currentHighlighted) currentHighlighted.classList.remove('active-hitbox');
            currentHighlighted = hitbox;
            currentHighlighted.classList.add('active-hitbox');
        }
    }

    function updateLoupe(clientX, clientY) {
        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left, y = clientY - rect.top;
        lens.style.left = (x - lens.offsetWidth / 2) + 'px';
        lens.style.top = (y - lens.offsetHeight / 2) + 'px';
        lens.style.backgroundPosition = `${(lens.offsetWidth / 2) - (x * zoomFactor)}px ${(lens.offsetHeight / 2) - (y * zoomFactor)}px`;
    }

    container.addEventListener('mousemove', (e) => {
        lens.style.opacity = '1';
        updateLoupe(e.clientX, e.clientY);
        setHighlight(e.target);
        if (e.buttons === 1) updateText(e.target);
    });

    container.addEventListener('mousedown', (e) => updateText(e.target));
    container.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(e.deltaY < 0 ? 0.5 : -0.5); });
    container.addEventListener('mouseleave', () => { lens.style.opacity = '0'; if (currentHighlighted) currentHighlighted.classList.remove('active-hitbox'); });
    container.addEventListener('mouseenter', () => lens.style.opacity = '1');

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        updateLoupe(touch.clientX, touch.clientY);
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el) { setHighlight(el); updateText(el); }
    }, { passive: false });
    
    container.addEventListener('touchstart', () => lens.style.opacity = '1');
    container.addEventListener('touchend', () => lens.style.opacity = '0');
}
