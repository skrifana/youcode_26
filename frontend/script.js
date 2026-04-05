const API = "http://localhost:8001";
let selectedShelter = null;
let currentLang = 'en';
let map, markersLayer;

const TRANSLATIONS = {
  en: {
    nav_info: 'Info', nav_resources: 'Resources', back: 'Back',
    hero_sub: 'Find nourishing recipes for your shelter',
    search_placeholder: 'Search by shelter name or city…', search_btn: 'Find',
    back_map: '← Back to map',
    drop_kitchen: '🍳 Kitchen', drop_no_kitchen: 'No Kitchen',
    badge_kitchen: '🍳 Kitchen Available', badge_no_kitchen: '🚫 No Kitchen',
    pantry_title: 'Pantry',
    pantry_sub: 'Add what\'s available — one ingredient works',
    pantry_placeholder: 'rice, eggs, lentils…',
    btn_add: 'Add',
    prefs_label: 'Preferences',
    pref_cuisine: 'Cuisine',
    cuisine_any: 'Any cuisine',
    cuisine_me: 'Middle Eastern',
    cuisine_ea: 'East Asian',
    cuisine_sa: 'South Asian',
    cuisine_sam: 'South American / Mexican',
    cuisine_basic: 'Simple & quick',
    pref_kitchen: 'Kitchen access',
    kitchen_full: 'Full kitchen — oven, stove, pantry',
    kitchen_partial: 'Partial — microwave / air fryer / kettle',
    kitchen_none: 'No heat source',
    pref_servings: 'Serving size',
    servings_1: 'Just me',
    servings_3: '2–4 people',
    servings_20: 'Bulk — many people',
    pref_dietary: 'Dietary needs',
    diet_halal: 'Halal', diet_veg: 'Vegetarian', diet_vegan: 'Vegan', diet_gf: 'Gluten-free',
    pref_mode: 'Recipe mode',
    mode_lab_title: '🧪 Assembly lab', mode_lab_desc: 'Step-by-step guided cooking',
    mode_card_title: '📋 Recipe card', mode_card_desc: 'Full recipe + macro highlights',
    btn_generate: 'Generate my recipe',
    back_prefs: 'Adjust preferences',
    custom_nutrition: 'Customised nutrition plan',
    loading_recipes: 'Finding recipes for you…',
    recipe_error: 'Could not load recipes. Please try again.',
    lab_title: 'Lab',
    lab_status: 'Click a pantry item to start.',
    lab_pantry: 'Pantry',
    kitchen_board: 'Cutting board', kitchen_board_lbl: 'cutting board',
    kitchen_stove: 'Stovetop',
    kitchen_pan: 'pan', kitchen_pot: 'pot',
    kitchen_kettle: 'Kettle', kitchen_kettle_lbl: 'kettle',
    kitchen_micro: 'Microwave', kitchen_micro_lbl: 'microwave',
    kitchen_oven: 'Oven', kitchen_oven_lbl: 'oven',
    kitchen_bowl: 'Bowl / plate', kitchen_bowl_lbl: 'bowl',
    btn_reset: '↺ Reset',
    back_recipes: 'Back to recipes',
    info_h1: 'What is YouCode?',
    info_p1: 'YouCode is a compassionate tool designed to help women in transition shelters across British Columbia discover nourishing recipes tailored to their shelter\'s facilities.',
    info_h2: 'How it works',
    info_p2: 'Search for your shelter by name or city. Based on whether your shelter has a shared kitchen, we suggest recipes you can realistically make — full meals if you have a kitchen, or simple no-cook options if you don\'t.',
    info_h3: 'Our mission',
    info_p3: 'Good food is dignity. We believe every woman in a shelter deserves access to simple, culturally-aware, and nutritious meal ideas regardless of their circumstances.',
    res1_title: 'BC Crisis Line',       res1_desc: '24/7 support: 1-800-784-2433',
    res2_title: 'Food Banks BC',        res2_desc: 'Find your nearest food bank: foodbanksbc.com',
    res3_title: 'BC Housing',           res3_desc: 'Transitional housing support: bchousing.org',
    res4_title: 'VictimLinkBC',         res4_desc: 'Immediate assistance: 1-800-563-0808',
    res5_title: 'HealthLink BC Dietitian', res5_desc: 'Free nutrition advice: 8-1-1',
    build_recipe: 'build your recipe',
  }
};

const LANG_CODES = {
  fr: 'fr', es: 'es', zh: 'zh-CN', ar: 'ar',
  ja: 'ja', ko: 'ko', vi: 'vi', hi: 'hi',
  tl: 'tl', pa: 'pa', fa: 'fa', so: 'so',
};

const translationCache = { en: TRANSLATIONS.en };

function t(key) {
  const cache = translationCache[currentLang] || TRANSLATIONS.en;
  return cache[key] || TRANSLATIONS.en[key] || key;
}

async function googleTranslate(texts, targetCode) {
  return Promise.all(texts.map(async text => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data[0].map(c => c[0]).join('');
  }));
}

function applyTranslations(tMap) {  
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (tMap[key] !== undefined) el.textContent = tMap[key];
    });
  
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (tMap[key] !== undefined) el.setAttribute('placeholder', tMap[key]);
    });
  
    document.querySelectorAll('option[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (tMap[key] !== undefined) el.textContent = tMap[key];
    });
  
    if (selectedShelter) updateKitchenBadge(tMap);
  }

function updateKitchenBadge(tMap) {
  const badge = document.getElementById('kitchenBadge');
  if (!badge) return;
  if (selectedShelter.hasKitchen) {
    badge.textContent = tMap.badge_kitchen || '🍳 Kitchen Available';
    badge.className = 'kitchen-badge has';
  } else {
    badge.textContent = tMap.badge_no_kitchen || '🚫 No Kitchen';
    badge.className = 'kitchen-badge no';
  }
}

async function changeLanguage(lang) {
  currentLang = lang;
  if (lang === 'en' || !LANG_CODES[lang]) {
    applyTranslations(TRANSLATIONS.en);
    return;
  }
  if (translationCache[lang]) {
    applyTranslations(translationCache[lang]);
    return;
  }

  const targetCode = LANG_CODES[lang];
  const entries = Object.entries(TRANSLATIONS.en);
  const SKIP_REGEX = /^[\d\s\-:/.🍳🚫📞🆘🥗🏠🍎↺]+$/;
  const toTranslate = [], toTranslateIdx = [];
  entries.forEach(([, v], i) => {
    if (!SKIP_REGEX.test(v)) { toTranslate.push(v); toTranslateIdx.push(i); }
  });

  try {
    const translated = entries.map(([, v]) => v);
    const results = await googleTranslate(toTranslate, targetCode);
    toTranslateIdx.forEach((origIdx, i) => { translated[origIdx] = results[i] ?? translated[origIdx]; });
    const tMap = {};
    entries.forEach(([key], i) => { tMap[key] = translated[i]; });
    translationCache[lang] = tMap;
    applyTranslations(tMap);
  } catch (e) {
    console.warn('Translation failed, using English:', e);
    applyTranslations(TRANSLATIONS.en);
  }
}

async function translateToEnglish(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) return text;
  const data = await res.json();
  return data[0].map(c => c[0]).join('');
}

async function translateSingle(text, targetCode) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) return text;
  const data = await res.json();
  return data[0].map(c => c[0]).join('');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function showPanel(name) {
  document.getElementById('panelInfo').classList.remove('open');
  document.getElementById('panelResources').classList.remove('open');
  document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('open');
}

function hidePanel(name) {
  document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.remove('open');
}

function initMap() {
  map = L.map('map', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
  map.setView([53.7, -127.6], 5);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { map.setView([pos.coords.latitude, pos.coords.longitude], 9); updateNearbyDropdown(); },
      () => {}
    );
  }

  map.on('moveend', updateNearbyDropdown);
  plotAllMarkers();
}

function plotAllMarkers() {
  markersLayer.clearLayers();
  (typeof SHELTERS !== 'undefined' ? SHELTERS : []).filter(s => s.lat && s.lng).forEach(s => {
    const color = s.hasKitchen ? '#2e7a4f' : '#c0392b';
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [12, 12], iconAnchor: [6, 6]
    });
    L.marker([s.lat, s.lng], { icon })
      .bindTooltip(s.name, { permanent: false, direction: 'top' })
      .on('click', () => selectShelter(s))
      .addTo(markersLayer);
  });
}

async function updateNearbyDropdown() {
  const q = document.getElementById('searchInput').value.trim();
  if (q) return;
  const bounds = map.getBounds();
  const nearby = (typeof SHELTERS !== 'undefined' ? SHELTERS : [])
    .filter(s => s.lat && s.lng && bounds.contains([s.lat, s.lng])).slice(0, 8);
  if (nearby.length) await renderDropdown(nearby, true);
  else closeDropdown();
}

async function onSearchInput() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) { updateNearbyDropdown(); return; }
  const qEn = currentLang === 'en' ? q.toLowerCase() : (await translateToEnglish(q)).toLowerCase();
  const results = (typeof SHELTERS !== 'undefined' ? SHELTERS : [])
    .filter(s => s.name.toLowerCase().includes(qEn) || s.city.toLowerCase().includes(qEn)).slice(0, 10);
  if (results.length) await renderDropdown(results, false);
  else closeDropdown();
}

function onSearchKey(e) {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') closeDropdown();
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const qEn = currentLang === 'en' ? q.toLowerCase() : (await translateToEnglish(q)).toLowerCase();
  const found = (typeof SHELTERS !== 'undefined' ? SHELTERS : [])
    .filter(s => s.name.toLowerCase().includes(qEn) || s.city.toLowerCase().includes(qEn));
  if (found.length === 1) selectShelter(found[0]);
  else if (found.length > 1) await renderDropdown(found.slice(0, 10), false);
}

async function renderDropdown(items, isNearby) {
  const dd = document.getElementById('dropdown');
  const tMap = translationCache[currentLang] || TRANSLATIONS.en;
  const targetCode = LANG_CODES[currentLang];

  const translated = await Promise.all(items.map(async s => {
    if (!targetCode) return { name: s.name, city: s.city };
    const [name, city] = await Promise.all([
      translateSingle(s.name, targetCode),
      translateSingle(s.city, targetCode)
    ]);
    return { name, city };
  }));

  dd.innerHTML = items.map((s, i) => `
    <div class="drop-item" onclick="selectShelter(window.__shelterById('${s.id}'))">
      <div>
        <div class="drop-name">${translated[i].name}</div>
        <div class="drop-city">${translated[i].city}</div>
      </div>
      <span class="drop-badge ${s.hasKitchen ? 'kitchen' : 'no-kitchen'}">
        ${s.hasKitchen ? (tMap.drop_kitchen || '🍳 Kitchen') : (tMap.drop_no_kitchen || 'No Kitchen')}
      </span>
    </div>
  `).join('');
  dd.classList.add('open');
}

window.__shelterById = id => (typeof SHELTERS !== 'undefined' ? SHELTERS : []).find(s => s.id === id);

function closeDropdown() {
  document.getElementById('dropdown').classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) closeDropdown();
});

function selectShelter(shelter) {
  if (!shelter) return;
  selectedShelter = shelter;
  closeDropdown();
  document.getElementById('searchInput').value = shelter.name;

  if (shelter.lat && shelter.lng && map) {
    map.flyTo([shelter.lat, shelter.lng], 13, { duration: 1 });
  }

  // Pre-fill kitchen access from shelter data
  document.getElementById('pref-kitchen').value = shelter.hasKitchen ? 'full' : 'none';

  // Update prefs hero
  document.getElementById('prefsShelterName').innerHTML =
    `${shelter.name} — <em>${t('build_recipe')}</em>`;
  document.getElementById('prefsResidentText').textContent = '';
  document.getElementById('prefsPill').innerHTML =
    `<span class="shelter-meta-pill">📍 ${shelter.city}</span>`;

  showScreen('screenPrefs');
}
function addPantryItem() {
  const inp = document.getElementById('pantry-input');
  const items = inp.value.split(',').map(s => s.trim()).filter(Boolean);
  const list = document.getElementById('pantry-tags');
  items.forEach(val => {
    const tag = document.createElement('div');
    tag.className = 'ptag';
    tag.innerHTML = `<span>${val}</span><button onclick="this.parentElement.remove()" aria-label="Remove">✕</button>`;
    list.appendChild(tag);
  });
  inp.value = '';
  inp.focus();
}

function getPantry() {
  return Array.from(document.querySelectorAll('.ptag span')).map(e => e.textContent.trim()).filter(Boolean);
}

function getChecked(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value);
}

function getMode() {
  const r = document.querySelector('input[name="mode"]:checked');
  return r ? r.value : 'static';
}

document.addEventListener('change', e => {
  if (e.target.matches('input[name="diet"]')) {
    e.target.closest('.chip').classList.toggle('on', e.target.checked);
  }
});

function selectMode(val) {
  document.getElementById('mcard-interactive').classList.toggle('on', val === 'interactive');
  document.getElementById('mcard-static').classList.toggle('on', val === 'static');
}

function showError(msg) {
  const el = document.getElementById('error-toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}

async function submitPrefs() {
  const pantry = getPantry();
  if (!selectedShelter) { alert('Please select a shelter first.'); showScreen('screenSearch'); return; }
  if (!pantry.length) { showError('Please add at least one pantry ingredient.'); return; }

  const btn = document.getElementById('btn-gen');
  btn.innerHTML = '<div class="spin"></div> Generating…';
  btn.disabled = true;

  const mode = getMode();
  const kitchenAccess = document.getElementById('pref-kitchen').value;
  const cuisine = document.getElementById('pref-cuisine').value;
  const servings = parseInt(document.getElementById('pref-servings').value) || 4;

  const DIET_MAP = { halal: 'Halal', vegetarian: 'Vegetarian', vegan: 'Vegan', gluten_free: 'Gluten Free' };
  const dietary = getChecked('diet').map(d => DIET_MAP[d] || d);

  document.getElementById('mainShelterName').textContent = selectedShelter.name;
  updateKitchenBadge(translationCache[currentLang] || TRANSLATIONS.en);
  document.getElementById('recipesGrid').innerHTML = `
    <div class="recipe-loading">
      <div class="spinner"></div>
      <p>${t('loading_recipes')}</p>
    </div>`;
  showScreen('screenMain');

  const body = {
    shelter_id: selectedShelter.id,
    ingredients: pantry,
    cuisine: cuisine || null,
    servings: servings,
    kitchen_access: kitchenAccess,
    dietary_overrides: dietary,
    mode: mode === 'interactive' ? 'Interactive Mode' : 'Non-Interactive Mode'
  };

  try {
    const res = await fetch(`${API}/recommend/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      const detail = err.detail;
      const msg = Array.isArray(detail)
        ? detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(', ')
        : (typeof detail === 'string' ? detail : JSON.stringify(detail));
      throw new Error(msg || `Server error ${res.status}`);
    }

    const data = await res.json();
    window.__recipes = data.recipes;
    renderGrid(data.recipes, mode);

  } catch (err) {
    document.getElementById('recipesGrid').innerHTML =
      `<div class="recipe-loading"><p>⚠️ ${err.message}</p></div>`;
  } finally {
    btn.innerHTML = `<span data-i18n="btn_generate">${t('btn_generate')}</span>`;
    btn.disabled = false;
  }
}

function renderGrid(recipes, mode) {
  const grid = document.getElementById('recipesGrid');
  if (!recipes || !recipes.length) {
    grid.innerHTML = '<div class="recipe-loading"><p>No recipes returned. Try different ingredients.</p></div>';
    return;
  }
  grid.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe(${i},'${mode}')" style="animation: fadeUp 0.4s ease ${i * 0.05}s both">
      <div class="recipe-emoji">${r.emoji || '🍽'}</div>
      <div class="recipe-title">${r.title}</div>
      <div class="recipe-meta-row">
        <span>⏱ ${r.prep_time || r.time || '—'}</span>
        <span>🔥 ${r.cook_time || '—'}</span>
        <span>👥 ${r.servings || '—'}</span>
        ${r.difficulty ? `<span>⭐ ${r.difficulty}</span>` : ''}
      </div>
      <div class="recipe-desc">${(r.instructions || [])[0] || r.desc || ''}</div>
      ${r.nutrition_highlight ? `<div class="nutr-badge">✨ ${r.nutrition_highlight}</div>` : ''}
    </div>
  `).join('');
}


function openRecipe(idx, mode) {
  const r = window.__recipes[idx];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const macrosHTML = (r.macros || []).map(m => `
    <div class="macro-chip">
      <div class="mn">${m.nutrient}</div>
      <div class="ma">${m.amount}</div>
      <div class="mb">${m.benefit}</div>
    </div>`).join('');

  const subsEntries = Object.entries(r.substitutions || {});
  const subsHTML = subsEntries.length ? `
    <p class="modal-sec">Substitutions</p>
    <ul class="subs-list">${subsEntries.map(([k, vs]) =>
      `<li><strong>${k}</strong> → ${(Array.isArray(vs) ? vs : [vs]).join(', ')}</li>`
    ).join('')}</ul>` : '';

  const labBtn = (r.assembly_steps || []).length ?
    `<button class="btn-lab" onclick="startLab(${idx})">🧪 Start Assembly Lab</button>` : '';

  const ingredients = r.ingredients || [];
  const steps = r.instructions || r.steps || [];

  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-emoji">${r.emoji || '🍽'}</div>
      <h2 class="modal-title">${r.title}</h2>
      <p class="modal-desc">${r.prep_time || r.time || ''} prep · ${r.cook_time || ''} cook · serves ${r.servings || ''}</p>
      ${r.nutrition_highlight ? `<div style="text-align:center;margin-bottom:1rem"><span class="nutr-badge">✨ ${r.nutrition_highlight}</span></div>` : ''}
      <div class="modal-macros">${macrosHTML}</div>
      <p class="modal-sec">Ingredients</p>
      <ul class="modal-ingredients">${ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      <p class="modal-sec">Steps</p>
      <ol class="modal-steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${subsHTML}
      ${labBtn}
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  window.__modal = overlay;
}

function closeModal() {
  if (window.__modal) { window.__modal.remove(); window.__modal = null; }
}

const KITCHEN_IDS = ['cutting-board', 'stovetop-pan', 'stovetop-pot', 'kettle', 'microwave', 'oven', 'bowl'];
let labStepIndex = 0, labPhase = 'first', labGameOver = false, labRecipe = null;

function startLab(recipeIdx) {
  closeModal();
  labRecipe = window.__recipes[recipeIdx];
  const rawSteps = labRecipe.assembly_steps || [];
  if (!rawSteps.length) {
    alert('No interactive steps for this recipe. Make sure Interactive Mode was selected before generating.');
    return;
  }

  document.getElementById('lab-title').innerHTML = labRecipe.title + ' — Cooking <em>Lab</em>';
  const kitchenAccess = document.getElementById('pref-kitchen').value;
  const hide = [];
  if (kitchenAccess === 'none') hide.push('stovetop-area', 'oven-area', 'kettle-area', 'microwave-area');
  if (kitchenAccess === 'partial') hide.push('stovetop-area', 'oven-area');

  const steps = rawSteps.map(s => {
    const tool = inferKitchenTool(s.action, s.ingredient);
    return {
      instruction: s.tip ? s.action + ' — 💡 ' + s.tip : s.action,
      ingredient: s.ingredient,
      kitchenTool: tool,
      clickFirst: { type: 'pantry', id: s.ingredient },
      clickSecond: { type: 'kitchen', id: tool },
    };
  });

  initLab(steps, labRecipe.ingredients, hide);
  showScreen('screenLab');
}

function inferKitchenTool(action, ingredient) {
  const a = (action + ' ' + ingredient).toLowerCase();
  if (a.includes('chop') || a.includes('cut') || a.includes('slice') || a.includes('dice')) return 'cutting-board';
  if (a.includes('boil') || a.includes('simmer') || a.includes('pot')) return 'stovetop-pot';
  if (a.includes('fry') || a.includes('sauté') || a.includes('saute') || a.includes('pan') || a.includes('cook') || a.includes('pour')) return 'stovetop-pan';
  if (a.includes('kettle') || a.includes('hot water') || a.includes('brew') || a.includes('steep')) return 'kettle';
  if (a.includes('microwave') || a.includes('heat')) return 'microwave';
  if (a.includes('bake') || a.includes('oven') || a.includes('roast')) return 'oven';
  return 'bowl';
}

function initLab(steps, ingredients, hiddenAreas) {
  labStepIndex = 0; labPhase = 'first'; labGameOver = false;
  ['board-area', 'stovetop-area', 'kettle-area', 'microwave-area', 'oven-area'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = '';
  });
  hiddenAreas.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });

  const pantryEl = document.getElementById('pantry'); pantryEl.innerHTML = '';
  const used = steps.filter(s => s.clickFirst.type === 'pantry').map(s => s.clickFirst.id)
    .filter((v, i, a) => a.indexOf(v) === i);

  used.forEach(ing => {
    const item = document.createElement('div');
    item.className = 'veggie-item';
    item.id = 'pantry-' + CSS.escape(ing);
    item.setAttribute('data-ingredient', ing);
    item.innerHTML = `<span class="veggie-sprite">${ingredientEmoji(ing)}</span><span class="veggie-label">${ing}</span>`;
    item.addEventListener('click', () => handleLabClick({ type: 'pantry', id: ing }));
    pantryEl.appendChild(item);
  });

  KITCHEN_IDS.forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', () => handleLabClick({ type: 'kitchen', id: id }));
  });

  window.__labSteps = steps;
  loadLabStep();
}

function ingredientEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes('egg')) return '🥚';
  if (n.includes('tomato')) return '🍅';
  if (n.includes('onion')) return '🧅';
  if (n.includes('garlic')) return '🧄';
  if (n.includes('rice')) return '🍚';
  if (n.includes('chicken')) return '🍗';
  if (n.includes('oil')) return '🫙';
  if (n.includes('salt') || n.includes('pepper') || n.includes('spice')) return '🧂';
  if (n.includes('lemon') || n.includes('lime')) return '🍋';
  if (n.includes('carrot')) return '🥕';
  if (n.includes('potato')) return '🥔';
  if (n.includes('bread')) return '🍞';
  if (n.includes('milk') || n.includes('dairy')) return '🥛';
  if (n.includes('lentil') || n.includes('bean') || n.includes('chickpea')) return '🫘';
  if (n.includes('spinach') || n.includes('kale') || n.includes('green')) return '🥬';
  return '🥗';
}

function loadLabStep() {
  const steps = window.__labSteps; if (!steps || !steps.length) return;
  const step = steps[labStepIndex];
  const expected = labPhase === 'first' ? step.clickFirst : step.clickSecond;
  const toolName = expected.id.replace(/-/g, ' ');
  document.getElementById('status-text').textContent = labPhase === 'first'
    ? `Step ${labStepIndex + 1}/${steps.length}: ${step.instruction}`
    : `Now click the ${toolName} →`;
  updateLabHighlights(expected);
}

function handleLabClick(source) {
  if (labGameOver) return;
  const steps = window.__labSteps;
  const step = steps[labStepIndex];
  const expected = labPhase === 'first' ? step.clickFirst : step.clickSecond;
  if (source.type !== expected.type || source.id !== expected.id) return;
  if (labPhase === 'first') { labPhase = 'second'; loadLabStep(); }
  else { labStepIndex++; if (labStepIndex >= steps.length) endLab(); else { labPhase = 'first'; loadLabStep(); } }
}

function endLab() {
  labGameOver = true; clearLabHighlights(); lockAllLab();
  document.getElementById('status-text').textContent = `Your ${labRecipe ? labRecipe.title : 'dish'} is complete! 🎉`;
  document.querySelector('#status-bar .s-icon').textContent = '🎉';
}

function updateLabHighlights(expected) {
  clearLabHighlights(); lockAllLab();
  if (expected.type === 'pantry') {
    const el = document.querySelector(`[data-ingredient="${expected.id}"]`);
    if (el) { el.classList.add('active-item'); el.classList.remove('locked-item'); addArrow(el); }
  } else {
    const el = document.getElementById(expected.id);
    if (el) { el.classList.add('active-kitchen'); el.classList.remove('locked-kitchen'); addArrow(el); }
  }
}

function addArrow(el) {
  const a = document.createElement('span');
  a.className = 'arrow-indicator'; a.textContent = '▼';
  el.style.position = 'relative'; el.appendChild(a);
}

function clearLabHighlights() {
  document.querySelectorAll('.active-item').forEach(e => e.classList.remove('active-item'));
  document.querySelectorAll('.active-kitchen').forEach(e => e.classList.remove('active-kitchen'));
  document.querySelectorAll('.arrow-indicator').forEach(e => e.remove());
}

function lockAllLab() {
  document.querySelectorAll('.veggie-item').forEach(e => e.classList.add('locked-item'));
  KITCHEN_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('locked-kitchen'); });
}

function resetLab() { if (window.__labSteps) initLab(window.__labSteps, [], []); }

document.addEventListener('DOMContentLoaded', () => {
  showScreen('screenSearch');
  initMap();
  applyTranslations(TRANSLATIONS.en);
  document.getElementById('pantry-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addPantryItem();
  });
});