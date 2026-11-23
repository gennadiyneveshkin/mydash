import * as storage from '../storage.js';

let state = null;

function save() {
  storage.set('todos', state);
}

export default {
  id: 'todos',
  title: 'Список дел',

  init() {
    state = storage.get('todos', []);
    if (!Array.isArray(state)) {
      state = [];
    }
  },

  render(container) {
    const form = document.createElement('form');
    form.className = 'todos-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todos-input';
    input.placeholder = 'Новая задача...';

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'todos-add-btn';
    addBtn.textContent = 'Добавить';

    form.appendChild(input);
    form.appendChild(addBtn);

    const list = document.createElement('ul');
    list.className = 'todos-list';

    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'todos-empty';
    emptyMsg.textContent = 'Задач пока нет';

    container.appendChild(form);
    container.appendChild(list);
    container.appendChild(emptyMsg);

    function createItem(task) {
      const item = document.createElement('li');
      item.className = 'todos-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todos-checkbox';
      checkbox.checked = task.done;

      const text = document.createElement('span');
      text.className = task.done ? 'todos-text todos-text--done' : 'todos-text';
      text.textContent = task.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'todos-delete-btn';
      deleteBtn.textContent = '\u00d7';
      deleteBtn.setAttribute('aria-label', 'Удалить задачу');

      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        text.className = task.done ? 'todos-text todos-text--done' : 'todos-text';
        save();
      });

      deleteBtn.addEventListener('click', () => {
        state = state.filter((t) => t.id !== task.id);
        save();
        renderList();
      });

      item.appendChild(checkbox);
      item.appendChild(text);
      item.appendChild(deleteBtn);
      return item;
    }

    function renderList() {
      list.textContent = '';
      state.forEach((task) => {
        list.appendChild(createItem(task));
      });
      if (state.length === 0) {
        emptyMsg.textContent = 'Задач пока нет';
        emptyMsg.hidden = false;
      } else {
        emptyMsg.hidden = true;
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) {
        return;
      }
      state.push({ id: String(Date.now()) + String(Math.random()), text: text, done: false });
      save();
      input.value = '';
      renderList();
      input.focus();
    });

    renderList();
  },
};
