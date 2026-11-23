import * as storage from './storage.js';

const FORMAT = 'mydash-backup';
const FORMAT_VERSION = 1;

// Собирает все данные приложения в JSON-файл и предлагает его скачать.
export function exportToFile() {
  const payload = {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: storage.getAll(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `mydash-backup-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Читает файл бэкапа, проверяет его и заменяет текущие данные.
// Бросает Error с понятным сообщением — его покажет вызывающий код.
export async function importFromFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('файл не является корректным JSON');
  }

  if (
    !parsed ||
    parsed.format !== FORMAT ||
    typeof parsed.data !== 'object' ||
    parsed.data === null
  ) {
    throw new Error('это не файл резервной копии MyDash');
  }

  if (parsed.version > FORMAT_VERSION) {
    throw new Error(
      `версия бэкапа (${parsed.version}) новее, чем поддерживает приложение (${FORMAT_VERSION})`
    );
  }

  storage.replaceAll(parsed.data);
}
