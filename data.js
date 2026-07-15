// 1. Список штатов для меню выбора
const statesData = [
    { 
        id: "sc", 
        name: "Санта-Катарина", 
        flagUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Bandeira_de_Santa_Catarina.svg" 
    },
    { 
        id: "mg", 
        name: "Минас-Жерайс", 
        flagUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f4/Bandeira_de_Minas_Gerais.svg" 
    }
];

// 2. База городов, разбитая по ID штатов
const quizData = {
    "sc": [
        {
            name: "Флорианополис",
            flagUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Bandeira_de_Florian%C3%B3polis.svg/800px-Bandeira_de_Florian%C3%B3polis.svg.png",
            options: ["Жоинвили", "Флорианополис", "Крисиума", "Блуменау"],
            correct: "Флорианополис",
            history: "Основан в 1673 году под названием Носса-Сеньора-ду-Дестерру. Переименован в 1894 году.",
            symbolism: "Красный щит с крестом Ордена Христа отсылает к португальским первооткрывателям."
        }
        // Сюда добавляются другие города Санта-Катарины
    ],
    "mg": [
        {
            name: "Белу-Оризонти",
            flagUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Bandeira_de_Belo_Horizonte.svg/800px-Bandeira_de_Belo_Horizonte.svg.png",
            options: ["Ору-Прету", "Уберландия", "Белу-Оризонти", "Контажен"],
            correct: "Белу-Оризонти",
            history: "Первый запланированный город Бразилии, открытый в 1897 году.",
            symbolism: "Пик Итатиая на фоне восходящего солнца символизирует расположение города."
        }
        // Сюда добавляются другие города Минас-Жерайса
    ]
};
