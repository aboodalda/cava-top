let CATEGORIES = [];
let ITEMS = [];
let editingItemId = null;
let editingCatId = null;
let itemAvailable = true;

// ---------- AUTH ----------
auth.onAuthStateChanged(user => {
  document.getElementById('loginWrap').style.display = user ? 'none' : 'flex';
  document.getElementById('dashWrap').style.display = user ? 'block' : 'none';
});

document.getElementById('loginBtn').addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errBox = document.getElementById('loginError');
  errBox.textContent = '';
  auth.signInWithEmailAndPassword(email, pass).catch(err => {
    errBox.textContent = 'خطأ في تسجيل الدخول — تحقق من البريد وكلمة المرور';
    console.error(err);
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

// ---------- TABS ----------
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// ================= CATEGORIES =================
db.collection('categories').orderBy('order', 'asc').onSnapshot(snap => {
  CATEGORIES = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategoriesList();
  renderCategorySelect();
  renderItemsList(); // refresh category names shown on item rows
});

function renderCategorySelect() {
  const sel = document.getElementById('itCategory');
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
    || `<option value="">أضف قسم أولاً</option>`;
}

function renderCategoriesList() {
  const box = document.getElementById('categoriesList');
  if (!CATEGORIES.length) {
    box.innerHTML = `<div class="hint">لا توجد أقسام بعد. أضف أول قسم بالأعلى.</div>`;
    return;
  }
  box.innerHTML = CATEGORIES.map(c => `
    <div class="row-item">
      <div class="row-thumb">${c.icon || '🗂️'}</div>
      <div class="row-main">
        <div class="row-title">${escapeHtml(c.name)}</div>
        <div class="row-sub">${ITEMS.filter(i => i.categoryId === c.id).length} صنف</div>
      </div>
      <div class="row-actions">
        <button class="icon-btn edit" onclick="editCategory('${c.id}')">✏️</button>
        <button class="icon-btn danger" onclick="deleteCategory('${c.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('catSaveBtn').addEventListener('click', async () => {
  const name = document.getElementById('catName').value.trim();
  const icon = document.getElementById('catIcon').value.trim();
  if (!name) return showToast('اكتب اسم القسم');

  try {
    if (editingCatId) {
      await db.collection('categories').doc(editingCatId).update({ name, icon });
      showToast('تم تعديل القسم');
    } else {
      await db.collection('categories').add({ name, icon, order: Date.now() });
      showToast('تم إضافة القسم');
    }
    resetCategoryForm();
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ، حاول مرة أخرى');
  }
});

document.getElementById('catCancelBtn').addEventListener('click', resetCategoryForm);

function resetCategoryForm() {
  editingCatId = null;
  document.getElementById('catName').value = '';
  document.getElementById('catIcon').value = '';
  document.getElementById('catFormTitle').textContent = 'إضافة قسم جديد';
  document.getElementById('catCancelBtn').style.display = 'none';
}

window.editCategory = function (id) {
  const c = CATEGORIES.find(x => x.id === id);
  if (!c) return;
  editingCatId = id;
  document.getElementById('catName').value = c.name || '';
  document.getElementById('catIcon').value = c.icon || '';
  document.getElementById('catFormTitle').textContent = 'تعديل القسم';
  document.getElementById('catCancelBtn').style.display = 'block';
  document.querySelector('[data-tab="categories"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCategory = async function (id) {
  const inUse = ITEMS.some(i => i.categoryId === id);
  if (inUse && !confirm('هذا القسم فيه أصناف مرتبطة به. حذفه لن يحذف الأصناف لكنها ستختفي من فلترة القسم. متابعة؟')) return;
  if (!inUse && !confirm('حذف هذا القسم؟')) return;
  await db.collection('categories').doc(id).delete();
  showToast('تم حذف القسم');
};

// ================= ITEMS =================
db.collection('items').orderBy('order', 'asc').onSnapshot(snap => {
  ITEMS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderItemsList();
  renderCategoriesList();
});

function renderItemsList() {
  const box = document.getElementById('itemsList');
  document.getElementById('itemsCount').textContent = ITEMS.length;
  if (!ITEMS.length) {
    box.innerHTML = `<div class="hint">لا توجد أصناف بعد. أضف أول صنف بالأعلى.</div>`;
    return;
  }
  box.innerHTML = ITEMS.map(it => {
    const cat = CATEGORIES.find(c => c.id === it.categoryId);
    return `
      <div class="row-item">
        ${it.image
          ? `<img class="row-thumb" src="${it.image}" onerror="this.outerHTML='<div class=\\'row-thumb\\'>🍽️</div>'">`
          : `<div class="row-thumb">🍽️</div>`
        }
        <div class="row-main">
          <div class="row-title">${escapeHtml(it.name)} — ${it.price != null ? it.price + ' ₪' : ''}</div>
          <div class="row-sub">${cat ? escapeHtml(cat.name) : 'بدون قسم'} ${it.available === false ? '· غير متوفر' : ''}</div>
        </div>
        <div class="row-actions">
          <button class="icon-btn edit" onclick="editItem('${it.id}')">✏️</button>
          <button class="icon-btn danger" onclick="deleteItem('${it.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('itAvailToggle').addEventListener('click', function () {
  itemAvailable = !itemAvailable;
  this.classList.toggle('on', itemAvailable);
});

document.getElementById('itSaveBtn').addEventListener('click', async () => {
  const name = document.getElementById('itName').value.trim();
  const price = parseFloat(document.getElementById('itPrice').value);
  const categoryId = document.getElementById('itCategory').value;
  const image = document.getElementById('itImage').value.trim();
  const description = document.getElementById('itDesc').value.trim();

  if (!name) return showToast('اكتب اسم الصنف');
  if (isNaN(price)) return showToast('اكتب سعر صحيح');
  if (!categoryId) return showToast('اختر قسم للصنف');

  const data = { name, price, categoryId, image, description, available: itemAvailable };

  try {
    if (editingItemId) {
      await db.collection('items').doc(editingItemId).update(data);
      showToast('تم تعديل الصنف');
    } else {
      data.order = Date.now();
      await db.collection('items').add(data);
      showToast('تم إضافة الصنف');
    }
    resetItemForm();
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ، حاول مرة أخرى');
  }
});

document.getElementById('itCancelBtn').addEventListener('click', resetItemForm);

function resetItemForm() {
  editingItemId = null;
  document.getElementById('itName').value = '';
  document.getElementById('itPrice').value = '';
  document.getElementById('itImage').value = '';
  document.getElementById('itDesc').value = '';
  itemAvailable = true;
  document.getElementById('itAvailToggle').classList.add('on');
  document.getElementById('itFormTitle').textContent = 'إضافة صنف جديد';
  document.getElementById('itCancelBtn').style.display = 'none';
}

window.editItem = function (id) {
  const it = ITEMS.find(x => x.id === id);
  if (!it) return;
  editingItemId = id;
  document.getElementById('itName').value = it.name || '';
  document.getElementById('itPrice').value = it.price != null ? it.price : '';
  document.getElementById('itCategory').value = it.categoryId || '';
  document.getElementById('itImage').value = it.image || '';
  document.getElementById('itDesc').value = it.description || '';
  itemAvailable = it.available !== false;
  document.getElementById('itAvailToggle').classList.toggle('on', itemAvailable);
  document.getElementById('itFormTitle').textContent = 'تعديل الصنف';
  document.getElementById('itCancelBtn').style.display = 'block';
  document.querySelector('[data-tab="items"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteItem = async function (id) {
  if (!confirm('حذف هذا الصنف؟')) return;
  await db.collection('items').doc(id).delete();
  showToast('تم حذف الصنف');
};

// ================= SETTINGS =================
db.collection('settings').doc('main').onSnapshot(doc => {
  if (!doc.exists) return;
  const s = doc.data();
  document.getElementById('setName').value = s.name || '';
  document.getElementById('setTagline').value = s.tagline || '';
  document.getElementById('setHours').value = s.hours || '';
  document.getElementById('setRating').value = s.rating || '';
  document.getElementById('setPhone').value = s.phone || '';
  document.getElementById('setLocation').value = s.location || '';
});

document.getElementById('setSaveBtn').addEventListener('click', async () => {
  const data = {
    name: document.getElementById('setName').value.trim(),
    tagline: document.getElementById('setTagline').value.trim(),
    hours: document.getElementById('setHours').value.trim(),
    rating: document.getElementById('setRating').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    location: document.getElementById('setLocation').value.trim(),
  };
  try {
    await db.collection('settings').doc('main').set(data, { merge: true });
    showToast('تم حفظ الإعدادات');
  } catch (err) {
    console.error(err);
    showToast('حدث خطأ، حاول مرة أخرى');
  }
});
