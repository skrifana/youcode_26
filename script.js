const SHEET_ID   = '1O7hXb0CzdfW42LQ1cDahednnjr9JxEAqTAww8WcovBg';
const SHEET_GID  = '0';
const CSV_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
 
// Translation: MyMemory free API (no key needed, 5 000 words/day)
const LANG_NAMES = { en: 'English', fr: 'French', es: 'Spanish', zh: 'Chinese' };
const MYMEMORY   = 'https://api.mymemory.translated.net/get';
 
// ── 2. STATE ─────────────────────────────────────────────────
let shelters       = [];   // [{name, address, lat, lng, ...}]
let markers        = [];   // Leaflet marker objects
let currentLang    = 'en';
let translationCache = {}; // { "lang:text": "translated" }
let map, markerLayer;

document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await loadShelters();
    attachSearch();
    attachLangSwitch();
    renderMapMarkers();
  });
function initMap() {
  map = L.map('map', { zoomControl: true }).setView([49.25, -123.12], 11); // Vancouver default
 
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
 
  markerLayer = L.layerGroup().addTo(map);
 
  // Try to get user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
      () => {}
    );
  }
 
  // Update viewport suggestions whenever map moves
  map.on('moveend zoomend', updateViewportSuggestions);
}
 
// ── 5. LOAD SHELTER DATA ─────────────────────────────────────
async function loadShelters() {
  // Try fetching from Google Sheets (needs public sharing enabled)
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error('Sheet not public yet');
    const csv = await res.text();
    shelters = parseCSV(csv);
    console.log(`✅ Loaded ${shelters.length} shelters from Google Sheets`);
  } catch (err) {
    console.warn('⚠️ Could not fetch sheet, using placeholder data:', err.message);
    shelters = PLACEHOLDER_SHELTERS;
  }
 
  // Geocode any shelters missing lat/lng
  await geocodeMissing();
}
 
function parseCSV(csv) {
  const lines  = csv.trim().split('\n');
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const obj  = {};
    header.forEach((h, i) => {
      obj[h] = (cols[i] || '').replace(/"/g, '').trim();
    });
    // Normalise common column name variants
    obj.name    = obj.name    || obj['shelter name'] || obj['organization'] || obj['facility'] || '';
    obj.address = obj.address || obj['location']     || obj['street']       || '';
    obj.lat     = parseFloat(obj.lat || obj.latitude  || '') || null;
    obj.lng     = parseFloat(obj.lng || obj.longitude || '') || null;
    return obj;
  }).filter(s => s.name);
}
 
async function geocodeMissing() {
  const toGeocode = shelters.filter(s => !s.lat || !s.lng);
  // Batch geocode (rate-limit: 1 req per 300 ms to respect Nominatim policy)
  for (const shelter of toGeocode) {
    if (!shelter.address && !shelter.name) continue;
    try {
      const q   = encodeURIComponent(`${shelter.name} ${shelter.address}`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
      const data = await res.json();
      if (data.length) {
        shelter.lat = parseFloat(data[0].lat);
        shelter.lng = parseFloat(data[0].lon);
      }
    } catch (_) {}
    await sleep(300);
  }
}
 
// ── 6. MAP MARKERS ───────────────────────────────────────────
const ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;background:#f5c400;border:2.5px solid #000;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:2px 2px 6px rgba(0,0,0,0.35)">
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30]
});
 
function renderMapMarkers() {
  markerLayer.clearLayers();
  markers = [];
  shelters.filter(s => s.lat && s.lng).forEach(s => {
    const m = L.marker([s.lat, s.lng], { icon: ICON })
      .bindPopup(buildPopup(s))
      .addTo(markerLayer);
    m.shelter = s;
    markers.push(m);
  });
}
 
function buildPopup(s) {
  const rows = Object.entries(s)
    .filter(([k]) => !['lat','lng','latitude','longitude'].includes(k) && s[k])
    .map(([k, v]) => `<tr><td style="font-weight:600;padding-right:8px;text-transform:capitalize">${k}</td><td>${v}</td></tr>`)
    .join('');
  return `<div style="font-family:'DM Sans',sans-serif;max-width:220px">
    <div style="font-weight:700;font-size:14px;margin-bottom:6px">${s.name}</div>
    <table style="font-size:12px;line-height:1.5">${rows}</table>
  </div>`;
}
 
// ── 7. SEARCH & AUTOCOMPLETE ─────────────────────────────────
function attachSearch() {
  const input  = document.getElementById('input');
  const button = document.getElementById('button');
  const sugBox = document.getElementById('suggestions');
 
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { hideSuggestions(); return; }
 
    const matches = shelters
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 8);
 
    showSuggestions(matches, input, sugBox);
  });
 
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { performSearch(input.value.trim()); hideSuggestions(); }
    if (e.key === 'Escape') hideSuggestions();
  });
 
  button.addEventListener('click', () => {
    performSearch(input.value.trim()); hideSuggestions();
  });
 
  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) hideSuggestions();
  });
}
 
function showSuggestions(matches, input, sugBox) {
  if (!matches.length) { hideSuggestions(); return; }
  sugBox.innerHTML = matches.map(s => `
    <div class="suggestion-item" data-name="${escHtml(s.name)}">
      <span class="sug-name">${escHtml(s.name)}</span>
      ${s.address ? `<span class="sug-addr">${escHtml(s.address)}</span>` : ''}
    </div>`).join('');
 
  sugBox.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      input.value = el.dataset.name;
      performSearch(el.dataset.name);
      hideSuggestions();
    });
  });
 
  sugBox.classList.add('show');
}
 
function hideSuggestions() {
  document.getElementById('suggestions').classList.remove('show');
}
 
async function performSearch(query) {
  if (!query) return;
 
  // 1. Try exact shelter match first
  const exact = shelters.find(s => s.name.toLowerCase() === query.toLowerCase());
  if (exact && exact.lat && exact.lng) {
    flyToShelter(exact);
    return;
  }
 
  // 2. Try partial shelter match
  const partial = shelters.find(s => s.name.toLowerCase().includes(query.toLowerCase()));
  if (partial && partial.lat && partial.lng) {
    flyToShelter(partial);
    return;
  }
 
  // 3. Fall back to Nominatim for free-form address / area search
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
    const data = await res.json();
    if (data.length) {
      const { lat, lon } = data[0];
      map.flyTo([parseFloat(lat), parseFloat(lon)], 13, { duration: 1.2 });
    } else {
      alert('No shelter or location found.');
    }
  } catch (_) {
    alert('Search failed. Please try again.');
  }
}
 
function flyToShelter(shelter) {
  map.flyTo([shelter.lat, shelter.lng], 15, { duration: 1.2 });
  // Find and open the matching marker's popup
  const m = markers.find(mk => mk.shelter === shelter);
  if (m) setTimeout(() => m.openPopup(), 1300);
}
 
// ── 8. VIEWPORT SUGGESTIONS ──────────────────────────────────
function updateViewportSuggestions() {
  const bounds = map.getBounds();
  const visible = shelters.filter(s => s.lat && s.lng && bounds.contains([s.lat, s.lng]));
 
  let panel = document.getElementById('viewportPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'viewportPanel';
    panel.className = 'viewport-panel';
    document.getElementById('map').after(panel);
  }
 
  if (!visible.length) { panel.innerHTML = ''; panel.style.display = 'none'; return; }
 
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="vp-title" data-translate="shelters-in-view">Shelters in this area</div>
    ${visible.slice(0, 6).map(s => `
      <div class="vp-item" onclick="flyToShelter(shelters.find(x=>x.name==='${escJs(s.name)}'))">
        <span class="vp-name">${escHtml(s.name)}</span>
        ${s.address ? `<span class="vp-addr">${escHtml(s.address)}</span>` : ''}
      </div>`).join('')}
    ${visible.length > 6 ? `<div class="vp-more">+${visible.length - 6} more</div>` : ''}`;
}
 
// ── 9. TRANSLATION ───────────────────────────────────────────
function attachLangSwitch() {
  document.getElementById('langSelect').addEventListener('change', async e => {
    currentLang = e.target.value;
    await translatePage(currentLang);
  });
}
 
// Gather all text nodes and elements we want to translate
function collectTranslatables() {
  // Elements with data-translate key (static strings)
  const keyed = [...document.querySelectorAll('[data-translate]')];
  // Plain text-only elements (no children elements)
  const dynamic = [...document.querySelectorAll(
    'button, label, h1, h2, h3, p, .title, .vp-title, .sug-name, .sug-addr, .vp-name, .vp-addr, .vp-more, .info-tab p, .resources-tab p'
  )].filter(el => el.children.length === 0 && el.textContent.trim());
 
  return [...new Set([...keyed, ...dynamic])];
}
 
async function translatePage(lang) {
  if (lang === 'en') { location.reload(); return; } // reset to source
 
  // Show translating badge
  let badge = document.querySelector('.translating-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'translating-badge';
    badge.textContent = 'TRANSLATING…';
    document.body.appendChild(badge);
  }
  badge.classList.add('visible');
 
  const els   = collectTranslatables();
  const texts  = els.map(el => el.getAttribute('data-original') || el.textContent.trim()).filter(Boolean);
 
  // Translate in batches of 10
  const translated = await batchTranslate(texts, lang);
 
  els.forEach((el, i) => {
    if (!el.getAttribute('data-original')) el.setAttribute('data-original', el.textContent.trim());
    if (translated[i]) el.textContent = translated[i];
  });
 
  badge.classList.remove('visible');
 
  // Also translate placeholder
  const input = document.getElementById('input');
  const phTranslated = await translateText(input.getAttribute('data-original-placeholder') || input.placeholder, lang);
  input.setAttribute('data-original-placeholder', input.getAttribute('data-original-placeholder') || input.placeholder);
  input.placeholder = phTranslated;
}
 
async function batchTranslate(texts, lang) {
  const results = [];
  for (const text of texts) {
    results.push(await translateText(text, lang));
    // Small delay to be polite to the free API
    await sleep(60);
  }
  return results;
}
 
async function translateText(text, lang) {
  if (!text || !text.trim() || lang === 'en') return text;
  const cacheKey = `${lang}:${text}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];
 
  const langMap = { fr: 'fr', es: 'es', zh: 'zh-CN' };
  const target  = langMap[lang] || lang;
 
  try {
    const url  = `${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=en|${target}`;
    const res  = await fetch(url);
    const data = await res.json();
    const result = data.responseData?.translatedText || text;
    translationCache[cacheKey] = result;
    return result;
  } catch (_) {
    return text; // fall back to English on failure
  }
}
 
// ── 10. NAV HELPERS (keep existing HTML onclick hooks) ────────
function showInfo() {
  document.getElementById('searchScreen').style.display = 'none';
  document.getElementById('infoTab').classList.add('show');
  if (currentLang !== 'en') translatePage(currentLang);
}
function hideInfo() {
  document.getElementById('infoTab').classList.remove('show');
  document.getElementById('searchScreen').style.display = '';
}
function showResources() {
  document.getElementById('searchScreen').style.display = 'none';
  document.getElementById('resTab').classList.add('show');
  if (currentLang !== 'en') translatePage(currentLang);
}
function hideResources() {
  document.getElementById('resTab').classList.remove('show');
  document.getElementById('searchScreen').style.display = '';
}




    // // Try to center on user's location, fall back to world view
    // const map = L.map('map').setView([20, 0], 2);

    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //   maxZoom: 19,
    //   attribution: '© OpenStreetMap'
    // }).addTo(map);

    // // Try to get user's location on load
    // if (navigator.geolocation) {
    //   navigator.geolocation.getCurrentPosition(
    //     pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
    //     () => {} // silently fall back to world view if denied
    //   );
    // }

    // let marker = null;

    // async function searchLocation() {
    //   const query = document.getElementById('searchInput').value.trim();
    //   if (!query) return;

    //   const res = await fetch(
    //     `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    //   );
    //   const data = await res.json();

    //   if (!data.length) {
    //     alert('Location not found.');
    //     return;
    //   }

    //   const { lat, lon, display_name } = data[0];
    //   const latlng = [parseFloat(lat), parseFloat(lon)];

    //   map.setView(latlng, 12);

    //   if (marker) marker.remove();
    //   marker = L.marker(latlng).addTo(map).bindPopup(display_name).openPopup();
    // }

    // document.getElementById('searchInput').addEventListener('keydown', e => {
    //   if (e.key === 'Enter') searchLocation();
    // });
  