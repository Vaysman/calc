// --- Полифилл для lastIndexOfAny ---
// Позволяет найти индекс последнего вхождения любого из символов в строке.
// Используется для проверки, можно ли поставить десятичную точку.
if (!String.prototype.lastIndexOfAny) {
  String.prototype.lastIndexOfAny = function (chars) {
    for (let i = this.length - 1; i >= 0; i--) {
      if (chars.includes(this[i])) {
        return i;
      }
    }
    return -1;
  };
}

// --- Выбор DOM-элементов ---
// Получаем ссылки на элементы интерфейса для дальнейшего взаимодействия.
const currentOperandEl = document.getElementById('current-operand');
const previousOperandEl = document.getElementById('previous-operand');
const buttonsGridEl = document.getElementById('buttons-grid');
const historyContentEl = document.getElementById('history-content');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const clearHistoryContainer = document.getElementById('clear-history-container');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const historyPanel = document.getElementById('history-panel');
const angleModeBtn = document.getElementById('angle-mode-btn');
const memoryIndicatorEl = document.getElementById('memory-indicator');


// --- Управление состоянием ---
// Переменные для хранения текущего состояния калькулятора.
let currentExpression = ''; // Текущее вводимое выражение
let previousExpression = ''; // Предыдущее выражение (для отображения над результатом)
let history = []; // Массив для хранения истории вычислений
let isResultState = false; // Флаг, указывающий, является ли текущее значение на дисплее результатом вычисления
let angleMode = 'rad'; // Текущий режим для тригонометрических функций: 'rad' (радианы) или 'deg' (градусы)
let memoryValue = 0; // Значение, хранящееся в памяти калькулятора

// --- Бизнес-логика ---
// Функция для вычисления факториала числа.
const factorial = (n) => {
  if (n < 0) return NaN; // Факториал отрицательного числа не определен
  if (n === 0) return 1; // Факториал 0 равен 1
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

// Функция для вычисления математического выражения из строки.
const evaluateExpression = (expr) => {
  try {
    // Создаем копию выражения для обработки.
    let sanitizedExpr = expr;

    // Обрабатываем тригонометрические функции с учетом режима RAD/DEG.
    // Используем колбэк-функцию для замены, чтобы преобразовать градусы в радианы при необходимости.
    sanitizedExpr = sanitizedExpr.replace(/(sin|cos|tan)\(([^)]+)\)/g, (match, func, value) => {
        if (angleMode === 'deg') {
            // Если режим 'градусы', конвертируем значение в радианы перед вычислением.
            return `Math.${func}(${value} * Math.PI / 180)`;
        }
        // Если режим 'радианы', оставляем как есть.
        return `Math.${func}(${value})`;
    });

    // Заменяем остальные математические константы и функции на их аналоги в JavaScript Math.
    sanitizedExpr = sanitizedExpr
      .replace(/π/g, 'Math.PI')
      .replace(/e/g, 'Math.E')
      .replace(/\^/g, '**') // Степень
      .replace(/√/g, 'Math.sqrt') // Квадратный корень
      .replace(/log/g, 'Math.log10') // Десятичный логарифм
      .replace(/ln/g, 'Math.log'); // Натуральный логарифм
      
    // Обрабатываем факториал (n!)
    sanitizedExpr = sanitizedExpr.replace(/(\d+(\.\d+)?)!/g, (match, n) => {
      return String(factorial(parseFloat(n)));
    });
    
    // Обрабатываем проценты (n%)
    sanitizedExpr = sanitizedExpr.replace(/(\d+(\.\d+)?)%/g, (match, n) => {
      return `(${parseFloat(n)}/100)`;
    });

    // Используем `new Function` для безопасного вычисления строки.
    // Это безопаснее, чем `eval()`, так как код выполняется в локальной области видимости.
    const result = new Function('return ' + sanitizedExpr)();
    
    // Проверяем, является ли результат корректным числом.
    if (typeof result !== 'number' || !isFinite(result)) {
      return "Ошибка";
    }

    // Форматируем результат до 15 значащих цифр, чтобы избежать ошибок с плавающей запятой.
    return String(Number(result.toPrecision(15)));
  } catch (error) {
    console.error("Ошибка вычисления:", error);
    return "Ошибка"; // Возвращаем "Ошибка" в случае сбоя вычисления.
  }
};

// --- Функции рендеринга ---
// Обновляет дисплей калькулятора.
const updateDisplay = () => {
  currentOperandEl.textContent = currentExpression || '0';
  previousOperandEl.textContent = previousExpression;
};

// Обновляет индикатор памяти (M).
const updateMemoryIndicator = () => {
    if (memoryValue !== 0) {
        memoryIndicatorEl.classList.remove('hidden');
    } else {
        memoryIndicatorEl.classList.add('hidden');
    }
};

// Отображает историю вычислений.
const renderHistory = () => {
  if (history.length === 0) {
    // Если история пуста, показываем заглушку.
    historyContentEl.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-calc-text-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="mt-2 text-center">Истории пока нет</p>
      </div>
    `;
    clearHistoryContainer.classList.add('hidden'); // Скрываем кнопку очистки
  } else {
    const historyList = document.createElement('ul');
    history.forEach(item => {
      const li = document.createElement('li');
      li.className = "p-3 rounded-lg hover:bg-gray-200 cursor-pointer text-right";
      li.innerHTML = `
        <div class="text-calc-text-secondary text-sm break-words">${item.expression} =</div>
        <div class="text-calc-text font-semibold text-lg break-words">${item.result}</div>
      `;
      // Добавляем обработчик клика для использования результата из истории.
      li.addEventListener('click', () => {
          currentExpression = item.result;
          previousExpression = '';
          isResultState = true;
          updateDisplay();
      });
      historyList.appendChild(li);
    });
    historyContentEl.innerHTML = '';
    historyContentEl.appendChild(historyList);
    clearHistoryContainer.classList.remove('hidden'); // Показываем кнопку очистки
  }
};

// --- Обработчики действий ---
// Обрабатывает ввод чисел и констант (π, e).
const handleNumber = (value) => {
    if (isResultState) {
        currentExpression = '';
        isResultState = false;
    }
    const displayValue = value === 'pi' ? 'π' : value === 'e' ? 'e' : value;
    // Проверяем, можно ли добавить десятичную точку.
    if (value === '.' && currentExpression.slice(currentExpression.lastIndexOfAny(['+', '-', '*', '/', '(', ' ']) + 1).includes('.')) {
        return;
    }
    currentExpression += displayValue;
};

// Обрабатывает ввод операторов.
const handleOperator = (value) => {
    isResultState = false;
    currentExpression += value;
};

// Обрабатывает ввод функций.
const handleFunction = (value) => {
    isResultState = false;
    currentExpression += value;
};

// Обрабатывает действия с памятью.
const handleMemory = (action) => {
    let resultNumber = 0;
    // Для M+, M-, MS необходимо вычислить текущее выражение.
    if (['memory-store', 'memory-add', 'memory-subtract'].includes(action)) {
        if (currentExpression.trim() === '') return; // Нельзя работать с пустым выражением
        const result = evaluateExpression(currentExpression);
        if (result === 'Ошибка') {
            currentExpression = 'Ошибка';
            isResultState = true;
            updateDisplay();
            return;
        }
        resultNumber = parseFloat(result);
    }

    switch (action) {
        case 'memory-clear': // MC: Очистить память
            memoryValue = 0;
            break;
        case 'memory-recall': // MR: Вставить значение из памяти
            currentExpression = String(memoryValue);
            isResultState = true; // Считаем это результатом
            break;
        case 'memory-store': // MS: Сохранить результат в память
            memoryValue = resultNumber;
            isResultState = true; // Сохранение - это конечное действие для текущего выражения
            break;
        case 'memory-add': // M+: Прибавить результат к памяти
            memoryValue += resultNumber;
            isResultState = true;
            break;
        case 'memory-subtract': // M-: Вычесть результат из памяти
            memoryValue -= resultNumber;
            isResultState = true;
            break;
    }
    updateMemoryIndicator();
};


// Обрабатывает специальные действия (равно, очистка, удаление, смена режима).
const handleAction = (action) => {
  switch (action) {
    case 'equals':
      if (currentExpression.trim() === '') return;
      const expressionToEvaluate = currentExpression;
      const finalResult = evaluateExpression(expressionToEvaluate);
      
      if (finalResult !== "Ошибка") {
          // Добавляем успешное вычисление в историю.
          history.unshift({ expression: currentExpression, result: finalResult });
          previousExpression = `${currentExpression} =`;
          currentExpression = finalResult;
          isResultState = true;
      } else {
          previousExpression = '';
          currentExpression = 'Ошибка';
          isResultState = true;
      }
      renderHistory(); // Обновляем отображение истории
      break;
    case 'clear':
      currentExpression = '';
      previousExpression = '';
      isResultState = false;
      break;
    case 'backspace':
      if(isResultState) {
        // Если на экране результат, "назад" очищает все.
        currentExpression = '';
        previousExpression = '';
        isResultState = false;
      } else {
        // Иначе удаляет последний символ.
        currentExpression = currentExpression.slice(0, -1);
      }
      break;
    case 'negate':
      // Логика смены знака последнего числа в выражении.
      const parts = currentExpression.split(/([+\-*/(])/);
      let lastPart = parts.pop() || '';
      if (lastPart.startsWith('-')) {
          lastPart = lastPart.substring(1); // Убираем минус
      } else if (lastPart !== '') {
          lastPart = '-' + lastPart; // Добавляем минус
      }
      currentExpression = parts.join('') + lastPart;
      isResultState = false;
      break;
    case 'toggle-angle-mode':
      // Переключаем режим и обновляем текст на кнопке.
      angleMode = angleMode === 'rad' ? 'deg' : 'rad';
      angleModeBtn.textContent = angleMode.toUpperCase();
      break;
  }
};

// --- Прослушиватели событий ---
// Единый обработчик для всех кнопок калькулятора.
buttonsGridEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const { value, type } = button.dataset;

  switch (type) {
    case 'number':
      handleNumber(value);
      break;
    case 'operator':
      handleOperator(value);
      break;
    case 'function':
      handleFunction(value);
      break;
    case 'action':
      handleAction(value);
      break;
    case 'memory':
        handleMemory(value);
        break;
  }
  updateDisplay();
});

// Обработчик кнопки очистки истории.
clearHistoryBtn.addEventListener('click', () => {
  history = [];
  renderHistory();
});

// Обработчик для скрытия/показа панели истории на мобильных устройствах.
toggleHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('hidden');
});

// --- Инициализация ---
// Функция, которая запускается при загрузке страницы.
const initializeApp = () => {
  updateDisplay();
  updateMemoryIndicator();
  renderHistory();
};

initializeApp();