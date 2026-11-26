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

// Все доступные темы: id, иконка для кнопки в шапке и подпись
const THEMES = [
  { id: 'light', icon: '☀️', label: 'Светлая' },
  { id: 'dark', icon: '🌙', label: 'Тёмная' },
  { id: 'ocean', icon: '🌊', label: 'Океан' },
  { id: 'megapolis', icon: '🏙️', label: 'Мегаполис' },
];

// Старые сохранённые конфиги могут содержать только light/dark,
// а битые значения приводим к light, чтобы страница не осталась без темы
function getThemeClass(theme) {
  return THEMES.some((t) => t.id === theme) ? `theme-${theme}` : 'theme-light';
}

function applyTheme(theme) {
  const themeClass = getThemeClass(theme);
  const themeClasses = THEMES.map((t) => `theme-${t.id}`);

  document.body.classList.remove(...themeClasses);
  document.body.classList.add(themeClass);

  const cards = document.querySelectorAll('.widget-card');
  cards.forEach((card) => {
    card.classList.remove(...themeClasses);
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
    card.classList.add(getThemeClass(theme));
    // Идентификатор карточки нужен перетаскиванию: по нему читаем порядок из DOM
    card.dataset.widgetId = id;

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
    const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
    toggle.textContent = current.icon;
    toggle.title = `Стиль: ${current.label} (нажмите, чтобы сменить)`;
    toggle.setAttribute('aria-label', toggle.title);
  }

  updateButton(config.settings?.theme ?? 'light');

  toggle.addEventListener('click', () => {
    const currentId = config.settings?.theme ?? 'light';
    // Крутим список тем по кругу: light -> dark -> ocean -> megapolis -> light
    const index = THEMES.findIndex((t) => t.id === currentId);
    const next = THEMES[(index + 1) % THEMES.length];

    config.settings = config.settings ?? {};
    config.settings.theme = next.id;
    saveConfig(config);
    applyTheme(next.id);
    updateButton(next.id);
  });
}


// Перетаскивание карточек виджетов мышью.
// Drag включается только пока зажата мышь на заголовке карточки:
// иначе HTML5 drag конфликтует с текстовыми полями, кнопками и выделением текста.
function initWidgetDragAndDrop(config) {
  const grid = document.getElementById('widget-grid');
  if (!grid) return;

  // Защита от задвоения обработчиков при повторном вызове
  if (grid.dataset.reorderBound) return;
  grid.dataset.reorderBound = 'true';

  let dragCard = null;

  grid.addEventListener('mousedown', (e) => {
    const title = e.target.closest('.widget-title');
    const card = title ? title.closest('.widget-card') : null;

    grid.querySelectorAll('.widget-card').forEach((c) => c.removeAttribute('draggable'));
    if (card) {
      card.setAttribute('draggable', 'true');
      dragCard = card;
    }
  });

  // Клик по заголовку без перетаскивания: снимаем drag-режим
  document.addEventListener('mouseup', () => {
    grid.querySelectorAll('.widget-card').forEach((c) => c.removeAttribute('draggable'));
    dragCard = null;
  });

  grid.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.widget-card');
    if (card) card.classList.add('widget-card--dragging');
  });

  // Живая перестановка: карточка встаёт до или после цели
  // в зависимости от того, в какой половине цели находится курсор
  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragCard) return;

    const target = e.target.closest('.widget-card');
    if (!target || target === dragCard) return;

    const rect = target.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    if (after) {
      target.after(dragCard);
    } else {
      target.before(dragCard);
    }
  });

  grid.addEventListener('drop', (e) => e.preventDefault());

  grid.addEventListener('dragend', () => {
    if (!dragCard) return;
    dragCard.classList.remove('widget-card--dragging');
    dragCard = null;

    // Читаем фактический порядок карточек из DOM и сохраняем в конфиг:
    // порядок переживает перезагрузку и попадает в экспорт/импорт
    const ids = [...grid.querySelectorAll('.widget-card')]
      .map((card) => card.dataset.widgetId)
      .filter(Boolean);

    if (ids.length) {
      config.widgets = ids;
      saveConfig(config);
    }
  });
}

// Кнопки «Экспорт» и «Импорт»
function initBackup() {
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.hidden = true;

  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;

    const ok = confirm('Импорт заменит все текущие настройки и данные виджетов. Продолжить?');
    if (!ok) return;

    try {
      await importFromFile(file);
      location.reload();
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  });

  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const controls = document.querySelector('.controls');

  if (controls && exportBtn && importBtn) {
    // Кнопки размечены в index.html внутри <header> — только навешиваем обработчики.
    exportBtn.addEventListener('click', () => exportToFile());
    importBtn.addEventListener('click', () => importInput.click());

    // Выравниваем шапку по горизонтальной геометрии сетки виджетов,
    // чтобы правый край кнопок совпадал с правым краем блоков.
    const header = controls.closest('header');
    const grid = document.getElementById('widget-grid');
    if (header && grid) {
      const syncHeaderWidth = () => {
        const gridStyle = getComputedStyle(grid);
        header.style.maxWidth = grid.offsetWidth + 'px';
        header.style.marginLeft = gridStyle.marginLeft;
        header.style.marginRight = gridStyle.marginRight;
      };

      syncHeaderWidth();
      window.addEventListener('resize', syncHeaderWidth);
    }
  } else {
    // Запасной вариант, если в index.html разметки кнопок нет:
    // панель создаётся скриптом и вставляется в шапку, а не в body.
    const themeToggle = document.getElementById('theme-toggle');

    const fallbackControls = document.createElement('div');
    fallbackControls.className = 'controls';

    const fallbackExport = document.createElement('button');
    fallbackExport.className = 'backup-btn';
    fallbackExport.textContent = 'Экспорт';
    fallbackExport.addEventListener('click', () => exportToFile());

    const fallbackImport = document.createElement('button');
    fallbackImport.className = 'backup-btn';
    fallbackImport.textContent = 'Импорт';
    fallbackImport.addEventListener('click', () => importInput.click());

    fallbackControls.appendChild(fallbackExport);
    fallbackControls.appendChild(fallbackImport);
    if (themeToggle) {
      fallbackControls.appendChild(themeToggle);
    }

    const header =
      document.querySelector('.app-header') || document.querySelector('header');
    if (header) {
      header.appendChild(fallbackControls);
    } else {
      document.body.appendChild(fallbackControls);
    }
  }

  document.body.appendChild(importInput);
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
    initWidgetDragAndDrop(currentConfig);
  } catch {
    showError('Не удалось загрузить конфиг. Проверьте data/default-config.json и откройте страницу через локальный сервер (не file://)');
    currentConfig = { widgets: [], settings: { theme: 'light' } };
    applyTheme('light');
    initThemeToggle(currentConfig);
  }

  initBackup();
}

main();
