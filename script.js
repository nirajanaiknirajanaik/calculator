/**
 * Modern Web Calculator Engine - Niraja's creaction
 * Featuring Single-Line Display and Speech Synthesis Voice + Audio Feedback
 */
class Calculator {
  constructor() {
    // DOM Elements
    this.calcLineElem = document.getElementById('calcLine');
    this.singleLineDisplay = document.getElementById('singleLineDisplay');
    this.displayArea = document.getElementById('displayArea');
    this.copyToast = document.getElementById('copyToast');

    // History DOM
    this.historyPanel = document.getElementById('historyPanel');
    this.historyList = document.getElementById('historyList');
    this.historyToggleBtn = document.getElementById('historyToggle');
    this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Controls DOM
    this.themeToggleBtn = document.getElementById('themeToggle');
    this.soundToggleBtn = document.getElementById('soundToggle');

    // Calculator State
    this.firstOperand = '0';
    this.operator = null;
    this.secondOperand = null;
    this.result = null;
    this.isCalculated = false;

    this.history = JSON.parse(localStorage.getItem('calc_history') || '[]');
    this.soundEnabled = localStorage.getItem('calc_sound') !== 'false';
    this.audioCtx = null;
    this.selectedVoice = null;

    this.init();
  }

  init() {
    this.initSpeech();
    this.initTheme();
    this.initSoundToggle();
    this.initButtons();
    this.initKeyboard();
    this.initHistory();
    this.initDisplayCopy();
    this.updateDisplay();
    this.renderHistory();
  }

  /* -------------------------------------------------------------------------
     Speech Synthesis & Voice Setup
     ------------------------------------------------------------------------- */
  initSpeech() {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          // Find natural English voice if possible
          this.selectedVoice = voices.find(v =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('David'))
          ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  speak(text, rate = 1.05) {
    if (!this.soundEnabled) return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  }

  getOperatorWord(op) {
    switch (op) {
      case '+':
        return 'plus';
      case '−':
      case '-':
        return 'minus';
      case '×':
      case '*':
        return 'times';
      case '÷':
      case '/':
        return 'divided by';
      default:
        return op;
    }
  }

  speakEquation(operand1, op, operand2, result) {
    if (!this.soundEnabled) return;
    const opWord = this.getOperatorWord(op);
    let textToSay = '';
    if (result === 'Cannot divide by 0') {
      textToSay = `${operand1} ${opWord} ${operand2} equals cannot divide by zero`;
    } else {
      textToSay = `${operand1} ${opWord} ${operand2} equals ${result}`;
    }

    // Give a brief moment for the chime chord to sound first
    setTimeout(() => {
      this.speak(textToSay, 0.95);
    }, 90);
  }

  /* -------------------------------------------------------------------------
     Theme Management
     ------------------------------------------------------------------------- */
  initTheme() {
    const savedTheme = localStorage.getItem('calc_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    this.themeToggleBtn.addEventListener('click', () => {
      this.playFeedback('fn');
      const current = document.body.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', nextTheme);
      localStorage.setItem('calc_theme', nextTheme);
      this.updateThemeIcon(nextTheme);
    });
  }

  updateThemeIcon(theme) {
    const icon = this.themeToggleBtn.querySelector('.theme-icon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
      this.themeToggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
    }
  }

  /* -------------------------------------------------------------------------
     Sound & Voice Controls
     ------------------------------------------------------------------------- */
  initSoundToggle() {
    this.updateSoundIcon();
    this.soundToggleBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      localStorage.setItem('calc_sound', this.soundEnabled);
      this.updateSoundIcon();

      if (this.soundEnabled) {
        this.playFeedback('fn');
        this.speak('Voice on');
      } else {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    });
  }

  updateSoundIcon() {
    const icon = this.soundToggleBtn.querySelector('.sound-icon');
    if (icon) {
      icon.textContent = this.soundEnabled ? '🔊' : '🔇';
      this.soundToggleBtn.classList.toggle('active', this.soundEnabled);
      this.soundToggleBtn.setAttribute('title', this.soundEnabled ? 'Mute Voice & Sound' : 'Enable Voice & Sound');
    }
  }

  playFeedback(type = 'num') {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'equals') {
        // Melodic two-note chord for calculation result
        const chordFreqs = [523.25, 659.25]; // C5 and E5
        chordFreqs.forEach((freq) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.16);
        });
        return;
      }

      // Single tone for clicks
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      let freq = 600;
      let duration = 0.04;

      switch (type) {
        case 'num':
          freq = 600;
          break;
        case 'op':
          freq = 820;
          break;
        case 'fn':
          freq = 520;
          break;
        case 'error':
          freq = 240;
          duration = 0.12;
          break;
      }

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio fallback
    }
  }

  /* -------------------------------------------------------------------------
     Button Click Handlers
     ------------------------------------------------------------------------- */
  initButtons() {
    const buttons = document.querySelectorAll('.calc-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const val = btn.dataset.value;

        switch (action) {
          case 'number':
            this.playFeedback('num');
            this.speak(val);
            this.inputNumber(val);
            break;
          case 'decimal':
            this.playFeedback('num');
            this.speak('point');
            this.inputDecimal();
            break;
          case 'operator':
            this.playFeedback('op');
            this.speak(this.getOperatorWord(val));
            this.inputOperator(val);
            break;
          case 'equals':
            this.calculate();
            break;
          case 'clear':
            this.playFeedback('fn');
            this.speak('clear');
            this.clearAll();
            break;
          case 'delete':
            this.playFeedback('fn');
            this.speak('delete');
            this.backspace();
            break;
          case 'percent':
            this.playFeedback('fn');
            this.speak('percent');
            this.applyPercent();
            break;
          case 'negate':
            this.playFeedback('fn');
            this.speak('negative');
            this.toggleNegate();
            break;
        }

        this.highlightActiveOperator();
        this.updateDisplay();
      });
    });
  }

  /* -------------------------------------------------------------------------
     Keyboard Support
     ------------------------------------------------------------------------- */
  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;

      if (key >= '0' && key <= '9') {
        this.triggerButtonVisual(`[data-key="${key}"]`);
        this.playFeedback('num');
        this.speak(key);
        this.inputNumber(key);
      } else if (key === '.' || key === ',') {
        this.triggerButtonVisual('[data-key="."]');
        this.playFeedback('num');
        this.speak('point');
        this.inputDecimal();
      } else if (key === '+' || key === '-') {
        const symbol = key === '-' ? '−' : '+';
        this.triggerButtonVisual(`[data-key="${key}"]`);
        this.playFeedback('op');
        this.speak(this.getOperatorWord(symbol));
        this.inputOperator(symbol);
      } else if (key === '*' || key.toLowerCase() === 'x') {
        this.triggerButtonVisual('[data-key="*"]');
        this.playFeedback('op');
        this.speak('times');
        this.inputOperator('×');
      } else if (key === '/') {
        e.preventDefault(); // Stop quick find in browsers
        this.triggerButtonVisual('[data-key="/"]');
        this.playFeedback('op');
        this.speak('divided by');
        this.inputOperator('÷');
      } else if (key === '%') {
        this.triggerButtonVisual('[data-key="%"]');
        this.playFeedback('fn');
        this.speak('percent');
        this.applyPercent();
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        this.triggerButtonVisual('[data-key="Enter"]');
        this.calculate();
      } else if (key === 'Backspace') {
        this.triggerButtonVisual('[data-key="Backspace"]');
        this.playFeedback('fn');
        this.speak('delete');
        this.backspace();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        this.triggerButtonVisual('[data-key="Escape"]');
        this.playFeedback('fn');
        this.speak('clear');
        this.clearAll();
      } else if (key.toLowerCase() === 'n') {
        this.triggerButtonVisual('[data-key="n"]');
        this.playFeedback('fn');
        this.speak('negative');
        this.toggleNegate();
      }

      this.highlightActiveOperator();
      this.updateDisplay();
    });
  }

  triggerButtonVisual(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.classList.add('key-active');
      setTimeout(() => btn.classList.remove('key-active'), 120);
    }
  }

  highlightActiveOperator() {
    const opButtons = document.querySelectorAll('.calc-btn.op');
    opButtons.forEach((btn) => {
      if (this.operator && this.secondOperand === null && !this.isCalculated && btn.dataset.value === this.operator) {
        btn.classList.add('operator-active');
      } else {
        btn.classList.remove('operator-active');
      }
    });
  }

  /* -------------------------------------------------------------------------
     Core Single-Line Calculator Logic
     ------------------------------------------------------------------------- */
  inputNumber(num) {
    if (this.isCalculated) {
      this.firstOperand = num;
      this.operator = null;
      this.secondOperand = null;
      this.result = null;
      this.isCalculated = false;
      return;
    }

    if (this.operator === null) {
      if (this.firstOperand === '0' || this.firstOperand === 'Error' || this.firstOperand === 'Cannot divide by 0') {
        this.firstOperand = num;
      } else if (this.firstOperand.length < 15) {
        this.firstOperand += num;
      }
    } else {
      if (this.secondOperand === null || this.secondOperand === '0') {
        this.secondOperand = num;
      } else if (this.secondOperand.length < 15) {
        this.secondOperand += num;
      }
    }
  }

  inputDecimal() {
    if (this.isCalculated) {
      this.firstOperand = '0.';
      this.operator = null;
      this.secondOperand = null;
      this.result = null;
      this.isCalculated = false;
      return;
    }

    if (this.operator === null) {
      if (!this.firstOperand.includes('.')) {
        this.firstOperand += '.';
      }
    } else {
      if (this.secondOperand === null) {
        this.secondOperand = '0.';
      } else if (!this.secondOperand.includes('.')) {
        this.secondOperand += '.';
      }
    }
  }

  inputOperator(op) {
    if (this.isCalculated) {
      if (this.result === 'Cannot divide by 0' || this.result === 'Error') {
        this.clearAll();
        return;
      }
      this.firstOperand = this.result;
      this.operator = op;
      this.secondOperand = null;
      this.result = null;
      this.isCalculated = false;
      return;
    }

    if (this.firstOperand === 'Cannot divide by 0' || this.firstOperand === 'Error') {
      this.clearAll();
      return;
    }

    if (this.operator !== null && this.secondOperand === null) {
      this.operator = op;
      return;
    }

    if (this.operator !== null && this.secondOperand !== null) {
      const interimResult = this.computeMath(this.firstOperand, this.operator, this.secondOperand);
      if (interimResult === 'Cannot divide by 0') {
        this.result = interimResult;
        this.isCalculated = true;
        this.playFeedback('error');
        this.speakEquation(this.firstOperand, this.operator, this.secondOperand, interimResult);
        return;
      }

      this.saveHistory({
        full: `${this.formatDisplayNumber(this.firstOperand)} ${this.operator} ${this.formatDisplayNumber(this.secondOperand)} = ${this.formatDisplayNumber(interimResult)}`,
        result: interimResult
      });
      this.firstOperand = interimResult;
      this.operator = op;
      this.secondOperand = null;
      return;
    }

    this.operator = op;
  }

  calculate() {
    if (this.operator === null || this.secondOperand === null) {
      // If user presses equals with only one operand, speak the number
      if (this.firstOperand && !this.isCalculated) {
        this.playFeedback('equals');
        this.speak(`equals ${this.firstOperand}`);
      }
      return;
    }

    if (this.isCalculated) {
      // Re-read current equation if already calculated
      this.playFeedback('equals');
      this.speakEquation(this.firstOperand, this.operator, this.secondOperand, this.result);
      return;
    }

    const res = this.computeMath(this.firstOperand, this.operator, this.secondOperand);
    this.result = res;
    this.isCalculated = true;

    if (res === 'Cannot divide by 0') {
      this.playFeedback('error');
    } else {
      this.playFeedback('equals');
    }

    // Voice narration: reads input1 + symbol + input2 + equals + output!
    this.speakEquation(this.firstOperand, this.operator, this.secondOperand, res);

    // Save to history
    this.saveHistory({
      full: `${this.formatDisplayNumber(this.firstOperand)} ${this.operator} ${this.formatDisplayNumber(this.secondOperand)} = ${this.formatDisplayNumber(res)}`,
      result: res
    });
  }

  computeMath(operand1, op, operand2) {
    const a = parseFloat(operand1);
    const b = parseFloat(operand2);

    if (isNaN(a) || isNaN(b)) return 'Error';

    let raw;
    switch (op) {
      case '+':
        raw = a + b;
        break;
      case '−':
      case '-':
        raw = a - b;
        break;
      case '×':
      case '*':
        raw = a * b;
        break;
      case '÷':
      case '/':
        if (b === 0) return 'Cannot divide by 0';
        raw = a / b;
        break;
      default:
        return 'Error';
    }

    return String(this.formatFloat(raw));
  }

  formatFloat(num) {
    if (Number.isInteger(num)) return num;
    return parseFloat(num.toPrecision(12));
  }

  backspace() {
    if (this.isCalculated) {
      this.result = null;
      this.isCalculated = false;
      return;
    }

    if (this.secondOperand !== null) {
      if (this.secondOperand.length > 1 && !(this.secondOperand.length === 2 && this.secondOperand.startsWith('-'))) {
        this.secondOperand = this.secondOperand.slice(0, -1);
      } else {
        this.secondOperand = null;
      }
    } else if (this.operator !== null) {
      this.operator = null;
    } else {
      if (this.firstOperand.length > 1 && !(this.firstOperand.length === 2 && this.firstOperand.startsWith('-'))) {
        this.firstOperand = this.firstOperand.slice(0, -1);
      } else {
        this.firstOperand = '0';
      }
    }
  }

  clearAll() {
    this.firstOperand = '0';
    this.operator = null;
    this.secondOperand = null;
    this.result = null;
    this.isCalculated = false;
  }

  toggleNegate() {
    if (this.isCalculated) {
      if (this.result !== 'Cannot divide by 0' && this.result !== 'Error' && this.result !== '0') {
        const negated = String(this.formatFloat(-parseFloat(this.result)));
        this.firstOperand = negated;
        this.operator = null;
        this.secondOperand = null;
        this.result = null;
        this.isCalculated = false;
      }
      return;
    }

    if (this.secondOperand !== null) {
      if (this.secondOperand !== '0') {
        this.secondOperand = this.secondOperand.startsWith('-')
          ? this.secondOperand.substring(1)
          : '-' + this.secondOperand;
      }
    } else {
      if (this.firstOperand !== '0' && this.firstOperand !== 'Cannot divide by 0') {
        this.firstOperand = this.firstOperand.startsWith('-')
          ? this.firstOperand.substring(1)
          : '-' + this.firstOperand;
      }
    }
  }

  applyPercent() {
    if (this.isCalculated) {
      if (this.result !== 'Cannot divide by 0' && this.result !== 'Error') {
        const pct = String(this.formatFloat(parseFloat(this.result) / 100));
        this.firstOperand = pct;
        this.operator = null;
        this.secondOperand = null;
        this.result = null;
        this.isCalculated = false;
      }
      return;
    }

    if (this.secondOperand !== null) {
      const val = parseFloat(this.secondOperand);
      if (!isNaN(val)) {
        if (this.operator === '+' || this.operator === '−') {
          const base = parseFloat(this.firstOperand);
          this.secondOperand = String(this.formatFloat((base * val) / 100));
        } else {
          this.secondOperand = String(this.formatFloat(val / 100));
        }
      }
    } else {
      const val = parseFloat(this.firstOperand);
      if (!isNaN(val)) {
        this.firstOperand = String(this.formatFloat(val / 100));
      }
    }
  }

  /* -------------------------------------------------------------------------
     Display Formatting & Auto-scroll
     ------------------------------------------------------------------------- */
  formatDisplayNumber(strVal) {
    if (strVal === null || strVal === undefined) return '';
    if (strVal === 'Cannot divide by 0' || strVal === 'Error') return strVal;

    const parts = String(strVal).split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    const formattedInteger = Number(integerPart).toLocaleString('en-US');
    if (isNaN(Number(integerPart))) return strVal;

    return formattedInteger + decimalPart;
  }

  updateDisplay() {
    let html = '';
    let rawText = '';

    if (this.isCalculated) {
      const formattedFirst = this.formatDisplayNumber(this.firstOperand);
      const formattedSecond = this.formatDisplayNumber(this.secondOperand);

      if (this.result === 'Cannot divide by 0' || this.result === 'Error') {
        html = `<span class="expr-subdued">${formattedFirst} <span class="op-symbol">${this.operator}</span> ${formattedSecond}</span> <span class="eq-symbol">=</span> <span class="error-val">${this.result}</span>`;
        rawText = `${formattedFirst} ${this.operator} ${formattedSecond} = ${this.result}`;
      } else {
        const formattedRes = this.formatDisplayNumber(this.result);
        html = `<span class="expr-subdued">${formattedFirst} <span class="op-symbol">${this.operator}</span> ${formattedSecond}</span> <span class="eq-symbol">=</span> <span class="result-val">${formattedRes}</span>`;
        rawText = `${formattedFirst} ${this.operator} ${formattedSecond} = ${formattedRes}`;
      }
    } else if (this.operator !== null && this.secondOperand !== null) {
      const formattedFirst = this.formatDisplayNumber(this.firstOperand);
      const formattedSecond = this.formatDisplayNumber(this.secondOperand);
      html = `<span>${formattedFirst}</span> <span class="op-symbol">${this.operator}</span> <span>${formattedSecond}</span>`;
      rawText = `${formattedFirst} ${this.operator} ${formattedSecond}`;
    } else if (this.operator !== null) {
      const formattedFirst = this.formatDisplayNumber(this.firstOperand);
      html = `<span>${formattedFirst}</span> <span class="op-symbol">${this.operator}</span>`;
      rawText = `${formattedFirst} ${this.operator}`;
    } else {
      const formattedFirst = this.formatDisplayNumber(this.firstOperand);
      html = `<span>${formattedFirst}</span>`;
      rawText = `${formattedFirst}`;
    }

    this.calcLineElem.innerHTML = html;

    // Dynamic Font Scaling
    const len = rawText.length;
    this.calcLineElem.classList.remove('font-md', 'font-sm', 'font-xs');
    if (len > 20) {
      this.calcLineElem.classList.add('font-xs');
    } else if (len > 15) {
      this.calcLineElem.classList.add('font-sm');
    } else if (len > 11) {
      this.calcLineElem.classList.add('font-md');
    }

    // Auto-scroll to far right
    requestAnimationFrame(() => {
      this.singleLineDisplay.scrollLeft = this.singleLineDisplay.scrollWidth;
    });
  }

  /* -------------------------------------------------------------------------
     Copy to Clipboard
     ------------------------------------------------------------------------- */
  initDisplayCopy() {
    this.displayArea.addEventListener('click', () => {
      let textToCopy = this.isCalculated && this.result !== 'Cannot divide by 0' && this.result !== 'Error'
        ? this.result
        : (this.secondOperand || this.firstOperand);

      if (!textToCopy || textToCopy === 'Cannot divide by 0' || textToCopy === 'Error') return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        this.copyToast.textContent = `Copied: ${this.formatDisplayNumber(textToCopy)}`;
        this.copyToast.classList.add('show');
        setTimeout(() => this.copyToast.classList.remove('show'), 1500);
      }).catch(() => {});
    });
  }

  /* -------------------------------------------------------------------------
     History Management
     ------------------------------------------------------------------------- */
  initHistory() {
    this.historyToggleBtn.addEventListener('click', () => {
      this.playFeedback('fn');
      this.historyPanel.classList.toggle('open');
      this.historyPanel.setAttribute('aria-hidden', !this.historyPanel.classList.contains('open'));
    });

    this.closeHistoryBtn.addEventListener('click', () => {
      this.playFeedback('fn');
      this.historyPanel.classList.remove('open');
      this.historyPanel.setAttribute('aria-hidden', 'true');
    });

    this.clearHistoryBtn.addEventListener('click', () => {
      this.playFeedback('fn');
      this.speak('history cleared');
      this.history = [];
      localStorage.removeItem('calc_history');
      this.renderHistory();
    });
  }

  saveHistory(item) {
    this.history.unshift(item);
    if (this.history.length > 50) this.history.pop();
    localStorage.setItem('calc_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    if (!this.history || this.history.length === 0) {
      this.historyList.innerHTML = '<div class="empty-history">No calculations yet</div>';
      return;
    }

    this.historyList.innerHTML = '';
    this.history.forEach((item) => {
      const entry = document.createElement('div');
      entry.className = 'history-item';
      entry.innerHTML = `
        <div class="hist-expr">${item.full}</div>
      `;

      entry.addEventListener('click', () => {
        this.playFeedback('num');
        this.firstOperand = String(item.result);
        this.operator = null;
        this.secondOperand = null;
        this.result = null;
        this.isCalculated = false;
        this.speak(String(item.result));
        this.updateDisplay();
        this.historyPanel.classList.remove('open');
      });

      this.historyList.appendChild(entry);
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  new Calculator();
});
