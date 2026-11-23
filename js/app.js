import * as storage from './storage.js';
import { getWidget } from './registry.js';
import { exportToFile, importFromFile } from './backup.js';

let currentConfig = null;

async function loadConfig() {
  const saved = storage.get('config');
  if (saved) {
    return saved;
  }

  const response = await fetch('data/default-config.json');
  const text = await response.text();
  return JSON.parse(text);
}

function saveConfig(config) {
  storage.set('config', config);
}

function applyTheme(theme) {
  const themeClass = theme === 'dark' ? 'theme-dark' : 'theme-light';
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(themeClass);

  const cards = document.querySelectorAll('.widget-card');
  cards.forEach((card) => {
    card.classList.remove('theme-light', 'theme-dark');
    card.classList.add(themeClass);
  });
}

function renderWidgetGrid(widgetIds, config) {
  const grid = document.getElementById('widget-grid');
  grid.innerHTML = '';

  const theme = config.settings?.theme ?? 'light';

  for (const id of widgetIds) {
    const widget = getWidget(id);
    if (!widget) continue;

    const card = document.createElement('article');
    card.className = 'widget-card';
    card.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');

    const title = document.createElement('h2');
    title.className = 'widget-title';
    title.textContent = widget.title;

    const body = document.createElement('div');
    body.className = 'widget-body';

    card.appendChild(title);
    card.appendChild(body);
    grid.appendChild(card);

    widget.init(config);
    widget.render(body);
  }
}

function initThemeToggle(config) {
  const toggle = document.getElementById('theme-toggle');

  function updateButton(theme) {
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  updateButton(config.settings?.theme ?? 'light');

  toggle.addEventListener('click', () => {
    const current = config.settings?.theme ?? 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    config.settings = config.settings ?? {};
    config.settings.theme = next;
    saveConfig(config);
    applyTheme(next);
    updateButton(next);
  });
}

// Кнопки «Экспорт» и «Импорт» создаются здесь и ставятся рядом
// с кнопкой переключения темы (в её родительский контейнер).
function initBackup() {
  const exportBtn = document.createElement('button');
  exportBtn.className = 'backup-btn';
  exportBtn.textContent = 'Экспорт';

  const importBtn = document.createElement('button');
  importBtn.className = 'backup-btn';
  importBtn.textContent = 'Импорт';

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.hidden = true;
  document.body.appendChild(importInput);

  const toggle = document.getElementById('theme-toggle');
  const toolbar = toggle ? toggle.parentElement : document.body;
  toolbar.appendChild(exportBtn);
  toolbar.appendChild(importBtn);

  exportBtn.addEventListener('click', () => {
    try {
      exportToFile();
    } catch (err) {
      alert('Не удалось экспортировать настройки: ' + err.message);
    }
  });

  importBtn.addEventListener('click', () => importInput.click());

  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;

    const ok = confirm(
      'Импорт заменит все текущие настройки и данные виджетов. Продолжить?'
    );
    if (!ok) return;

    try {
      await importFromFile(file);
      location.reload();
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  });
}

function showError(message) {
  const grid = document.getElementById('widget-grid');
  grid.innerHTML = '';
  const el = document.createElement('p');
  el.className = 'error-message';
  el.textContent = message;
  grid.appendChild(el);
}

async function main() {
  try {
    currentConfig = await loadConfig();
    applyTheme(currentConfig.settings?.theme ?? 'light');
    renderWidgetGrid(currentConfig.widgets, currentConfig);
    initThemeToggle(currentConfig);
  } catch {
    showError('Не удалось загрузить конфиг. Проверьте data/default-config.json и откройте страницу через локальный сервер (не file://)');
    currentConfig = { widgets: [], settings: { theme: 'light' } };
    applyTheme('light');
    initThemeToggle(currentConfig);
  }

  initBackup();
}

main();
