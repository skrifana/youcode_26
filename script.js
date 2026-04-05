//
// const API = "http://localhost:8000";
// let map = null;
// let marker = null;
//
//
// // Try to center on user's location, fall back to world view
//
// async function initMap() {
//     map = L.map('map').setView([49.2827, -123.1207], 11);
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//         maxZoom: 19,
//         attribution: '© OpenStreetMap'
//     }).addTo(map);
//     // Try to get user's location on load
//     if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//             pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
//             () => {
//             } // silently fall back to world view if denied
//         );
//     }
//     const shelters = await fetch(`${API}/shelters/`).then(r => r.json());
//     shelters.forEach(shelter => {
//         L.marker([shelter.lat, shelter.lon])
//             .addTo(map)
//             .bindPopup(`<b>${shelter.name}</b><br>${shelter.organization ?? ""}`)
//             .on("click", () => selectShelter(shelter));
//     });
//     const select = document.getElementById("shelter-select");
//     shelters.forEach(s => {
//         const opt = document.createElement("option");
//         opt.value = s.id;
//         opt.textContent = s.name;
//         select.appendChild(opt);
//     });
//
// }
//
// async function searchLocation() {
//     initMap();
//     const query = document.getElementById('searchInput').value.trim();
//     if (!query) return;
//
//     const res = await fetch(
//         `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
//     );
//
//
//     const data = await res.json();
//
//     if (!data.length) {
//         alert('Location not found.');
//         return;
//     }
//
//     const {lat, lon, display_name} = data[0];
//     const latlng = [parseFloat(lat), parseFloat(lon)];
//
//     map.setView(latlng, 12);
//
//     if (marker) marker.remove();
//     marker = L.marker(latlng).addTo(map).bindPopup(display_name).openPopup();
// }
//
// document.getElementById('searchInput').addEventListener('keydown', e => {
//     if (e.key === 'Enter') searchLocation();
// });
//
//
// async function selectShelter(shelter) {
//   const profile = await fetch(`${API}/shelters/${shelter.id}/profile`).then(r => r.json());
//   // ShelterProfile: { shelter_id, dietary_restrictions, cultural_backgrounds, resident_count }
//
//   // Pre-tick dietary restriction checkboxes
//   document.querySelectorAll("input[name='dietary']").forEach(cb => {
//     cb.checked = profile.dietary_restrictions.includes(cb.value);
//   });
//
//   // Suggest cuisine based on cultural backgrounds
//   suggestCuisine(profile.cultural_backgrounds);
//
//   // Store profile for later use in recipe request
//   window.currentProfile = profile;
//   window.currentShelterId = shelter.id;
// }
//
//
// async function requestRecipe() {
//   const pantryItems = getPantryIngredients(); // your pantry sidebar logic
//
//   const body = {
//     shelter_id: window.currentShelterId,
//     ingredients: pantryItems,                  // list[str], min 1
//     cuisine: document.getElementById("cuisine").value || null,
//     servings: parseInt(document.getElementById("servings").value) || 4,
//     kitchen_access: document.getElementById("kitchen-access").value,
//     // e.g. "Full Access. You have an oven, stove and all pantry access!"
//     dietary_overrides: getCheckedValues("dietary-override"),
//     mode: document.getElementById("mode").value
//     // "Interactive Mode" or "Non-Interactive Mode"
//   };
//
//   const res = await fetch(`${API}/recipes/recommend`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body)
//   });
//
//   const data = await res.json(); // RecipeResponse
//   renderRecipeResponse(data);
// }
//
// function renderRecipeResponse(response) {
//   // RecipeResponse: { recipes, kitchen_level, mode, shelter_context, note }
//   const recipe = response.recipes[0]; // or let user pick if multiple
//
//   if (response.mode === "Interactive Mode") {
//     renderAssemblyLab(recipe.assembly_steps);
//     // AssemblyStep: { step, action, ingredient, tip }
//   } else {
//     renderStaticRecipe(recipe);
//     // highlights recipe.macros: [{ nutrient, amount, benefit }]
//   }
//
//   if (response.note) {
//     document.getElementById("recipe-note").textContent = response.note;
//   }
// }
//
//
//
// function renderAssemblyLab(steps) {
//     const container = document.getElementById("recipe-output");
//     container.innerHTML = steps.map(s => `
//         <div class="step">
//             <strong>Step ${s.step}:</strong> ${s.action} — <em>${s.ingredient}</em>
//             ${s.tip ? `<span class="tip">${s.tip}</span>` : ""}
//         </div>
//     `).join("");
// }
//
// function renderStaticRecipe(recipe) {
//     const container = document.getElementById("recipe-output");
//     container.innerHTML = `
//         <h2>${recipe.title}</h2>
//         <p>${recipe.prep_time} prep · ${recipe.cook_time} cook · serves ${recipe.servings}</p>
//         <ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join("")}</ul>
//         <ol>${recipe.instructions.map(i => `<li>${i}</li>`).join("")}</ol>
//         <div class="macros">
//             ${recipe.macros.map(m => `
//                 <span class="macro-pill">${m.nutrient} · ${m.amount} · ${m.benefit}</span>
//             `).join("")}
//         </div>
//     `;
// }
// function getPantryIngredients() {
//     // grab all ingredient inputs from your pantry sidebar
//     return Array.from(document.querySelectorAll(".pantry-item"))
//         .map(el => el.value)
//         .filter(v => v.trim() !== "");
// }
//
// function getCheckedValues(name) {
//     return Array.from(document.querySelectorAll(`input[name='${name}']:checked`))
//         .map(cb => cb.value);
// }
//
// function suggestCuisine(culturalBackgrounds) {
//     // optional: pre-select a cuisine based on cultural_backgrounds list
//     console.log("Cultural backgrounds:", culturalBackgrounds);
// }




const API = "http://localhost:8000";

// ── globals ──────────────────────────────────────────────────────────────────
let map = null;
let searchMarker = null;
window.currentShelterId = null;
window.currentProfile = null;

// ── screen routing ────────────────────────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function showInfo()      { showScreen("screenAbout"); }
function hideInfo()      { showScreen("screenMap"); }
function showResources() { showScreen("screenResources"); }
function hideResources() { showScreen("screenMap"); }

// ── map init (called once on page load) ───────────────────────────────────────
async function initMap() {
    map = L.map("map").setView([49.2827, -123.1207], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);

    // Try to centre on user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
            () => {} // silently ignore if denied
        );
    }

    // Load shelters from backend
    try {
        const shelters = await fetch(`${API}/shelters/`).then(r => r.json());

        shelters.forEach(shelter => {
            L.marker([shelter.lat, shelter.lon])
                .addTo(map)
                .bindPopup(`<b>${shelter.name}</b><br>${shelter.organization ?? ""}`)
                .on("click", () => pickShelter(shelter));
        });

        const select = document.getElementById("shelter-select");
        shelters.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Could not load shelters:", err);
    }
}

// ── location search bar ───────────────────────────────────────────────────────
async function searchLocation() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    );
    const data = await res.json();

    if (!data.length) { alert("Location not found."); return; }

    const { lat, lon, display_name } = data[0];
    const latlng = [parseFloat(lat), parseFloat(lon)];
    map.setView(latlng, 12);

    if (searchMarker) searchMarker.remove();
    searchMarker = L.marker(latlng).addTo(map).bindPopup(display_name).openPopup();
}

document.getElementById("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") searchLocation();
});

// ── shelter selection (from dropdown) ────────────────────────────────────────
function goToShelterFromDropdown() {
    const id = document.getElementById("shelter-select").value;
    if (!id) return;
    // Build a minimal shelter object — profile fetch inside pickShelter will fill the rest
    pickShelter({ id });
}

// ── shelter selection (from marker click OR dropdown) ────────────────────────
async function pickShelter(shelter) {
    window.currentShelterId = shelter.id;

    try {
        const profile = await fetch(`${API}/shelters/${shelter.id}/profile`).then(r => r.json());
        // profile: { shelter_id, dietary_restrictions, cultural_backgrounds, resident_count }
        window.currentProfile = profile;

        // Update heading
        if (shelter.name) {
            document.getElementById("shelter-name-heading").textContent = shelter.name;
        }
        document.getElementById("resident-count-text").textContent =
            `${profile.resident_count} residents · dietary info pre-loaded`;

        // Pre-tick dietary checkboxes from shelter profile
        document.querySelectorAll("input[name='dietary-override']").forEach(cb => {
            cb.checked = profile.dietary_restrictions
                .map(r => r.toLowerCase())
                .includes(cb.value.toLowerCase());
        });

        // Suggest cuisine from cultural backgrounds
        suggestCuisine(profile.cultural_backgrounds);

    } catch (err) {
        console.warn("Could not load shelter profile:", err);
    }

    showScreen("screenUser");
}

// ── cuisine suggestion ────────────────────────────────────────────────────────
function suggestCuisine(culturalBackgrounds) {
    const map = {
        "middle east": "MiddleEast",
        "south asia":  "SouthAsian",
        "east asia":   "EastAsian",
        "mexico":      "Mexican",
        "latin":       "Mexican",
    };
    const bg = (culturalBackgrounds || []).join(" ").toLowerCase();
    for (const [key, val] of Object.entries(map)) {
        if (bg.includes(key)) {
            document.getElementById("cuisine").value = val;
            return;
        }
    }
}

// ── pantry sidebar ────────────────────────────────────────────────────────────
function addPantryItem() {
    const input = document.getElementById("pantry-input");
    const val = input.value.trim();
    if (!val) return;

    const list = document.getElementById("pantry-list");
    const tag = document.createElement("div");
    tag.className = "pantry-tag";
    tag.innerHTML = `<span>${val}</span><button onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(tag);
    input.value = "";
    input.focus();
}

document.getElementById("pantry-input").addEventListener("keydown", e => {
    if (e.key === "Enter") addPantryItem();
});

function getPantryIngredients() {
    return Array.from(document.querySelectorAll(".pantry-tag span"))
        .map(el => el.textContent.trim())
        .filter(Boolean);
}

// ── helpers ───────────────────────────────────────────────────────────────────
function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name='${name}']:checked`))
        .map(cb => cb.value);
}

// ── recipe request ────────────────────────────────────────────────────────────
async function requestRecipe() {
    const pantryItems = getPantryIngredients();

    if (!window.currentShelterId) {
        alert("Please select a shelter first.");
        return;
    }
    if (pantryItems.length === 0) {
        alert("Please add at least one pantry ingredient.");
        return;
    }

    const body = {
        shelter_id:        window.currentShelterId,
        ingredients:       pantryItems,
        cuisine:           document.getElementById("cuisine").value || null,
        servings:          parseInt(document.getElementById("servings").value) || 4,
        kitchen_access:    document.getElementById("kitchen-access").value,
        dietary_overrides: getCheckedValues("dietary-override"),
        mode:              document.getElementById("mode").value   // "interactive" | "static"
    };

    const btn = document.querySelector("#screenForm .btn-primary.full-width");
    btn.textContent = "Generating…";
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/recipes/recommend`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();
        renderRecipeResponse(data);
        showScreen("screenRecipe");

    } catch (err) {
        alert(`Recipe generation failed: ${err.message}`);
        console.error(err);
    } finally {
        btn.textContent = "Generate Recipe";
        btn.disabled = false;
    }
}

// ── rendering ─────────────────────────────────────────────────────────────────
function renderRecipeResponse(response) {
    // RecipeResponse: { recipes, kitchen_level, mode, shelter_context, note }
    const recipe = response.recipes[0];

    if (response.mode === "interactive") {
        renderAssemblyLab(recipe);
    } else {
        renderStaticRecipe(recipe);
    }

    const noteEl = document.getElementById("recipe-note");
    noteEl.textContent = response.note ?? "";
}

function renderStaticRecipe(recipe) {
    const container = document.getElementById("recipe-output");
    container.innerHTML = `
        <h2>${recipe.title}</h2>
        <p class="recipe-meta">${recipe.prep_time} prep · ${recipe.cook_time} cook · serves ${recipe.servings}</p>

        <div class="macros-row">
            ${recipe.macros.map(m => `
                <div class="macro-pill">
                    <span class="macro-nutrient">${m.nutrient}</span>
                    <span class="macro-amount">${m.amount}</span>
                    <span class="macro-benefit">${m.benefit}</span>
                </div>
            `).join("")}
        </div>

        <h3>Ingredients</h3>
        <ul class="ingredient-list">
            ${recipe.ingredients.map(i => `<li>${i}</li>`).join("")}
        </ul>

        <h3>Instructions</h3>
        <ol class="instruction-list">
            ${recipe.instructions.map(i => `<li>${i}</li>`).join("")}
        </ol>

        ${Object.keys(recipe.substitutions ?? {}).length ? `
            <h3>Substitutions</h3>
            <ul class="sub-list">
                ${Object.entries(recipe.substitutions).map(([k, vs]) =>
                    `<li><strong>${k}</strong>: ${vs.join(", ")}</li>`
                ).join("")}
            </ul>
        ` : ""}
    `;
}

function renderAssemblyLab(recipe) {
    const container = document.getElementById("recipe-output");

    let currentStep = 0;
    const steps = recipe.assembly_steps; // list[AssemblyStep]

    function renderStep(i) {
        const s = steps[i];
        container.innerHTML = `
            <h2>${recipe.title} — Assembly Lab</h2>
            <p class="recipe-meta">Step ${s.step} of ${steps.length}</p>

            <div class="assembly-card">
                <div class="assembly-action">${s.action}</div>
                <div class="assembly-ingredient">${s.ingredient}</div>
                ${s.tip ? `<div class="assembly-tip">💡 ${s.tip}</div>` : ""}
            </div>

            <div class="assembly-nav">
                <button onclick="stepAssembly(${i - 1})" ${i === 0 ? "disabled" : ""}>← Previous</button>
                <span>${i + 1} / ${steps.length}</span>
                ${i < steps.length - 1
                    ? `<button onclick="stepAssembly(${i + 1})">Next →</button>`
                    : `<button onclick="showScreen('screenMap')">Done ✓</button>`
                }
            </div>
        `;
    }

    window.stepAssembly = renderStep;
    renderStep(0);
}

// ── boot ──────────────────────────────────────────────────────────────────────
initMap();