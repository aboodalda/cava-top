document.getElementById('year').textContent = new Date().getFullYear();

let CATEGORIES = [];   // {id, name, icon, order}
let ITEMS = [];        // {id, name, price, description, image, categoryId, order, available}
let activeCategory = 'all';
let searchTerm = '';

// ---------- SETTINGS (live) ----------
db.collection('settings').doc('main').onSnapshot(doc => {
  if (!doc.exists) return;
  const s = doc.data();
  document.getElementById('navName').textContent = s.name || 'Cava Top';
  document.getElementById('heroName').textContent = s.name || 'Cava Top';
  document.getElementById('footName').textContent = s.name || 'Cava Top';
  document.title = (s.name || 'Cava Top') + ' | مطعم وكافتيريا';
  if (s.tagline) document.getElementById('heroTagline').textContent = s.tagline;
  document.getElementById('infoHours').textContent = s.hours || '—';
  document.getElementById('infoRating').textContent = s.rating || '—';
  document.getElementById('infoLocation').textContent = s.location || '—';
  document.getElementById('infoPhone').textContent = s.phone || '—';
  if (s.phone) document.getElementById('callBtn').href = 'tel:' + s.phone;
});

// ---------- CATEGORIES (live) ----------
db.collection('categories').orderBy('order', 'asc').onSnapshot(snap => {
  CATEGORIES = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCatNav();
  renderItems();
});

// ---------- ITEMS (live) ----------
db.collection('items').orderBy('order', 'asc').onSnapshot(snap => {
  ITEMS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderItems();
});

function renderCatNav() {
  const nav = document.getElementById('catNav');
  let html = `<button class="cat-pill ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">🍽️ الكل</button>`;
  html += CATEGORIES.map(c =>
    `<button class="cat-pill ${activeCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon || ''} ${escapeHtml(c.name)}</button>`
  ).join('');
  nav.innerHTML = html;
  nav.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCatNav();
      renderItems();
    });
  });
}

document.getElementById('searchInput').addEventListener('input', e => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderItems();
});

function renderItems() {
  const grid = document.getElementById('itemsGrid');
  const empty = document.getElementById('emptyState');

  let list = ITEMS.filter(it => it.available !== false);
  if (activeCategory !== 'all') list = list.filter(it => it.categoryId === activeCategory);
  if (searchTerm) list = list.filter(it => (it.name || '').toLowerCase().includes(searchTerm));

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map(it => `
    <div class="item-card">
      ${it.image
        ? `<img class="item-photo" src="${it.image}" alt="${escapeHtml(it.name)}" loading="lazy" onerror="this.outerHTML='<div class=\\'item-photo placeholder\\'>🍽️</div>'">`
        : `<div class="item-photo placeholder">🍽️</div>`
      }
      <div class="item-body">
        <div class="item-name">${escapeHtml(it.name)}</div>
        ${it.description ? `<div class="item-desc">${escapeHtml(it.description)}</div>` : ''}
        <div class="item-foot">
          <span class="item-price">${it.price != null ? it.price + ' ₪' : ''}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
