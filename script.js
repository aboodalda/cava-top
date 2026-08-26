document.getElementById('year').textContent = new Date().getFullYear();

let CATEGORIES = [];   // {id, name, icon, order}
let ITEMS = [];        // {id, name, price, description, image, categoryId, order, available}
let activeCategory = 'all';
let searchTerm = '';
let restaurantPhone = '';

// ---------- CART ----------
let cart = loadCart(); // { itemId: qty }

function loadCart() {
  try { return JSON.parse(localStorage.getItem('cava-top-cart')) || {}; }
  catch { return {}; }
}
function saveCart() {
  localStorage.setItem('cava-top-cart', JSON.stringify(cart));
}

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
  restaurantPhone = s.phone || '';
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
  updateCartUI();
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
      document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const available = ITEMS.filter(it => it.available !== false);

  // ---- searching: flat results across everything ----
  if (searchTerm) {
    const list = available.filter(it => (it.name || '').toLowerCase().includes(searchTerm));
    grid.innerHTML = '';
    if (!list.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.appendChild(buildGrid(list));
    return;
  }

  // ---- specific category selected: show all its items ----
  if (activeCategory !== 'all') {
    const list = available.filter(it => it.categoryId === activeCategory);
    grid.innerHTML = '';
    if (!list.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.appendChild(buildGrid(list));
    return;
  }

  // ---- "الكل": grouped preview, 2 items per category ----
  grid.innerHTML = '';
  let any = false;
  CATEGORIES.forEach(cat => {
    const catItems = available.filter(it => it.categoryId === cat.id);
    if (!catItems.length) return;
    any = true;

    const section = document.createElement('div');
    section.className = 'cat-section';
    section.innerHTML = `
      <div class="cat-section-head">
        <div class="cat-section-title">${cat.icon || ''} ${escapeHtml(cat.name)}</div>
        <button class="cat-section-more" data-cat="${cat.id}">عرض الكل →</button>
      </div>
    `;
    section.querySelector('.cat-section-more').addEventListener('click', () => {
      activeCategory = cat.id;
      renderCatNav();
      renderItems();
      document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    section.appendChild(buildGrid(catItems.slice(0, 2)));
    grid.appendChild(section);
  });

  // items without a matching category
  const orphan = available.filter(it => !CATEGORIES.some(c => c.id === it.categoryId));
  if (orphan.length) {
    any = true;
    const section = document.createElement('div');
    section.className = 'cat-section';
    section.innerHTML = `<div class="cat-section-head"><div class="cat-section-title">🍽️ أصناف أخرى</div></div>`;
    section.appendChild(buildGrid(orphan.slice(0, 2)));
    grid.appendChild(section);
  }

  empty.style.display = any ? 'none' : 'block';
}

function buildGrid(list) {
  const wrap = document.createElement('div');
  wrap.className = 'items-grid';
  wrap.innerHTML = list.map(it => itemCardHtml(it)).join('');
  return wrap;
}

function itemCardHtml(it) {
  const qty = cart[it.id] || 0;
  return `
    <div class="item-card" data-id="${it.id}">
      ${it.image
        ? `<img class="item-photo" src="${it.image}" alt="${escapeHtml(it.name)}" loading="lazy" onerror="this.outerHTML='<div class=\\'item-photo placeholder\\'>🍽️</div>'">`
        : `<div class="item-photo placeholder">🍽️</div>`
      }
      <div class="item-body">
        <div class="item-name">${escapeHtml(it.name)}</div>
        ${it.description ? `<div class="item-desc">${escapeHtml(it.description)}</div>` : ''}
        <div class="item-foot">
          <span class="item-price">${it.price != null ? it.price + ' ₪' : ''}</span>
          <div class="qty-control" data-id="${it.id}">
            ${qty > 0
              ? `<button class="qty-btn minus" data-id="${it.id}">−</button>
                 <span class="qty-num">${qty}</span>
                 <button class="qty-btn plus" data-id="${it.id}">+</button>`
              : `<button class="add-btn" data-id="${it.id}">+ أضف</button>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------- delegated clicks for add/qty buttons ----------
document.getElementById('itemsGrid').addEventListener('click', e => {
  const addBtn = e.target.closest('.add-btn');
  const plusBtn = e.target.closest('.qty-btn.plus');
  const minusBtn = e.target.closest('.qty-btn.minus');
  if (addBtn) changeQty(addBtn.dataset.id, 1);
  else if (plusBtn) changeQty(plusBtn.dataset.id, 1);
  else if (minusBtn) changeQty(minusBtn.dataset.id, -1);
});

function changeQty(id, delta) {
  const current = cart[id] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) delete cart[id];
  else cart[id] = next;
  saveCart();
  renderItems();
  updateCartUI();
}

// ---------- cart UI ----------
function updateCartUI() {
  const ids = Object.keys(cart);
  const count = ids.reduce((s, id) => s + cart[id], 0);
  const total = ids.reduce((s, id) => {
    const it = ITEMS.find(x => x.id === id);
    return s + (it ? it.price * cart[id] : 0);
  }, 0);

  const bar = document.getElementById('cartBar');
  bar.style.display = count > 0 ? 'flex' : 'none';
  document.getElementById('cartBarCount').textContent = count;
  document.getElementById('cartBarTotal').textContent = total.toFixed(2) + ' ₪';

  renderCartSheet(ids, total);
}

function renderCartSheet(ids, total) {
  const list = document.getElementById('cartItemsList');
  const emptyMsg = document.getElementById('cartEmptyMsg');
  const foot = document.getElementById('cartFoot');

  if (!ids.length) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    foot.style.display = 'none';
    return;
  }
  emptyMsg.style.display = 'none';
  foot.style.display = 'block';

  list.innerHTML = ids.map(id => {
    const it = ITEMS.find(x => x.id === id);
    if (!it) return '';
    const qty = cart[id];
    return `
      <div class="cart-row">
        <div class="cart-row-main">
          <div class="cart-row-name">${escapeHtml(it.name)}</div>
          <div class="cart-row-price">${it.price} ₪ × ${qty} = ${(it.price * qty).toFixed(2)} ₪</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn minus" data-id="${id}">−</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn plus" data-id="${id}">+</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotalValue').textContent = total.toFixed(2) + ' ₪';
}

document.getElementById('cartItemsList').addEventListener('click', e => {
  const plusBtn = e.target.closest('.qty-btn.plus');
  const minusBtn = e.target.closest('.qty-btn.minus');
  if (plusBtn) changeQty(plusBtn.dataset.id, 1);
  else if (minusBtn) changeQty(minusBtn.dataset.id, -1);
});

document.getElementById('cartBar').addEventListener('click', () => openCart());
document.getElementById('cartCloseBtn').addEventListener('click', () => closeCart());
document.getElementById('cartOverlay').addEventListener('click', e => {
  if (e.target.id === 'cartOverlay') closeCart();
});

function openCart() {
  document.getElementById('cartOverlay').classList.add('show');
}
function closeCart() {
  document.getElementById('cartOverlay').classList.remove('show');
}

document.getElementById('cartClearBtn').addEventListener('click', () => {
  if (!confirm('تفريغ السلة؟')) return;
  cart = {};
  saveCart();
  renderItems();
  updateCartUI();
});

document.getElementById('cartSendBtn').addEventListener('click', () => {
  const ids = Object.keys(cart);
  if (!ids.length) return;

  let msg = `طلب جديد من منيو Cava Top:\n\n`;
  let total = 0;
  ids.forEach(id => {
    const it = ITEMS.find(x => x.id === id);
    if (!it) return;
    const qty = cart[id];
    const sub = it.price * qty;
    total += sub;
    msg += `• ${it.name} × ${qty} = ${sub.toFixed(2)} ₪\n`;
  });
  msg += `\nالمجموع: ${total.toFixed(2)} ₪`;

  let phone = (restaurantPhone || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '970' + phone.slice(1);

  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

updateCartUI();
