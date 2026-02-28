import { DECK } from './cards.js';

const tableEl = document.getElementById('table');
const dealBtn = document.getElementById('dealBtn');
const allowReversedEl = document.getElementById('allowReversed');
const spreadSelectEl = document.getElementById('spreadSelect');
const spreadPromptEl = document.getElementById('spreadPrompt');
const spreadSlotsEl = document.getElementById('spreadSlots');
const threeCardToggleEl = document.getElementById('threeCardToggle');
const threeCardSelectEl = document.getElementById('threeCardSelect');

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

const SPREADS = {
  simple: { id: 'simple', name: 'Simple (free draw)' },
  three: { id: 'three', name: '3 Card Spread', slots: ['a', 'b', 'c'] }
};

const THREE_VARIANTS = {
  ppf: ['Past', 'Present', 'Future'],
  sao: ['Situation', 'Action', 'Outcome'],
  mbs: ['Mind', 'Body', 'Spirit'],
  ytr: ['You', 'Them', 'Relationship'],
  ynm: ['Yes', 'No', 'Maybe']
};

let spreadId = 'simple';
let ppfIndex = 0;

function resetSpreadState() {
  ppfIndex = 0;
  updateSpreadUI();
}

function setThreeSlotLabels(labels) {
  if (!spreadSlotsEl) return;
  const slots = Array.from(spreadSlotsEl.querySelectorAll('.slot'));
  for (let i = 0; i < slots.length; i++) {
    const lab = slots[i].querySelector('.slot__label');
    if (lab) lab.textContent = labels[i] ?? '';
  }
}

function getThreeLabels() {
  const variant = threeCardSelectEl?.value || 'ppf';
  return THREE_VARIANTS[variant] || THREE_VARIANTS.ppf;
}

function updateSpreadUI() {
  spreadId = spreadSelectEl?.value || 'simple';

  // Hook for CSS tweaks based on mode
  tableEl?.classList.toggle('mode-ppf', spreadId === 'three');

  if (spreadId === 'three') {
    spreadSlotsEl.hidden = false;
    threeCardToggleEl.hidden = false;

    const labels = getThreeLabels();
    setThreeSlotLabels(labels);

    const label = labels[ppfIndex] || null;
    if (label) {
      spreadPromptEl.textContent = `Select a card for ${label}.`;
    } else {
      spreadPromptEl.textContent = 'Spread complete. Tap a selected card to view its meaning.';
    }
  } else {
    spreadSlotsEl.hidden = true;
    threeCardToggleEl.hidden = true;
    spreadPromptEl.textContent = '';
  }
}

function clearTable() {
  // Remove dealt deck cards/placeholders but keep the spread row mounted inside the table.
  for (const el of Array.from(tableEl.querySelectorAll(':scope > .card'))) {
    el.remove();
  }

  // Clear spread wells too
  if (spreadSlotsEl) {
    for (const well of spreadSlotsEl.querySelectorAll('[data-well]')) {
      well.innerHTML = '';
    }
  }
}

async function deal() {
  resetSpreadState();

  // If cards exist, animate the dealt deck back to the deck before re-dealing.
  // (Exclude placeholders + spread cards.)
  const existing = Array.from(tableEl.querySelectorAll(':scope > .card:not(.placeholder)'));
  if (existing.length) {
    await animateClear(existing);
  }
  clearTable();

  const allowReversed = allowReversedEl.checked;
  const deck = shuffle(DECK);

  // Ensure the spread row lives inside the table and stays at the bottom.
  if (spreadSlotsEl && spreadSlotsEl.parentElement !== tableEl) {
    tableEl.appendChild(spreadSlotsEl);
  }

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

    // Insert before the spread row so the spread stays visually at the bottom.
    if (spreadSlotsEl && spreadSlotsEl.parentElement === tableEl) {
      tableEl.insertBefore(el, spreadSlotsEl);
    } else {
      tableEl.appendChild(el);
    }
  });

  // Compute "from deck" offsets after layout.
  const origin = getDealOrigin();
  const cards = Array.from(tableEl.querySelectorAll(':scope > .card:not(.placeholder)'));
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

function getSlotWellByIndex(i) {
  if (!spreadSlotsEl) return null;
  const slots = Array.from(spreadSlotsEl.querySelectorAll('.slot'));
  const slot = slots[i];
  if (!slot) return null;
  return slot.querySelector('[data-well]');
}

function animateMove(el, toParent) {
  // FLIP animation
  const first = el.getBoundingClientRect();
  toParent.appendChild(el);
  const last = el.getBoundingClientRect();

  const dx = first.left - last.left;
  const dy = first.top - last.top;

  // Keep existing rotation
  const rot = getComputedStyle(el).getPropertyValue('--rot') || '0deg';

  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${rot})` },
      { transform: `translate(0, 0) scale(1) rotate(${rot})` }
    ],
    { duration: 360, easing: 'cubic-bezier(.2,.85,.2,1)' }
  );
}

function handleCardClick(cardEl) {
  const isFlipped = cardEl.classList.contains('is-flipped');
  const inSpread = !!cardEl.closest('#spreadSlots');

  // In spread: clicking always opens modal.
  if (inSpread) {
    openModal(cardEl.dataset.cardId, cardEl.dataset.orientation);
    return;
  }

  if (spreadId === 'three') {
    const labels = getThreeLabels();
    const label = labels[ppfIndex];

    // If spread is complete, treat as normal flip->modal behavior.
    if (!label) {
      if (!isFlipped) {
        ensureFrontLoaded(cardEl);
        cardEl.classList.add('is-flipped');
        return;
      }
      openModal(cardEl.dataset.cardId, cardEl.dataset.orientation);
      return;
    }

    // Selecting a card for the next position.
    ensureFrontLoaded(cardEl);
    cardEl.classList.add('is-flipped');

    // Leave a blank slot behind so the grid doesn't collapse.
    // We insert a placeholder *before* moving the card into the spread well.
    if (!cardEl.classList.contains('placeholder') && cardEl.parentElement === tableEl) {
      const ph = document.createElement('div');
      ph.className = 'card placeholder';
      ph.setAttribute('aria-hidden', 'true');
      // Keep the same slight rotation so the "hole" matches the original card footprint.
      const rot = getComputedStyle(cardEl).getPropertyValue('--rot') || '0deg';
      ph.style.setProperty('--rot', rot);
      cardEl.insertAdjacentElement('beforebegin', ph);
    }

    const well = getSlotWellByIndex(ppfIndex);
    if (well) {
      animateMove(cardEl, well);
    }

    ppfIndex += 1;
    updateSpreadUI();
    return;
  }

  // Simple mode: flip on first click, modal on second.
  if (!isFlipped) {
    ensureFrontLoaded(cardEl);
    cardEl.classList.add('is-flipped');
    return;
  }

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
spreadSelectEl?.addEventListener('change', () => {
  // Switching modes should always start fresh.
  deal();
});

threeCardSelectEl?.addEventListener('change', () => {
  // Switching 3-card interpretation should also start fresh (avoids selecting from old flipped cards).
  if ((spreadSelectEl?.value || 'simple') === 'three') {
    deal();
  }
});

// Service worker cleanup: this project no longer uses a SW.
// Keeps deployed sites from behaving oddly due to cached SW responses.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}

// First load: empty table (forces intentional deal)
updateSpreadUI();
clearTable();
