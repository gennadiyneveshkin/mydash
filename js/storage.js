const PREFIX = 'mydash-';

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

// Возвращает все данные приложения одним объектом { ключ: значение }.
// Ключи других приложений в localStorage не затрагиваются.
export function getAll() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const fullKey = localStorage.key(i);
    if (!fullKey.startsWith(PREFIX)) continue;
    const key = fullKey.slice(PREFIX.length);
    data[key] = get(key);
  }
  return data;
}

// Полная замена данных приложения данными из бэкапа.
// Сначала удаляем всё своё, потом пишем из переданного объекта.
export function replaceAll(data) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const fullKey = localStorage.key(i);
    if (fullKey.startsWith(PREFIX)) remove(fullKey.slice(PREFIX.length));
  }
  for (const [key, value] of Object.entries(data)) {
    set(key, value);
  }
}
