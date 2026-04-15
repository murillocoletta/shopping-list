/**
 * app.js — Shopping List Logic
 * Dados sincronizados em tempo real via Firebase Realtime Database.
 * Qualquer pessoa com o link vê as mesmas alterações instantaneamente.
 */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  const list       = document.getElementById('item-list');
  const input      = document.getElementById('new-item-input');
  const addBtn     = document.getElementById('add-btn');
  const clearBtn   = document.getElementById('clear-checked-btn');
  const emptyState = document.getElementById('empty-state');
  const dateEl     = document.getElementById('current-date');

  // ── Firebase ─────────────────────────────────────────────────
  // `firebase` é inicializado pelo firebase-config.js, carregado antes deste arquivo.
  const db       = firebase.database();
  const itemsRef = db.ref('items');   // raiz do banco de dados: /items

  // ── Estado local ─────────────────────────────────────────────
  // Espelho dos dados do Firebase; atualizado a cada snapshot.
  let items = [];   // [{ id, text, checked, createdAt }]

  // ── Init ────────────────────────────────────────────────────
  function init() {
    // Exibir a data de hoje no cabeçalho
    dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });

    // Mostrar indicador de carregamento até o Firebase responder
    showStatus('Conectando…');

    // Escuta em tempo real: sempre que alguém alterar o banco,
    // esta função é chamada automaticamente em todos os dispositivos.
    itemsRef.orderByChild('createdAt').on('value', snapshot => {
      hideStatus();
      items = [];
      snapshot.forEach(child => {
        items.push({ id: child.key, ...child.val() });
      });
      renderAll();
    }, _err => {
      showStatus('Sem conexão. Tente novamente.');
    });

    // Botões
    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAdd();
    });
    clearBtn.addEventListener('click', handleClearChecked);

    // Registrar service worker (offline shell)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // ── Status helpers ───────────────────────────────────────────
  function showStatus(msg) {
    let el = document.getElementById('status-msg');
    if (!el) {
      el = document.createElement('p');
      el.id = 'status-msg';
      el.style.cssText = 'text-align:center;font-family:var(--font-hand,sans-serif);color:#888;padding:8px 0;font-size:0.9rem;';
      emptyState.after(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
  }

  function hideStatus() {
    const el = document.getElementById('status-msg');
    if (el) el.style.display = 'none';
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
    cb.addEventListener('change', () => toggleItem(item.id, !item.checked));

    // Texto
    const span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = item.text;

    // Botão remover
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

  // ── Helpers de UI ────────────────────────────────────────────
  function updateUI() {
    const hasItems   = items.length > 0;
    const hasChecked = items.some(i => i.checked);
    emptyState.classList.toggle('hidden', hasItems);
    clearBtn.classList.toggle('visible', hasChecked);
  }

  // ── Ações ────────────────────────────────────────────────────
  function handleAdd() {
    const text = input.value.trim();
    if (!text) {
      // Agita o campo para indicar que está vazio
      input.animate(
        [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
         { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' },
         { transform: 'translateX(0)' }],
        { duration: 320, easing: 'ease-out' }
      );
      input.focus();
      return;
    }

    // Publicar no Firebase → o listener onValue vai re-renderizar em todos os dispositivos
    itemsRef.push({
      text,
      checked:   false,
      createdAt: Date.now()
    });

    input.value = '';
    input.focus();
  }

  function toggleItem(id, checked) {
    // Atualizar apenas o campo `checked` deste item no Firebase
    itemsRef.child(id).update({ checked });
  }

  function removeItemAnimated(id, li) {
    li.classList.add('removing');
    li.addEventListener('animationend', () => {
      itemsRef.child(id).remove();
    }, { once: true });
  }

  function handleClearChecked() {
    const toRemove = list.querySelectorAll('.item.checked');
    if (!toRemove.length) return;

    toRemove.forEach((li, idx) => {
      setTimeout(() => {
        const id = li.dataset.id;
        li.classList.add('removing');
        li.addEventListener('animationend', () => {
          itemsRef.child(id).remove();
        }, { once: true });
      }, idx * 60);
    });
  }

  // ── Boot ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
