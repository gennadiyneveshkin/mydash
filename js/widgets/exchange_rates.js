import * as storage from '../storage.js';

const CURRENCIES = ['RUB', 'USD', 'EUR', 'GBP', 'CNY', 'CHF', 'JPY'];
const API_URL = 'https://api.frankfurter.dev/v2/rates';
const REFRESH_MS = 10 * 60 * 1000;

let state = null;
let timer = null;
let elements = null;

function formatRate(rate) {
  return rate >= 100 ? rate.toFixed(2) : rate.toFixed(4);
}

function formatRateLabel(base, quote, rate) {
  return `1 ${base} = ${formatRate(rate)} ${quote}`;
}

async function load() {
  const { base } = state;
  const quotes = CURRENCIES.filter((code) => code !== base).join(',');
  const url = `${API_URL}?base=${base}&quotes=${quotes}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rows = await response.json();
    const rates = Object.fromEntries(rows.map((row) => [row.quote, row.rate]));

    elements.status.textContent = '';
    elements.date.textContent = rows.length
      ? `Курс на ${rows[0].date}`
      : '';

    elements.list.textContent = '';
    quotes.split(',').forEach((quote) => {
      const rate = rates[quote];
      if (rate === undefined) {
        return;
      }

      const item = document.createElement('div');
      item.className = 'rate-item';

      const code = document.createElement('span');
      code.className = 'rate-code';
      code.textContent = quote;

      const value = document.createElement('span');
      value.className = 'rate-value';
      value.textContent = formatRateLabel(base, quote, rate);

      item.appendChild(code);
      item.appendChild(value);
      elements.list.appendChild(item);
    });
  } catch (error) {
    elements.status.textContent = 'Не удалось загрузить курсы';
  }
}

export default {
  id: 'exchange_rates',
  title: 'Курсы валют',

  init() {
    state = storage.get('exchange_rates', { base: 'RUB' });
    if (!CURRENCIES.includes(state.base)) {
      state.base = 'RUB';
    }
  },

  render(container) {
    const header = document.createElement('div');
    header.className = 'rates-header';

    const select = document.createElement('select');
    select.className = 'rates-select';
    CURRENCIES.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code;
      option.selected = code === state.base;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      state.base = select.value;
      storage.set('exchange_rates', state);
      load();
    });

    header.appendChild(select);

    const dateEl = document.createElement('div');
    dateEl.className = 'rates-date';

    const statusEl = document.createElement('div');
    statusEl.className = 'rates-status';

    const list = document.createElement('div');
    list.className = 'rates-list';

    container.appendChild(header);
    container.appendChild(dateEl);
    container.appendChild(statusEl);
    container.appendChild(list);

    elements = { date: dateEl, status: statusEl, list };

    load();
    timer = setInterval(load, REFRESH_MS);
  },
};
