import clock from './widgets/clock.js';
import weather from './widgets/weather.js';
import notes from './widgets/notes.js';
import todos from './widgets/todos.js';
import pomodoro from './widgets/pomodoro.js';
import quotes from './widgets/quotes.js';
import exchange_rates from './widgets/exchange_rates.js';



const widgets = new Map([
  [clock.id, clock],
  [weather.id, weather],
  [notes.id, notes],
  [todos.id, todos],
  [pomodoro.id, pomodoro],
  [quotes.id, quotes],
  [exchange_rates.id, exchange_rates],
]);

export function getWidget(id) {
  return widgets.get(id);
}

export function getAllWidgets() {
  return [...widgets.values()];
}
