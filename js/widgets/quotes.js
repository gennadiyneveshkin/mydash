import * as storage from '../storage.js';

const API_URL = 'https://dummyjson.com/quotes/random';

let state = null;

async function fetchQuote() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export default {
  id: 'quotes',
  title: 'Цитаты',

  init() {
    state = storage.get('quotes', { quote: null, author: null });
  },

  render(container) {
    const textEl = document.createElement('blockquote');
    textEl.className = 'quotes-text';

    const authorEl = document.createElement('div');
    authorEl.className = 'quotes-author';

    const statusEl = document.createElement('div');
    statusEl.className = 'quotes-status';

    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.className = 'quotes-button';
    buttonEl.textContent = 'Новая цитата';

    let loading = false;

    function showState() {
      textEl.textContent = state.quote ? `«${state.quote}»` : '';
      authorEl.textContent = state.author ? `— ${state.author}` : '';
    }

    async function loadQuote() {
      if (loading) return;
      loading = true;
      buttonEl.disabled = true;
      statusEl.textContent = 'Загружаем цитату…';

      try {
        const data = await fetchQuote();
        state = { quote: data.quote, author: data.author };
        storage.set('quotes', state);
        showState();
        statusEl.textContent = '';
      } catch (err) {
        statusEl.textContent = 'Не удалось загрузить цитату: сеть недоступна.';
        showState();
      } finally {
        loading = false;
        buttonEl.disabled = false;
      }
    }

    buttonEl.addEventListener('click', loadQuote);

    container.appendChild(textEl);
    container.appendChild(authorEl);
    container.appendChild(statusEl);
    container.appendChild(buttonEl);

    if (state.quote) {
      showState();
    } else {
      loadQuote();
    }
  },
};
