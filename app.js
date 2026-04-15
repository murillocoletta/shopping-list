/**
 * app.js — Multi-list Logic
 */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  const screenHome   = document.getElementById('screen-home');
  const screenList   = document.getElementById('screen-list');

  // Home
  const appDate      = document.getElementById('app-date');
  const listsGrid    = document.getElementById('lists-grid');
  const homeEmpty    = document.getElementById('home-empty');
  const newListBtn   = document.getElementById('new-list-btn');

  // List (Notebook)
  const backBtn      = document.getElementById('back-btn');
  const listTitleEl  = document.getElementById('list-title');
  const listDateEl   = document.getElementById('current-date');
  const itemList     = document.getElementById('item-list');
  const input        = document.getElementById('new-item-input');
  const addBtn       = document.getElementById('add-btn');
  const clearBtn     = document.getElementById('clear-checked-btn');
  const emptyState   = document.getElementById('empty-state');

  // Modal
  const modalOverlay = document.getElementById('modal-overlay');
  const modalSave    = document.getElementById('modal-save');
  const modalCancel  = document.getElementById('modal-cancel');
  const nameInput    = document.getElementById('list-name-input');
  const emojiPicker  = document.getElementById('emoji-picker');

  // ── Firebase ─────────────────────────────────────────────────
  const db       = firebase.database();
  const listsRef = db.ref('lists');

  // ── Estado local ─────────────────────────────────────────────
  let lists         = [];       // [{ id, name, icon, color, items: {...} }]
  let currentListId = null;     // ID da lista aberta no momento
  let currentItems  = [];       // Itens da lista aberta
  let currentItemsRef = null;   // Refência Firebase para os itens da lista atual

  // Configuração padrão
  const EMOJIS = ['🛒', '💊', '🥖', '🔧', '🎁', '🍎', '👔', '🐶'];
  const COLORS = ['#e85555', '#4caf78', '#5588e8', '#e8a355', '#8955e8', '#55cbe8'];
  let selectedEmoji = EMOJIS[0];

  // ── Init ────────────────────────────────────────────────────
  function init() {
    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
    appDate.textContent = today;
    listDateEl.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    setupModal();
    listenAllLists();

    newListBtn.addEventListener('click', openModal);
    backBtn.addEventListener('click', closeList);

    // Botoes da lista interna
    addBtn.addEventListener('click', handleAddItem);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAddItem();
    });
    clearBtn.addEventListener('click', handleClearChecked);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // ── Home Screen / Listas ────────────────────────────────────
  function listenAllLists() {
    listsRef.on('value', snapshot => {
      lists = [];
      const val = snapshot.val();
      if (val) {
        Object.keys(val).forEach(key => {
          lists.push({ id: key, ...val[key] });
        });
      }
      renderListsGrid();
    });
  }

  function renderListsGrid() {
    listsGrid.innerHTML = '';

    if (lists.length === 0) {
      homeEmpty.classList.remove('hidden');
    } else {
      homeEmpty.classList.add('hidden');
      // Sort by creation date
      lists.sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));

      lists.forEach(list => {
        const card = document.createElement('div');
        card.className = 'list-card';
        card.style.setProperty('--card-color', list.color || COLORS[0]);

        // Quantidade de itens não checados
        let count = 0;
        if (list.items) {
           count = Object.values(list.items).filter(i => !i.checked).length;
        }

        card.innerHTML = `
          <button class="list-delete-btn" aria-label="Excluir lista ${list.name}">✕</button>
          <span class="list-icon">${list.icon || '🛒'}</span>
          <h3 class="list-name">${list.name}</h3>
          <span class="list-count">${count} iten${count === 1 ? '' : 's'}</span>
        `;

        card.addEventListener('click', (e) => {
          // Ignora clique no botão de delete
          if (e.target.classList.contains('list-delete-btn')) return;
          openList(list.id, list.name, list.color);
        });

        const delBtn = card.querySelector('.list-delete-btn');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Excluir a lista "${list.name}" inteira?`)) {
            listsRef.child(list.id).remove();
          }
        });

        listsGrid.appendChild(card);
      });
    }
  }

  // ── Navegação ───────────────────────────────────────────────
  function openList(listId, name, color) {
    currentListId = listId;
    listTitleEl.textContent = name;
    listTitleEl.style.color = color || 'var(--red)';

    // Troca telas
    screenHome.classList.add('screen--hidden');
    screenList.classList.remove('screen--hidden');

    // Escuta os itens desta lista especifica
    if (currentItemsRef) currentItemsRef.off();
    currentItemsRef = listsRef.child(listId).child('items');

    currentItemsRef.orderByChild('createdAt').on('value', snapshot => {
      currentItems = [];
      snapshot.forEach(child => {
        currentItems.push({ id: child.key, ...child.val() });
      });
      renderItems();
    });
  }

  function closeList() {
    screenList.classList.add('screen--hidden');
    screenHome.classList.remove('screen--hidden');
    
    currentListId = null;
    if (currentItemsRef) {
      currentItemsRef.off();
      currentItemsRef = null;
    }
    input.value = '';
  }

  // ── Modal Nova Lista ────────────────────────────────────────
  function setupModal() {
    EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-option';
      if (emoji === selectedEmoji) btn.classList.add('selected');
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = emoji;
      });
      emojiPicker.appendChild(btn);
    });

    modalCancel.addEventListener('click', () => modalOverlay.classList.remove('active'));
    
    modalSave.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      listsRef.push({
        name,
        icon: selectedEmoji,
        color: randomColor,
        createdAt: Date.now()
      });

      modalOverlay.classList.remove('active');
    });
  }

  function openModal() {
    nameInput.value = '';
    selectedEmoji = EMOJIS[0];
    document.querySelectorAll('.emoji-option').forEach((el, index) => {
      el.classList.toggle('selected', index === 0);
    });
    modalOverlay.classList.add('active');
    nameInput.focus();
  }


  // ── Render itens da lista interna ───────────────────────────
  function renderItems() {
    itemList.innerHTML = '';
    currentItems.forEach(item => itemList.appendChild(createItemEl(item)));
    updateUIItems();
  }

  function createItemEl(item) {
    const li = document.createElement('li');
    li.className = 'item' + (item.checked ? ' checked' : '');
    li.dataset.id = item.id;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'item-checkbox';
    cb.checked = item.checked;
    cb.addEventListener('change', () => {
      if (currentItemsRef) currentItemsRef.child(item.id).update({ checked: !item.checked });
    });

    const span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = item.text;

    const del = document.createElement('button');
    del.className = 'item-delete';
    del.innerHTML = '✕';
    del.addEventListener('click', () => {
      li.classList.add('removing');
      li.addEventListener('animationend', () => {
        if (currentItemsRef) currentItemsRef.child(item.id).remove();
      }, { once: true });
    });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(del);
    return li;
  }

  function updateUIItems() {
    const hasItems   = currentItems.length > 0;
    const hasChecked = currentItems.some(i => i.checked);
    emptyState.classList.toggle('hidden', hasItems);
    clearBtn.classList.toggle('visible', hasChecked);
  }

  // ── Ações da Lista ──────────────────────────────────────────
  function handleAddItem() {
    if (!currentItemsRef) return;
    const text = input.value.trim();
    if (!text) {
      input.animate(
        [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 250 }
      );
      input.focus();
      return;
    }

    currentItemsRef.push({
      text,
      checked: false,
      createdAt: Date.now()
    });

    input.value = '';
    input.focus();
  }

  function handleClearChecked() {
    if (!currentItemsRef) return;
    const toRemove = itemList.querySelectorAll('.item.checked');
    if (!toRemove.length) return;

    toRemove.forEach((li, idx) => {
      setTimeout(() => {
        const id = li.dataset.id;
        li.classList.add('removing');
        li.addEventListener('animationend', () => {
          currentItemsRef.child(id).remove();
        }, { once: true });
      }, idx * 60);
    });
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
