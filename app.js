/**
 * app.js — Shopping List Logic
 * Handles: add / toggle / delete / persist (localStorage)
 */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  const list        = document.getElementById('item-list');
  const input       = document.getElementById('new-item-input');
  const addBtn      = document.getElementById('add-btn');
  const clearBtn    = document.getElementById('clear-checked-btn');
  const emptyState  = document.getElementById('empty-state');
  const dateEl      = document.getElementById('current-date');

  // ── State ───────────────────────────────────────────────────
  const STORAGE_KEY = 'shopping-list-items';
  let items = [];   // [{ id, text, checked }]

  // ── Init ────────────────────────────────────────────────────
  function init() {
    // Show today's date on the page
    dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    // Load persisted items
    loadItems();
    renderAll();

    // Event listeners
    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAdd();
    });
    clearBtn.addEventListener('click', handleClearChecked);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // silently fail if SW is unavailable (e.g. file:// protocol)
      });
    }
  }

  // ── Storage ─────────────────────────────────────────────────
  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      items = raw ? JSON.parse(raw) : [];
    } catch {
      items = [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or unavailable — no crash
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function updateUI() {
    const hasItems   = items.length > 0;
    const hasChecked = items.some(i => i.checked);
    emptyState.classList.toggle('hidden', hasItems);
    clearBtn.classList.toggle('visible', hasChecked);
    saveItems();
  }

  // ── Render ──────────────────────────────────────────────────
  function renderAll() {
    list.innerHTML = '';
    items.forEach(item => list.appendChild(createItemEl(item)));
    updateUI();
  }

  function createItemEl(item) {
    const li = document.createElement('li');
    li.className = 'item' + (item.checked ? ' checked' : '');
    li.dataset.id = item.id;

    // Checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'item-checkbox';
    cb.checked = item.checked;
    cb.setAttribute('aria-label', `Marcar "${item.text}" como ${item.checked ? 'não ' : ''}feito`);
    cb.addEventListener('change', () => toggleItem(item.id));

    // Text
    const span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = item.text;

    // Delete button
    const del = document.createElement('button');
    del.className = 'item-delete';
    del.innerHTML = '✕';
    del.setAttribute('aria-label', `Remover "${item.text}"`);
    del.addEventListener('click', () => removeItemAnimated(item.id, li));

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(del);

    return li;
  }

  // ── Actions ─────────────────────────────────────────────────
  function handleAdd() {
    const text = input.value.trim();
    if (!text) {
      // Shake the input to signal "empty"
      input.animate(
        [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
         { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' },
         { transform: 'translateX(0)' }],
        { duration: 320, easing: 'ease-out' }
      );
      input.focus();
      return;
    }

    const newItem = { id: generateId(), text, checked: false };
    items.push(newItem);

    const el = createItemEl(newItem);
    list.appendChild(el);

    input.value = '';
    input.focus();
    updateUI();

    // Scroll new item into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function toggleItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.checked = !item.checked;

    const li = list.querySelector(`[data-id="${id}"]`);
    if (li) li.classList.toggle('checked', item.checked);

    // Update aria-label on checkbox
    const cb = li && li.querySelector('.item-checkbox');
    if (cb) cb.setAttribute('aria-label', `Marcar "${item.text}" como ${item.checked ? 'não ' : ''}feito`);

    updateUI();
  }

  function removeItemAnimated(id, li) {
    li.classList.add('removing');
    li.addEventListener('animationend', () => {
      items = items.filter(i => i.id !== id);
      li.remove();
      updateUI();
    }, { once: true });
  }

  function handleClearChecked() {
    const toRemove = list.querySelectorAll('.item.checked');
    if (!toRemove.length) return;

    let removed = 0;
    toRemove.forEach((li, idx) => {
      // Stagger the slide-out animations
      setTimeout(() => {
        const id = li.dataset.id;
        li.classList.add('removing');
        li.addEventListener('animationend', () => {
          items = items.filter(i => i.id !== id);
          li.remove();
          removed++;
          if (removed === toRemove.length) updateUI();
        }, { once: true });
      }, idx * 60);
    });
  }

  // ── Boot ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
