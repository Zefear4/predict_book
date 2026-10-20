(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'quiet-magic-found-v1';
  const CATEGORY_NAMES = { hug: 'Объятия', gift: 'Сюрпризы', joy: 'Радость', love: 'Любовь' };
  const RARITY_NAMES = { 'Обычное': 'ОБЫЧНОЕ ПОСЛАНИЕ', 'Редкое': 'РЕДКАЯ НАХОДКА', 'Легендарное': 'ЛЕГЕНДАРНОЕ ЧУДО' };
  const RARITY_CLASSES = { 'Обычное': 'rarity-ordinary', 'Редкое': 'rarity-rare', 'Легендарное': 'rarity-legendary' };
  let found = loadFound();
  let currentPrediction = null;
  let currentSpread = 0;
  let isAnimating = false;
  let toastTimer;

  function loadFound() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(saved) ? saved.filter(Number.isInteger) : []);
    } catch (_) { return new Set(); }
  }
  function saveFound() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...found])); } catch (_) { showToast('Браузер не разрешил сохранить коллекцию.'); }
  }
  function validPredictions() {
    return Array.isArray(predictions) ? predictions.filter(p => Array.isArray(p) && p.length >= 5 && p.every(v => typeof v === 'string')) : [];
  }
  function makeStars() {
    const holder = $('stars');
    for (let i = 0; i < 85; i++) {
      const star = document.createElement('i'); star.className = 'star';
      star.style.left = `${Math.random() * 100}%`; star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 4}s`; star.style.animationDuration = `${2.5 + Math.random() * 4}s`;
      star.style.opacity = `${.18 + Math.random() * .5}`; holder.appendChild(star);
    }
  }
  function updateCounters() {
    const total = validPredictions().length;
    const count = [...found].filter(i => i >= 0 && i < total).length;
    $('header-count').textContent = `${count} / ${total}`;
    $('book-count').textContent = `${count} из ${total}`;
    $('progress-fill').style.width = `${total ? count / total * 100 : 0}%`;
    $('book-dot').classList.toggle('visible', count > 0);
  }
  function choosePrediction() {
    const list = validPredictions();
    if (!list.length) return null;
    const unseen = list.map((p, i) => ({ p, i })).filter(item => !found.has(item.i));
    const pool = unseen.length ? unseen : list.map((p, i) => ({ p, i }));
    // Чуть чаще встречаются обычные послания, редкие и легендарные сохраняют особенность.
    const weighted = pool.flatMap(item => {
      const rarity = item.p[1];
      const weight = rarity === 'Легендарное' ? 1 : rarity === 'Редкое' ? 3 : 6;
      return Array.from({ length: weight }, () => item);
    });
    let pick = weighted[Math.floor(Math.random() * weighted.length)];
    if (currentPrediction && pool.length > 1) {
      let tries = 0;
      while (pick.i === currentPrediction.i && tries++ < 10) pick = weighted[Math.floor(Math.random() * weighted.length)];
    }
    return { ...pick, isNew: !found.has(pick.i) };
  }
  function createBurst(rarity) {
    const burst = $('magic-burst');
    burst.innerHTML = '';
    const settings = rarity === 'Легендарное'
      ? { count: 44, symbols: ['✦', '✧', '✴', '✹', '⋆', '❋'], distance: [75, 190], size: [11, 25], colors: ['#ffe8a6', '#ff9be7', '#a9f7ff', '#d6b5ff', '#ffffff', '#ffb87a'] }
      : rarity === 'Редкое'
        ? { count: 24, symbols: ['✦', '✧', '·', '✴', '⋆'], distance: [65, 160], size: [10, 19], colors: ['#e7c5ff', '#9deaff', '#ffc9ed', '#ffffff'] }
        : { count: 8, symbols: ['✦', '·', '⋆'], distance: [45, 105], size: [8, 13], colors: ['#f4dca4', '#e7d8ff'] };
    for (let i = 0; i < settings.count; i++) {
      const particle = document.createElement('span');
      particle.className = 'burst-particle';
      particle.textContent = settings.symbols[Math.floor(Math.random() * settings.symbols.length)];
      const angle = Math.random() * Math.PI * 2;
      const distance = settings.distance[0] + Math.random() * (settings.distance[1] - settings.distance[0]);
      particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--rot', `${Math.random() * 240 - 120}deg`);
      particle.style.setProperty('--size', `${settings.size[0] + Math.random() * (settings.size[1] - settings.size[0])}px`);
      particle.style.setProperty('--particle-color', settings.colors[Math.floor(Math.random() * settings.colors.length)]);
      particle.style.animationDelay = `${Math.random() * (rarity === 'Легендарное' ? .28 : .14)}s`;
      burst.appendChild(particle);
    }
    window.setTimeout(() => { burst.innerHTML = ''; }, rarity === 'Легендарное' ? 1750 : rarity === 'Редкое' ? 1250 : 850);
  }
  function revealPrediction(item) {
    const p = item.p;
    const card = $('prediction-card');
    card.classList.remove('rarity-ordinary', 'rarity-rare', 'rarity-legendary', 'reveal');
    void card.offsetWidth;
    card.classList.add(RARITY_CLASSES[p[1]] || 'rarity-ordinary', 'reveal');
    $('rarity-label').textContent = RARITY_NAMES[p[1]] || 'ТВОЁ ПОСЛАНИЕ';
    $('rarity-mark').textContent = p[1] === 'Легендарное' ? '✹' : p[1] === 'Редкое' ? '✧' : '✦';
    $('rarity-mark-right').textContent = $('rarity-mark').textContent;
    $('prediction-emoji').textContent = p[2];
    $('prediction-title').textContent = p[3];
    $('prediction-text').textContent = p[4];
    $('category-chip').textContent = CATEGORY_NAMES[p[0]] || p[0];
    $('new-find').classList.toggle('visible', item.isNew);
    $('tap-hint').innerHTML = '<span class="hint-dot"></span> Нажми на шар, чтобы получить ещё одно послание';
    if (item.isNew) { found.add(item.i); saveFound(); updateCounters(); }
    if (p[1] === 'Легендарное') showToast('✧ Легендарное чудо найдено!');
    else if (p[1] === 'Редкое') showToast('✧ Тебе досталось редкое послание');
  }
  function drawPrediction() {
    if (isAnimating) return;
    const item = choosePrediction();
    if (!item) { showToast('Добавь предсказания в файл predictions.js'); return; }
    isAnimating = true;
    const stage = document.querySelector('.oracle-stage');
    stage.classList.remove('rarity-ordinary', 'rarity-rare', 'rarity-legendary');
    stage.classList.add('is-loading', RARITY_CLASSES[item.p[1]] || 'rarity-ordinary');
    $('tap-hint').style.opacity = '.25';
    createBurst(item.p[1]);
    const delay = item.p[1] === 'Легендарное' ? 1550 : item.p[1] === 'Редкое' ? 1050 : 650;
    window.setTimeout(() => {
      currentPrediction = item; revealPrediction(item);
      stage.classList.remove('is-loading', 'rarity-ordinary', 'rarity-rare', 'rarity-legendary');
      $('tap-hint').style.opacity = '1'; isAnimating = false;
    }, delay);
  }
  function makeEmptyPage(isLastHalfSpread = false) {
    const div = document.createElement('div'); div.className = 'empty-page';
    div.innerHTML = isLastHalfSpread
      ? '<div class="locked-icon">✧</div><h3>Ещё одна<br>тайна ждёт</h3><p>Найди ещё одно пожелание — и оно появится на этой странице.</p>'
      : '<div class="locked-icon">✧</div><h3>Ещё одна<br>тайна ждёт</h3><p>Эта страница откроется, когда ты найдёшь своё послание.</p>';
    return div;
  }
  function makeEntry(p, index) {
    const rarityClass = p[1] === 'Редкое' ? 'is-rare' : p[1] === 'Легендарное' ? 'is-legendary' : 'is-ordinary';
    const div = document.createElement('article'); div.className = `page-entry ${rarityClass}`;
    const emoji = document.createElement('div'); emoji.className = 'entry-emoji'; emoji.textContent = p[2];
    const rarity = document.createElement('div'); rarity.className = 'entry-rarity'; rarity.textContent = p[1] === 'Легендарное' ? '✦ ЛЕГЕНДАРНОЕ ✦' : p[1] === 'Редкое' ? '✧ РЕДКОЕ ✧' : 'ОБЫЧНОЕ ПОСЛАНИЕ';
    const title = document.createElement('h3'); title.textContent = p[3];
    const text = document.createElement('p'); text.textContent = p[4];
    const category = document.createElement('div'); category.className = 'entry-category'; category.textContent = CATEGORY_NAMES[p[0]] || p[0];
    div.append(emoji, rarity, title, text, category); return div;
  }
  function renderBook() {
    const list = validPredictions();
    const unlocked = list.map((p, i) => ({ p, i })).filter(item => found.has(item.i));
    const left = $('left-page-content'), right = $('right-page-content'); left.innerHTML = ''; right.innerHTML = '';
    const start = currentSpread * 2;
    [left, right].forEach((page, offset) => {
      const item = unlocked[start + offset];
      if (item) {
        page.appendChild(makeEntry(item.p, item.i));
      } else {
        const isLastHalfSpread = offset === 1 && unlocked.length % 2 === 1 && start + 1 === unlocked.length;
        page.appendChild(makeEmptyPage(isLastHalfSpread));
      }
    });
    $('page-indicator').textContent = unlocked.length ? `Разворот ${currentSpread + 1} из ${Math.max(1, Math.ceil(unlocked.length / 2))}` : 'Пока пусто';
    $('prev-page').disabled = currentSpread <= 0;
    $('next-page').disabled = start + 2 >= unlocked.length;
    $('left-page-content').parentElement.querySelector('.page-number').textContent = String(start + 1).padStart(2, '0');
    $('right-page-content').parentElement.querySelector('.page-number').textContent = String(start + 2).padStart(2, '0');
    updateCounters();
  }
  let bookMotionTimer;
  let pageFlipTimer;
  function openBook() {
    currentSpread = 0; renderBook();
    const backdrop = $('book-backdrop');
    const stage = $('book-stage');
    clearTimeout(bookMotionTimer);
    backdrop.classList.remove('closing');
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    stage.classList.remove('is-closing', 'is-open');
    // Let the closed leather cover settle on screen, then swing it around the spine.
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-open')));
    document.body.style.overflow = 'hidden';
    $('close-book').focus();
  }
  function closeBook() {
    const backdrop = $('book-backdrop');
    const stage = $('book-stage');
    clearTimeout(bookMotionTimer);
    stage.classList.remove('is-open');
    stage.classList.add('is-closing');
    backdrop.classList.add('closing');
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    bookMotionTimer = window.setTimeout(() => {
      backdrop.classList.remove('closing');
      stage.classList.remove('is-closing');
    }, 900);
    document.body.style.overflow = '';
    $('open-book').focus();
  }
  function flipSpread(direction) {
    if (isAnimating) return;
    if ($('prev-page').disabled && direction < 0) return;
    if ($('next-page').disabled && direction > 0) return;

    isAnimating = true;
    const spread = $('book-spread');
    const page = document.createElement('div');
    page.className = `turning-leaf ${direction > 0 ? 'turn-forward' : 'turn-backward'}`;

    // Keep the animated leaf deliberately empty: text, emoji, rarity effects and
    // long wishes are removed from the live pages before the transform begins.
    // This leaves the browser with only the paper texture and a simple 3D turn.
    const front = document.createElement('div');
    front.className = 'leaf-front';
    const back = document.createElement('div');
    back.className = 'leaf-back';
    back.innerHTML = '<div class="page-ornament">✧ · ✦ · ✧</div><div class="leaf-back-mark">❦</div>';
    page.append(front, back);

    $('left-page-content').replaceChildren();
    $('right-page-content').replaceChildren();
    spread.appendChild(page);
    spread.classList.add('is-turning');

    // Wait until the full paper-turn animation has finished before rebuilding
    // either page's content. No wish DOM is rendered during the animation.
    pageFlipTimer = window.setTimeout(() => {
      currentSpread += direction;
      renderBook();
      page.remove();
      spread.classList.remove('is-turning');
      isAnimating = false;
    }, 1040);
  }
  function showToast(message) {
    const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  $('crystal-ball').addEventListener('click', drawPrediction);
  $('open-book').addEventListener('click', openBook);
  $('close-book').addEventListener('click', closeBook);
  $('book-backdrop').addEventListener('click', e => { if (e.target === $('book-backdrop')) closeBook(); });
  $('prev-page').addEventListener('click', () => flipSpread(-1));
  $('next-page').addEventListener('click', () => flipSpread(1));
  $('book-edge-prev').addEventListener('click', () => flipSpread(-1));
  $('book-edge-next').addEventListener('click', () => flipSpread(1));
  // Keyboard navigation remains available for accessibility.
  document.addEventListener('keydown', e => {
    if (!$('book-backdrop').classList.contains('open')) return;
    if (e.key === 'ArrowLeft') flipSpread(-1);
    if (e.key === 'ArrowRight') flipSpread(1);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('book-backdrop').classList.contains('open')) closeBook(); });
  makeStars(); updateCounters();
  if (!validPredictions().length) { $('prediction-title').textContent = 'Шар ждёт твоих предсказаний'; $('prediction-text').textContent = 'Добавь пожелания в файл predictions.js, и магия начнётся.'; }
})();
