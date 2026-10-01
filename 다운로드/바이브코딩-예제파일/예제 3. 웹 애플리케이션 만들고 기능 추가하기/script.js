class Calculator {
    constructor(previousOperandTextElement, currentOperandTextElement, historyManager) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.historyManager = historyManager;
        this.clear();
    }

    clear() {
        this.currentOperand = '0';
        this.previousOperand = '';
        this.operation = undefined;
    }

    delete() {
        if (this.currentOperand.length === 1) {
            this.currentOperand = '0';
        } else {
            this.currentOperand = this.currentOperand.toString().slice(0, -1);
        }
    }

    appendNumber(number) {
        if (number === '.' && this.currentOperand.includes('.')) return;
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
    }

    chooseOperation(operation) {
        if (this.currentOperand === '') return;
        if (this.previousOperand !== '') {
            this.compute();
        }
        this.operation = operation;
        this.previousOperand = this.currentOperand;
        this.currentOperand = '0';
    }

    compute() {
        let computation;
        const prev = parseFloat(this.previousOperand);
        const current = parseFloat(this.currentOperand);
        if (isNaN(prev) || isNaN(current)) return;
        switch (this.operation) {
            case '+':
                computation = prev + current;
                break;
            case '-':
                computation = prev - current;
                break;
            case '*':
                computation = prev * current;
                break;
            case '/':
                if (current === 0) {
                    alert("0으로 나눌 수 없습니다.");
                    this.clear();
                    return;
                }
                computation = prev / current;
                break;
            default:
                return;
        }

        // Add to history before resetting operands
        if (this.historyManager) {
            this.historyManager.addEntry(
                `${this.getDisplayNumber(prev)} ${this.operation} ${this.getDisplayNumber(current)}`,
                this.getDisplayNumber(computation)
            );
        }

        this.currentOperand = computation;
        this.operation = undefined;
        this.previousOperand = '';
    }

    getDisplayNumber(number) {
        const stringNumber = number.toString();
        const integerDigits = parseFloat(stringNumber.split('.')[0]);
        const decimalDigits = stringNumber.split('.')[1];
        let integerDisplay;
        if (isNaN(integerDigits)) {
            integerDisplay = '0';
        } else {
            integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
        }
        if (decimalDigits != null) {
            return `${integerDisplay}.${decimalDigits}`;
        } else {
            return integerDisplay;
        }
    }

    updateDisplay() {
        this.currentOperandTextElement.innerText = this.getDisplayNumber(this.currentOperand);
        if (this.operation != null) {
            this.previousOperandTextElement.innerText =
                `${this.getDisplayNumber(this.previousOperand)} ${this.operation}`;
        } else {
            this.previousOperandTextElement.innerText = '';
        }
    }
}

class HistoryManager {
    constructor(listElement) {
        this.listElement = listElement;
        this.history = [];
    }

    addEntry(expression, result) {
        this.history.unshift({ expression, result }); // Add to top
        this.render();
    }

    clear() {
        this.history = [];
        this.render();
    }

    render() {
        this.listElement.innerHTML = '';
        if (this.history.length === 0) {
            this.listElement.innerHTML = '<div class="history-placeholder">No history yet</div>';
            return;
        }

        this.history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-expression">${item.expression}</div>
                <div class="history-result">= ${item.result}</div>
            `;
            // Simplify restoring for now: just copying result to clipboard or console could be enough
            // But let's support loading result to current operand
            div.addEventListener('click', () => {
                // Remove commas for calculation logic
                const rawResult = item.result.replace(/,/g, '');
                calculator.currentOperand = rawResult;
                calculator.updateDisplay();
                toggleHistory(); // Close panel
            });
            this.listElement.appendChild(div);
        });
    }
}

// Fixed Exchange Rates (Fallback)
const EXCHANGE_RATES = {
    "USD": { "KRW": 1400, "JPY": 150, "EUR": 0.95, "CNY": 7.2, "USD": 1 },
    "KRW": { "USD": 0.00071, "JPY": 0.11, "EUR": 0.00068, "CNY": 0.0051, "KRW": 1 },
    "JPY": { "USD": 0.0067, "KRW": 9.3, "EUR": 0.0063, "CNY": 0.048, "JPY": 1 },
    "EUR": { "USD": 1.05, "KRW": 1470, "JPY": 158, "CNY": 7.6, "EUR": 1 },
    "CNY": { "USD": 0.14, "KRW": 194, "JPY": 21, "EUR": 0.13, "CNY": 1 }
};

class CurrencyConverter {
    constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement;
        this.currentOperandTextElement = currentOperandTextElement;
        this.currentOperand = '0';
    }

    clear() {
        this.currentOperand = '0';
        this.updateDisplay();
    }

    delete() {
        if (this.currentOperand.length === 1) {
            this.currentOperand = '0';
        } else {
            this.currentOperand = this.currentOperand.toString().slice(0, -1);
        }
        this.updateDisplay();
        this.convert(); // Live update
    }

    appendNumber(number) {
        if (number === '.' && this.currentOperand.includes('.')) return;
        if (this.currentOperand === '0' && number !== '.') {
            this.currentOperand = number.toString();
        } else {
            this.currentOperand = this.currentOperand.toString() + number.toString();
        }
        this.updateDisplay();
        this.convert(); // Live update
    }

    convert() {
        const fromCurrency = document.getElementById('from-currency').value;
        const toCurrency = document.getElementById('to-currency').value;
        const amount = parseFloat(this.currentOperand);

        if (isNaN(amount)) return;

        const rate = EXCHANGE_RATES[fromCurrency][toCurrency];
        const result = amount * rate;

        this.previousOperandTextElement.innerText = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: toCurrency }).format(result)}`;
    }

    updateDisplay() {
        this.currentOperandTextElement.innerText = this.currentOperand;
    }
}

// Initialization and Mode Switching
const previousOperandTextElement = document.getElementById('previous-operand');
const currentOperandTextElement = document.getElementById('current-operand');
const historyListElement = document.getElementById('history-list');

const historyManager = new HistoryManager(historyListElement);
const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement, historyManager);
const currencyConverter = new CurrencyConverter(previousOperandTextElement, currentOperandTextElement);

// Mode Toggle
const modeBtns = document.querySelectorAll('.mode-btn');
const modes = {
    'calculator': document.getElementById('calculator-mode'),
    'currency': document.getElementById('currency-mode')
};
let currentMode = 'calculator';

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Switch UI
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const modeName = btn.dataset.mode;
        currentMode = modeName;

        Object.values(modes).forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        modes[modeName].style.display = 'block';
        modes[modeName].classList.add('active');

        // Reset Displays
        calculator.clear();
        calculator.updateDisplay();
        currencyConverter.clear();
        previousOperandTextElement.innerText = '';
    });
});

// Calculator Events
document.querySelectorAll('[data-number]').forEach(button => {
    button.addEventListener('click', () => {
        if (currentMode !== 'calculator') return;
        calculator.appendNumber(button.dataset.number);
        calculator.updateDisplay();
    });
});

document.querySelectorAll('[data-operation]').forEach(button => {
    button.addEventListener('click', () => {
        if (currentMode !== 'calculator') return;
        calculator.chooseOperation(button.dataset.operation);
        calculator.updateDisplay();
    });
});

document.querySelector('[data-action="calculate"]').addEventListener('click', () => {
    if (currentMode !== 'calculator') return;
    calculator.compute();
    calculator.updateDisplay();
});

document.querySelector('[data-action="clear-all"]').addEventListener('click', () => {
    if (currentMode !== 'calculator') return;
    calculator.clear();
    calculator.updateDisplay();
});

document.querySelector('[data-action="delete"]').addEventListener('click', () => {
    if (currentMode !== 'calculator') return;
    calculator.delete();
    calculator.updateDisplay();
});

document.querySelector('[data-action="percent"]').addEventListener('click', () => {
    if (currentMode !== 'calculator') return;
    if (calculator.currentOperand === '') return;
    calculator.currentOperand = parseFloat(calculator.currentOperand) / 100;
    calculator.updateDisplay();
});


// Currency Events
document.querySelectorAll('[data-currency-number]').forEach(button => {
    button.addEventListener('click', () => {
        if (currentMode !== 'currency') return;
        currencyConverter.appendNumber(button.dataset.currencyNumber);
    });
});

document.querySelector('[data-currency-action="clear-all"]').addEventListener('click', () => {
    if (currentMode !== 'currency') return;
    currencyConverter.clear();
    previousOperandTextElement.innerText = '';
});

document.querySelector('[data-currency-action="delete"]').addEventListener('click', () => {
    if (currentMode !== 'currency') return;
    currencyConverter.delete();
});

document.querySelectorAll('.currency-select').forEach(select => {
    select.addEventListener('change', () => {
        if (currentMode === 'currency' && currencyConverter.currentOperand !== '0') {
            currencyConverter.convert();
        }
    });
});

// History Logic
const historyBtn = document.getElementById('history-btn');
const historyPanel = document.getElementById('history-panel');
const closeHistoryBtn = document.getElementById('close-history');
const clearHistoryBtn = document.getElementById('clear-history');

function toggleHistory() {
    historyPanel.classList.toggle('open');
}

historyBtn.addEventListener('click', toggleHistory);
closeHistoryBtn.addEventListener('click', toggleHistory);

clearHistoryBtn.addEventListener('click', () => {
    historyManager.clear();
});


// Voice Recognition Logic
const micBtn = document.getElementById('mic-btn');
let recognition;

// Check browser support
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'ko-KR'; // Default to Korean
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.classList.add('recording');
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
    };

    recognition.onresult = (event) => {
        if (currentMode !== 'calculator') return; // Only for calculator mode

        const transcript = event.results[0][0].transcript;
        console.log("Voice Input:", transcript);
        processVoiceCommand(transcript);
    };

    micBtn.addEventListener('click', () => {
        try {
            recognition.start();
        } catch (e) {
            console.error(e);
            recognition.stop();
        }
    });
} else {
    micBtn.style.display = 'none'; // Hide if not supported
    console.log("Speech recognition not supported");
}

function processVoiceCommand(text) {
    // Basic Korean/Math parsing
    // Examples: "1 더하기 2", "5 곱하기 3", "120 나누기 10"
    // Clean spaces
    text = text.replace(/\s+/g, '');

    // Map operators
    text = text.replace(/더하기|plus|\+/g, '+')
        .replace(/빼기|마이너스|minus|\-/g, '-')
        .replace(/곱하기|곱|multiply|\*|x/g, '*')
        .replace(/나누기|나눔|divide|\//g, '/');

    // Extract numbers and operator
    // Regex looking for: Number Operator Number
    const match = text.match(/(\d+)([\+\-\*\/])(\d+)/);

    if (match) {
        const num1 = match[1];
        const operator = match[2];
        const num2 = match[3];

        // Execute directly
        calculator.clear();
        calculator.appendNumber(num1);
        calculator.chooseOperation(operator);
        calculator.appendNumber(num2);
        calculator.compute();
        calculator.updateDisplay();
    } else {
        alert("이해하지 못했습니다: " + text);
    }
}
