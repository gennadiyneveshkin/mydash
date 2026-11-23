import * as storage from '../storage.js';

const ID = 'pomodoro';
const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const PHASE_SECONDS = {
  work: WORK_SECONDS,
  break: BREAK_SECONDS,
};

let state = null;
let timerId = null;

function defaultState() {
  return {
    phase: 'work',   // 'work' | 'break'
    remaining: WORK_SECONDS,
    running: false,
    cycles: 0,
  };
}

// Старые сохранённые состояния могут не содержать поле phase —
// в таком случае начинаем с чистого листа, а не работаем сломанно
function isValidState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value.phase === 'work' || value.phase === 'break') &&
    typeof value.remaining === 'number' &&
    Number.isFinite(value.remaining) &&
    value.remaining >= 0 &&
    typeof value.running === 'boolean' &&
    typeof value.cycles === 'number' &&
    Number.isFinite(value.cycles) &&
    value.cycles >= 0
  );
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function save() {
  storage.set(ID, state);
}

// Сбрасываем интервал, чтобы тики не задваивались
// при повторном render() или повторном старте
function stopTicker() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

export default {
  id: ID,
  title: 'Таймер',

  init() {
    const saved = storage.get(ID, defaultState());
    state = isValidState(saved) ? saved : defaultState();
    // Страховка: не даём remaining выйти за длительность текущей фазы
    state.remaining = Math.min(state.remaining, PHASE_SECONDS[state.phase]);
  },

  render(container) {
    const timeEl = document.createElement('div');
    timeEl.className = 'pomodoro-time';

    const statusEl = document.createElement('div');
    statusEl.className = 'pomodoro-status';

    const cyclesEl = document.createElement('div');
    cyclesEl.className = 'pomodoro-cycles';

    const controls = document.createElement('div');
    controls.className = 'pomodoro-controls';

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'pomodoro-btn pomodoro-btn-start';
    startBtn.textContent = 'Старт';

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'pomodoro-btn pomodoro-btn-pause';
    pauseBtn.textContent = 'Пауза';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'pomodoro-btn pomodoro-btn-reset';
    resetBtn.textContent = 'Сброс';

    controls.appendChild(startBtn);
    controls.appendChild(pauseBtn);
    controls.appendChild(resetBtn);

    function update() {
      timeEl.textContent = formatTime(state.remaining);

      const phaseFull = PHASE_SECONDS[state.phase];
      statusEl.textContent = state.running
        ? (state.phase === 'work' ? 'Работа' : 'Отдых')
        : (state.remaining === phaseFull ? 'Готов к работе' : 'Пауза');
      statusEl.classList.toggle('pomodoro-status--work', state.phase === 'work');
      statusEl.classList.toggle('pomodoro-status--break', state.phase === 'break');

      cyclesEl.textContent = `Завершённых циклов: ${state.cycles}`;

      startBtn.disabled = state.running;
      pauseBtn.disabled = !state.running;
    }

    function tick() {
      if (state.remaining > 0) {
        state.remaining -= 1;
      } else {
        // Фаза отработала: секунду показываем 00:00, затем переключаемся.
        // Счётчик растёт только на завершении рабочей фазы — без задваивания
        if (state.phase === 'work') {
          state.cycles += 1;
          state.phase = 'break';
          state.remaining = BREAK_SECONDS;
        } else {
          state.phase = 'work';
          state.remaining = WORK_SECONDS;
        }
      }
      save();
      update();
    }

    function startTicker() {
      stopTicker();
      timerId = setInterval(tick, 1000);
    }

    startBtn.addEventListener('click', () => {
      if (state.running) return;
      state.running = true;
      save();
      update();
      startTicker();
    });

    pauseBtn.addEventListener('click', () => {
      if (!state.running) return;
      stopTicker();
      state.running = false;
      save();
      update();
    });

    resetBtn.addEventListener('click', () => {
      stopTicker();
      state = defaultState();
      save();
      update();
    });

    container.appendChild(timeEl);
    container.appendChild(statusEl);
    container.appendChild(cyclesEl);
    container.appendChild(controls);

    update();
    if (state.running) {
      startTicker();
    }
  },
};
