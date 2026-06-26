/* ============================================================================
   save_load.js — Système de sauvegarde unifié pour la Boîte à Outils
   ----------------------------------------------------------------------------
   Fonctionne automatiquement sur TOUS les outils, sans configuration par page.

   Fonctionnalités :
     • Export / Import d'un fichier .json (sauvegarde portable, le vrai backup)
     • Historique local (localStorage) propre à chaque outil, rechargeable en 1 clic
     • Petits messages de confirmation (toasts)
     • Auto-installation : ajoute les boutons JSON manquants et le panneau
       d'historique là où il n'existe pas encore.

   Conventions attendues dans le HTML (déjà respectées par les outils) :
     • Les champs simples ont un attribut id (input / textarea / select)
     • Les listes dynamiques sont dans un conteneur dont l'id finit par "Container"
       (itemsContainer, piecesContainer, echellesContainer, surfacesContainer…)

   Point d'extension facultatif :
     • Si une page définit window.onStateLoaded, cette fonction est appelée
       après chaque chargement (utile pour réattacher des écouteurs / recalculs).
   ========================================================================== */

(function () {
  'use strict';

  // ---- Identité de l'outil (déduite du nom de fichier) ---------------------
  const TOOL = (location.pathname.split('/').pop() || 'outil').replace(/\.html?$/i, '') || 'outil';
  const HISTORY_KEY = 'a2s_history_' + TOOL;
  const MAX_HISTORY = 12;

  // ---- Utilitaires ----------------------------------------------------------
  function containers() {
    return Array.from(document.querySelectorAll('[id$="Container"]'));
  }
  function insideContainer(el) {
    return el.closest('[id$="Container"]') !== null;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Collecte de l'état du formulaire ------------------------------------
  function collectState() {
    const fields = {};
    document.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => {
      if (insideContainer(el) || el.type === 'file') return;
      fields[el.id] = el.value;
    });

    const cont = {};
    containers().forEach(c => {
      const rows = [];
      Array.from(c.children).forEach(row => {
        const vals = [];
        row.querySelectorAll('input, textarea, select').forEach(f => vals.push(f.value));
        rows.push(vals);
      });
      cont[c.id] = rows;
    });

    return { tool: TOOL, savedAt: new Date().toISOString(), fields, containers: cont };
  }

  // ---- Restauration de l'état ----------------------------------------------
  function applyState(state) {
    if (!state || typeof state !== 'object') return;

    // 1) Champs simples
    const fields = state.fields || {};
    Object.keys(fields).forEach(id => {
      const el = document.getElementById(id);
      if (el && el.type !== 'file') el.value = fields[id];
    });

    // 2) Listes dynamiques (clonage du 1er élément servant de gabarit)
    const cont = state.containers || {};
    containers().forEach(c => {
      const rows = cont[c.id];
      if (!Array.isArray(rows)) return;
      const template = c.children[0] ? c.children[0].cloneNode(true) : null;
      if (!template) return;
      blankRow(template);

      c.innerHTML = '';
      const list = rows.length ? rows : [null]; // garde au moins une ligne vide
      list.forEach(vals => {
        const row = template.cloneNode(true);
        if (Array.isArray(vals)) {
          const inputs = row.querySelectorAll('input, textarea, select');
          vals.forEach((v, i) => { if (inputs[i]) inputs[i].value = v; });
        }
        c.appendChild(row);
      });
    });

    // 3) Déclenche les recalculs / écouteurs délégués (totaux, etc.)
    document.querySelectorAll('input, textarea, select').forEach(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 4) Hook facultatif pour la page (réattacher des écouteurs directs, etc.)
    if (typeof window.onStateLoaded === 'function') {
      try { window.onStateLoaded(); } catch (e) { console.warn('onStateLoaded:', e); }
    }
  }

  function blankRow(row) {
    row.querySelectorAll('input, textarea, select').forEach(f => {
      if (f.type === 'checkbox' || f.type === 'radio') f.checked = false;
      else f.value = '';
    });
  }

  // ---- Nom de fichier / libellé --------------------------------------------
  function docBaseName() {
    const n = (document.getElementById('documentName')?.value || '').trim();
    return n || (TOOL.charAt(0).toUpperCase() + TOOL.slice(1));
  }

  // ---- Export / Import JSON -------------------------------------------------
  function saveToJson() {
    const state = collectState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docBaseName() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    saveToHistory();                 // tout export alimente aussi l'historique
    toast('💾 Sauvegarde .json téléchargée');
  }

  function loadFromJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const state = JSON.parse(e.target.result);
        if (state.tool && state.tool !== TOOL) {
          if (!confirm('Ce fichier vient de l\'outil « ' + state.tool +
            ' », pas de « ' + TOOL + ' ». Charger quand même ?')) {
            event.target.value = '';
            return;
          }
        }
        applyState(state);
        toast('📂 Données chargées');
      } catch (err) {
        alert('Fichier JSON invalide : ' + err.message);
      }
      event.target.value = ''; // permet de recharger le même fichier ensuite
    };
    reader.readAsText(file);
  }

  // ---- Historique local -----------------------------------------------------
  function readHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
  }
  function writeHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); }
    catch (e) { console.warn('localStorage indisponible :', e); }
  }

  function saveToHistory() {
    const state = collectState();
    const label = (document.getElementById('documentName')?.value || '').trim() || 'Sans nom';
    const list = readHistory();
    list.unshift({ label, savedAt: state.savedAt, state });
    writeHistory(list);
    renderHistory();
    return true;
  }

  function renderHistory() {
    const ul = document.getElementById('historyList');
    if (!ul) return;
    const list = readHistory();
    ul.innerHTML = '';
    if (!list.length) {
      ul.innerHTML = '<li class="history-empty">Aucune sauvegarde</li>';
      return;
    }
    list.forEach((entry, i) => {
      const d = new Date(entry.savedAt);
      const when = d.toLocaleDateString('fr-FR') + ' ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML =
        '<button class="history-load" title="Charger cette sauvegarde">' +
        '<span class="history-name">' + escapeHtml(entry.label) + '</span>' +
        '<span class="history-date">' + when + '</span></button>' +
        '<button class="history-del" title="Supprimer">✕</button>';
      li.querySelector('.history-load').addEventListener('click', () => {
        applyState(entry.state);
        toast('↩️ « ' + entry.label +' » chargé');
      });
      li.querySelector('.history-del').addEventListener('click', () => {
        const h = readHistory(); h.splice(i, 1); writeHistory(h); renderHistory();
      });
      ul.appendChild(li);
    });
  }

  // ---- Toast (message de confirmation) -------------------------------------
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'a2s-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // ---- Auto-installation de l'interface ------------------------------------
  function injectStyles() {
    if (document.getElementById('a2s-save-styles')) return;
    // Si la feuille partagée styles.css est présente, elle gère déjà le style
    // de l'historique et des toasts → on n'injecte rien (évite d'écraser la DA).
    if (document.querySelector('link[href*="styles.css"]')) return;
    const css = `
      .a2s-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
        background:#1a3a52;color:#fff;padding:.8rem 1.4rem;border-radius:10px;font-family:'Work Sans',sans-serif;
        font-size:.95rem;box-shadow:0 6px 24px rgba(0,0,0,.25);opacity:0;pointer-events:none;
        transition:opacity .3s ease,transform .3s ease;z-index:9999}
      .a2s-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      #a2sHistoryPanel{position:fixed;top:1rem;right:1rem;width:240px;max-height:70vh;overflow-y:auto;
        background:#fff;border:1px solid #e0ddd8;border-radius:12px;box-shadow:0 4px 18px rgba(26,58,82,.15);
        z-index:200;font-family:'Work Sans',sans-serif}
      #a2sHistoryPanel h3{font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:#1a3a52;margin:0;
        padding:.8rem 1rem;border-bottom:1px solid #e0ddd8;background:#fafaf9;border-radius:12px 12px 0 0;text-align:center}
      #a2sHistoryPanel ul{list-style:none;margin:0;padding:.4rem}
      @media(max-width:1300px){#a2sHistoryPanel{position:static;width:100%;max-height:none;margin:0 auto 2rem;max-width:900px}}
      .history-item{display:flex;align-items:stretch;gap:.3rem;margin-bottom:.35rem}
      .history-load{flex:1;text-align:left;background:#fafaf9;border:1px solid #e0ddd8;border-radius:8px;
        padding:.5rem .7rem;cursor:pointer;display:flex;flex-direction:column;line-height:1.2;transition:all .2s}
      .history-load:hover{border-color:#c9a961;background:#fff}
      .history-name{font-weight:600;color:#1a3a52;font-size:.9rem;word-break:break-word}
      .history-date{font-size:.72rem;color:#6b6b6b;margin-top:.15rem}
      .history-del{background:#f3eeea;border:none;color:#a33;border-radius:8px;padding:0 .6rem;cursor:pointer;font-size:.8rem}
      .history-del:hover{background:#e74c3c;color:#fff}
      .history-empty{color:#9a948c;text-align:center;padding:1rem .5rem;font-size:.85rem;font-style:italic}
    `;
    const style = document.createElement('style');
    style.id = 'a2s-save-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureHistoryPanel() {
    if (document.getElementById('historyList')) return; // panneau déjà présent
    const panel = document.createElement('div');
    panel.id = 'a2sHistoryPanel';
    panel.innerHTML = '<h3>Sauvegardes</h3><ul id="historyList"></ul>';
    document.body.appendChild(panel);
  }

  function ensureJsonButtons() {
    // Déjà géré par la page ?
    if (document.querySelector('[onclick*="saveToJson"]')) return;

    const bar = document.querySelector('.action-buttons');
    if (!bar) return;

    // input fichier caché
    let fileInput = document.getElementById('fileInput');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'fileInput';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', loadFromJson);
      document.body.appendChild(fileInput);
    }

    const load = document.createElement('button');
    load.className = 'btn-action';
    load.type = 'button';
    load.textContent = '📂 Charger (JSON)';
    load.addEventListener('click', () => fileInput.click());

    const save = document.createElement('button');
    save.className = 'btn-action';
    save.type = 'button';
    save.textContent = '💾 Sauvegarder (JSON)';
    save.addEventListener('click', saveToJson);

    bar.insertBefore(save, bar.firstChild);
    bar.insertBefore(load, bar.firstChild);
  }

  // ---- Exposition globale (compatibilité avec les onclick existants) -------
  window.saveToJson = saveToJson;
  window.loadFromJson = loadFromJson;
  window.saveToHistory = saveToHistory;
  window.renderHistory = renderHistory;

  // ---- Initialisation -------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    ensureHistoryPanel();
    ensureJsonButtons();
    renderHistory();
  });
})();
