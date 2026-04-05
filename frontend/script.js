/* ====================================================
   YouCode — main script
   ==================================================== */
const API = "http://localhost:8000";
// ── State ──────────────────────────────────────────
let selectedShelter = null;
let currentLang = 'en';
let previousScreen = 'screenSearch';
let map, markersLayer;

// ── Translations ───────────────────────────────────
const TRANSLATIONS = {
  en: {
    nav_about: 'About', nav_resources: 'Resources', back: 'Back',
    hero_title: 'YouCode', hero_sub: 'Find nourishing recipes for your shelter',
    search_placeholder: 'Search by shelter name or city…', search_btn: 'Find',
    kitchen_yes: '🍳 Shared Kitchen Available', kitchen_no: '🚫 No Shared Kitchen',
    about_h1: 'What is YouCode?', about_p1: 'YouCode is a compassionate tool designed to help women in transition shelters across British Columbia discover nourishing recipes tailored to their shelter\'s facilities.',
    about_h2: 'How it works', about_p2: 'Search for your shelter by name or city. Based on whether your shelter has a shared kitchen, we suggest recipes you can realistically make — full meals if you have a kitchen, or simple no-cook options if you don\'t.',
    about_h3: 'Our mission', about_p3: 'Good food is dignity. We believe every woman in a shelter deserves access to simple, culturally-aware, and nutritious meal ideas regardless of their circumstances.',
    res1_title: 'BC Crisis Line', res1_desc: '24/7 support: 1-800-784-2433',
    res2_title: 'Food Banks BC', res2_desc: 'Find your nearest food bank: foodbanksbc.com',
    res3_title: 'BC Housing', res3_desc: 'Transitional housing support: bchousing.org',
    res4_title: 'VictimLinkBC', res4_desc: 'Immediate assistance: 1-800-563-0808',
    res5_title: 'HealthLink BC Dietitian', res5_desc: 'Free nutrition advice: 8-1-1',
    loading_recipes: 'Finding recipes for you…',
    badge_kitchen: '🍳 Kitchen Available', badge_no_kitchen: '🚫 No Kitchen',
    drop_kitchen: '🍳 Kitchen', drop_no_kitchen: 'No Kitchen',
  }
};

// ── i18n via Claude API ─────────────────────────────
const translationCache = { en: TRANSLATIONS.en };

async function changeLanguage(lang) {
  currentLang = lang;
  if (translationCache[lang]) {
    applyTranslations(translationCache[lang]);
    return;
  }
  const keys = TRANSLATIONS.en;
  const prompt = `Translate the following JSON values into ${getLangName(lang)}. Return ONLY valid JSON with the same keys, no markdown, no extra text.\n${JSON.stringify(keys, null, 2)}`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': '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',       
        'anthropic-version': '2023-06-01',        
        'anthropic-dangerous-direct-browser-access': 'true' 
       },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    console.log('Translation API response:', data);  // ← add this
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const translated = JSON.parse(clean);
    translationCache[lang] = translated;
    applyTranslations(translated);
  } catch (e) {
    console.warn('Translation failed, using English', e);
    applyTranslations(TRANSLATIONS.en);
  }
}

function getLangName(code) {
  return { fr: 'French', es: 'Spanish', zh: 'Simplified Chinese' }[code] || 'English';
}

function applyTranslations(t) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key]) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (t[key]) el.placeholder = t[key];
  });
}

// ── Map ─────────────────────────────────────────────
function initMap() {
  map = L.map('map', { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  // Default view: BC
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
  SHELTERS.filter(s => s.lat && s.lng).forEach(s => {
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

function updateNearbyDropdown() {
  const q = document.getElementById('searchInput').value.trim();
  if (q) return; // only show nearby when search is empty
  const bounds = map.getBounds();
  const nearby = SHELTERS.filter(s => s.lat && s.lng && bounds.contains([s.lat, s.lng])).slice(0, 8);
  if (nearby.length) renderDropdown(nearby, true);
  else closeDropdown();
}

// ── Search ──────────────────────────────────────────
function onSearchInput() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!q) { updateNearbyDropdown(); return; }
  const results = SHELTERS.filter(s =>
    s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
  ).slice(0, 10);
  if (results.length) renderDropdown(results, false);
  else closeDropdown();
}

function onSearchKey(e) {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') closeDropdown();
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!q) return;
  const found = SHELTERS.filter(s =>
    s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
  );
  if (found.length === 1) {
    selectShelter(found[0]);
  } else if (found.length > 1) {
    renderDropdown(found.slice(0, 10), false);
  }
}

function renderDropdown(items, isNearby) {
  const dd = document.getElementById('dropdown');
  const t = translationCache[currentLang] || TRANSLATIONS.en;
  dd.innerHTML = items.map(s => `
    <div class="drop-item" onclick="selectShelter(window.__shelterById('${s.id}'))">
      <div>
        <div class="drop-name">${s.name}</div>
        <div class="drop-city">${s.city}</div>
      </div>
      <span class="drop-badge ${s.hasKitchen ? 'kitchen' : 'no-kitchen'}">
        ${s.hasKitchen ? (t.drop_kitchen || '🍳 Kitchen') : (t.drop_no_kitchen || 'No Kitchen')}
      </span>
    </div>
  `).join('');
  dd.classList.add('open');
}

window.__shelterById = id => SHELTERS.find(s => s.id === id);

function closeDropdown() {
  document.getElementById('dropdown').classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) closeDropdown();
});

// ── Shelter Selection ───────────────────────────────
function selectShelter(shelter) {
  selectedShelter = shelter;
  closeDropdown();
  document.getElementById('searchInput').value = shelter.name;

  // Fly to marker if has coords
  if (shelter.lat && shelter.lng) {
    map.flyTo([shelter.lat, shelter.lng], 13, { duration: 1 });
  }

  showScreen('screenMain');
  buildMainScreen();

}

// ── Main Screen ─────────────────────────────────────
function buildMainScreen() {
  const t = translationCache[currentLang] || TRANSLATIONS.en;
  document.getElementById('mainShelterName').textContent = selectedShelter.name;
  const badge = document.getElementById('kitchenBadge');
  if (selectedShelter.hasKitchen) {
    badge.textContent = t.badge_kitchen || '🍳 Kitchen Available';
    badge.className = 'kitchen-badge has';
  } else {
    badge.textContent = t.badge_no_kitchen || '🚫 No Kitchen';
    badge.className = 'kitchen-badge no';
  }
  loadRecipes();
}

// async function loadRecipes() {
//   const grid = document.getElementById('recipesGrid');
//   grid.innerHTML = `<div class="recipe-loading"><div class="spinner"></div><p>${(translationCache[currentLang] || TRANSLATIONS.en).loading_recipes || 'Finding recipes for you…'}</p></div>`;
//
//   const langName = getLangName(currentLang);
//   const kitchenCtx = selectedShelter.hasKitchen
//     ? 'The shelter HAS a shared kitchen with stove, oven, and basic cookware.'
//     : 'The shelter has NO shared kitchen. All recipes must require NO cooking — only microwave, kettle, or no heat at all.';
//
//   const prompt = `You are a compassionate recipe assistant for women in transition shelters in British Columbia, Canada.
//
// Context: ${kitchenCtx}
// Shelter: ${selectedShelter.name}, ${selectedShelter.city}
// Language for all text: ${langName}
//
// Generate exactly 8 diverse, practical, and culturally-aware recipes appropriate for shelter cooking.
// ${selectedShelter.hasKitchen ? 'Include a mix of breakfast, lunch, dinner, and snack recipes.' : 'All recipes MUST be no-cook: salads, wraps, overnight oats, fruit bowls, etc.'}
//
// Respond ONLY with a JSON array of 8 recipe objects. No markdown, no preamble. Schema:
// [
//   {
//     "emoji": "🍲",
//     "title": "Recipe Name in ${langName}",
//     "time": "20 min",
//     "servings": "4",
//     "difficulty": "Easy",
//     "desc": "One-sentence description in ${langName}",
//     "ingredients": ["ingredient 1", "ingredient 2"],
//     "steps": ["Step 1", "Step 2", "Step 3"]
//   }
// ]`;
//
//   try {
//     const res = await fetch('https://api.anthropic.com/v1/messages', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         model: 'claude-sonnet-4-20250514',
//         max_tokens: 1000,
//         messages: [{ role: 'user', content: prompt }]
//       })
//     });
//     const data = await res.json();
//     const text = data.content.map(b => b.text || '').join('');
//     const clean = text.replace(/```json|```/g, '').trim();
//     const recipes = JSON.parse(clean);
//     renderRecipes(recipes);
//   } catch (e) {
//     grid.innerHTML = `<div class="recipe-loading"><p>Could not load recipes. Please try again.</p></div>`;
//     console.error(e);
//   }
// }

async function loadRecipes() {
  const grid = document.getElementById('recipesGrid');
  const t = translationCache[currentLang] || TRANSLATIONS.en;

  // Show loading state
  grid.innerHTML = `
    <div class="recipe-loading">
      <div class="spinner"></div>
      <p>${t.loading_recipes || 'Finding recipes for you…'}</p>
    </div>`;

  // Map your JS data to your FastAPI Pydantic Model
  const requestBody = {
    shelter_id: selectedShelter.id,
    ingredients: ["rice", "beans", "canned tomatoes", "onions"], // Update this from a UI input later!
    cuisine: "Basics",
    servings: 4,
    kitchen_access: selectedShelter.hasKitchen ? "full" : "none",
    dietary_overrides: [],
    mode: "non_interactive"
  };

  try {
    // 1. Call YOUR backend instead of Anthropic directly
    const res = await fetch(`${API}/recommend`, {
      method: 'POST',
<<<<<<< HEAD
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
=======
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': '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',        
        'anthropic-version': '2023-06-01',      
        'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
>>>>>>> 344ac10 (update)
    });

    if (!res.ok) throw new Error('Backend server error');

    const data = await res.json();
<<<<<<< HEAD

    // 2. Map your backend's RecipeResponse to your UI
    // Assuming your backend returns { recipes: [...] }
    renderRecipes(data.recipes);

=======
    console.log('Translation API response:', data);  // ← add this
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const recipes = JSON.parse(clean);
    renderRecipes(recipes);
>>>>>>> 344ac10 (update)
  } catch (e) {
    grid.innerHTML = `
      <div class="recipe-loading">
        <p>Could not connect to the recipe server. Make sure your Python app is running!</p>
      </div>`;
    console.error("Connection Error:", e);
  }
}

function renderRecipes(recipes) {
  const grid = document.getElementById('recipesGrid');
  grid.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipeModal(${i})" style="animation: fadeUp 0.4s ease ${i * 0.05}s both">
      <div class="recipe-emoji">${r.emoji}</div>
      <div class="recipe-title">${r.title}</div>
      <div class="recipe-meta">
        <span>⏱ ${r.time}</span>
        <span>👥 ${r.servings}</span>
        <span>⭐ ${r.difficulty}</span>
      </div>
      <div class="recipe-desc">${r.desc}</div>
    </div>
  `).join('');
  window.__recipes = recipes;
}

function openRecipeModal(idx) {
  const r = window.__recipes[idx];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-emoji">${r.emoji}</div>
      <h2 class="modal-title">${r.title}</h2>
      <p class="modal-desc">${r.desc}</p>
      <div class="modal-meta" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px;">
        <span style="font-size:13px;color:#9c9b94">⏱ ${r.time}</span>
        <span style="font-size:13px;color:#9c9b94">👥 ${r.servings} servings</span>
        <span style="font-size:13px;color:#9c9b94">⭐ ${r.difficulty}</span>
      </div>
      <p class="modal-section-title">Ingredients</p>
      <ul class="modal-ingredients">
        ${r.ingredients.map(i => `<li>${i}</li>`).join('')}
      </ul>
      <p class="modal-section-title">Steps</p>
      <ol class="modal-steps">
        ${r.steps.map(s => `<li>${s}</li>`).join('')}
      </ol>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  window.__modal = overlay;
}

function closeModal() {
  if (window.__modal) { window.__modal.remove(); window.__modal = null; }
}

// ── Screen Navigation ───────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function goBack(target) {
  showScreen(target);
  if (target === 'screenSearch') {
    // Re-init map size after show
    setTimeout(() => map && map.invalidateSize(), 100);
  }
}

// ── Panel Navigation ────────────────────────────────
function showPanel(name) {
  document.getElementById('panelAbout').classList.remove('open');
  document.getElementById('panelResources').classList.remove('open');
  document.getElementById(`panel${name.charAt(0).toUpperCase() + name.slice(1)}`).classList.add('open');
}

function hidePanel(name) {
  document.getElementById(`panel${name.charAt(0).toUpperCase() + name.slice(1)}`).classList.remove('open');
}

// ── Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screenSearch');
  initMap();
});
