import { DECK } from './cards.js';

const tableEl = document.getElementById('table');
const dealBtn = document.getElementById('dealBtn');
const allowReversedEl = document.getElementById('allowReversed');

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const mGeneral = document.getElementById('mGeneral');
const mLove = document.getElementById('mLove');
const mCareer = document.getElementById('mCareer');
const mHealth = document.getElementById('mHealth');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// (scatter helper removed for grid layout)

function clearTable() {
  tableEl.innerHTML = '';
}

async function deal() {
  // If cards exist, animate them back to the deck before re-dealing.
  const existing = Array.from(tableEl.querySelectorAll('.card'));
  if (existing.length) {
    await animateClear(existing);
    clearTable();
  } else {
    clearTable();
  }

  const allowReversed = allowReversedEl.checked;
  const deck = shuffle(DECK);

  // Grid layout: CSS handles the placement.
  deck.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = 'card from-deck';
    el.dataset.cardId = card.id;
    el.dataset.thumb = card.imgThumb;
    el.dataset.full = card.imgFull;

    // slight rotation for a more "table" feel (doesn't break grid)
    // Adjust this value to taste.
    const DEAL_ROTATION_DEG = 1.5; // max absolute rotation in degrees
    const rot = (Math.random() * (DEAL_ROTATION_DEG * 2) - DEAL_ROTATION_DEG).toFixed(2);
    el.style.setProperty('--rot', `${rot}deg`);

    // Stagger dealing
    el.style.transitionDelay = `${Math.min(600, idx * 8)}ms`;

    const reversed = allowReversed ? Math.random() < 0.5 : false;
    if (reversed) el.classList.add('is-reversed');
    el.dataset.orientation = reversed ? 'reversed' : 'upright';

    el.innerHTML = `
      <div class="card__inner">
        <div class="face back" aria-hidden="true">
          <img loading="lazy" decoding="async" alt="" src="./images/card-back-roses-lilies.jpg" />
        </div>
        <div class="face front" aria-hidden="true"></div>
      </div>
    `;

    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      handleCardClick(el);
    });

    tableEl.appendChild(el);
  });

  // Compute "from deck" offsets after layout.
  const origin = getDealOrigin();
  const cards = Array.from(tableEl.querySelectorAll('.card'));
  for (const el of cards) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = origin.x - cx;
    const dy = origin.y - cy;
    el.style.setProperty('--from-x', `${dx}px`);
    el.style.setProperty('--from-y', `${dy}px`);
  }

  // Trigger transitions
  requestAnimationFrame(() => {
    for (const el of cards) el.classList.remove('from-deck');
  });
}

function ensureFrontLoaded(cardEl) {
  const front = cardEl.querySelector('.face.front');
  if (!front) return;
  if (front.querySelector('img')) return;

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = '';
  img.src = cardEl.dataset.thumb;
  front.appendChild(img);
}

function handleCardClick(cardEl) {
  const isFlipped = cardEl.classList.contains('is-flipped');

  if (!isFlipped) {
    // First click: reveal and lazy-load image.
    ensureFrontLoaded(cardEl);
    cardEl.classList.add('is-flipped');
    return;
  }

  // Second click: open modal.
  openModal(cardEl.dataset.cardId, cardEl.dataset.orientation);
}

function openModal(cardId, orientation) {
  const card = DECK.find(c => c.id === cardId);
  if (!card) return;

  const meaning = card.meanings?.[orientation];

  modalImg.src = card.imgFull;
  modalImg.alt = card.name;
  if (orientation === 'reversed') {
    modalImg.style.transform = 'rotate(180deg)';
  } else {
    modalImg.style.transform = '';
  }

  modalTitle.textContent = card.name;
  modalSubtitle.textContent = `${orientation === 'reversed' ? 'Reversed' : 'Upright'} — ${meaning?.subtitle ?? ''}`.trim();

  mGeneral.textContent = meaning?.general ?? 'Meaning text coming soon.';
  mLove.textContent = meaning?.love ?? 'Meaning text coming soon.';
  mCareer.textContent = meaning?.career ?? 'Meaning text coming soon.';
  mHealth.textContent = meaning?.health ?? 'Meaning text coming soon.';

  modal.showModal();
}

function getDealOrigin() {
  // Origin point (in viewport coords) where cards "come from" / return to.
  // Top-right of the table feels like a deck position.
  const r = tableEl.getBoundingClientRect();
  return { x: r.right - 24, y: r.top + 24 };
}

function animateClear(cardEls) {
  const origin = getDealOrigin();

  // Remove stagger delays so clearing feels snappy.
  for (const el of cardEls) {
    el.style.transitionDelay = '0ms';
    // recompute from-x/from-y in case layout changed
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    el.style.setProperty('--from-x', `${origin.x - cx}px`);
    el.style.setProperty('--from-y', `${origin.y - cy}px`);
  }

  return new Promise((resolve) => {
    let remaining = cardEls.length;
    if (remaining === 0) return resolve();

    const done = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };

    for (const el of cardEls) {
      el.addEventListener('transitionend', done, { once: true });
    }

    requestAnimationFrame(() => {
      for (const el of cardEls) el.classList.add('is-exiting');
    });

    // Safety timeout in case transitionend doesn't fire
    setTimeout(resolve, 700);
  });
}

// Events
window.addEventListener('resize', () => {
  // If the user rotates/resizes, future deals will compute new offsets.
});

dealBtn.addEventListener('click', () => deal());

// Service worker (optional, improves caching on GitHub Pages)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// First load: empty table (forces intentional deal)
clearTable();
