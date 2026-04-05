// ============================================================
// RECIPE CONFIGURATION — edit this to change the game
// ============================================================
const RECIPE = {
  name: "Tomato Omelette",
  ingredients: ["egg", "tomato", "oil", "salt"],

  // Areas to completely hide: "oven-area", "kettle-area", "microwave-area",
  // "board-area", "stovetop-area"
  hiddenAreas: ["oven-area", "kettle-area", "microwave-area"],

  steps: [
    {
      instruction: "Pour oil onto the pan",
      clickFirst:  { type: "pantry",  id: "oil" },
      clickSecond: { type: "kitchen", id: "stovetop-pan" },
    },
    {
      instruction: "Chop the tomato on the cutting board",
      clickFirst:  { type: "pantry",  id: "tomato" },
      clickSecond: { type: "kitchen", id: "cutting-board" },
    },
    {
      instruction: "Crack the eggs onto the pan",
      clickFirst:  { type: "pantry",  id: "egg" },
      clickSecond: { type: "kitchen", id: "stovetop-pan" },
    },
    {
      instruction: "Add the chopped tomato to the pan",
      clickFirst:  { type: "kitchen", id: "cutting-board" },
      clickSecond: { type: "kitchen", id: "stovetop-pan" },
    },
    {
      instruction: "Season with salt",
      clickFirst:  { type: "pantry",  id: "salt" },
      clickSecond: { type: "kitchen", id: "stovetop-pan" },
    },
  ],
};

// ============================================================
// IDs of all clickable kitchen elements
// ============================================================
const KITCHEN_IDS = [
  "cutting-board",
  "stovetop-pan",
  "stovetop-pot",
  "kettle",
  "microwave",
  "oven",
];

// ============================================================
// GAME STATE
// ============================================================
let stepIndex = 0;
let phase = "first"; // "first" | "second"
let gameOver = false;

// ============================================================
// INIT
// ============================================================
function initGame() {
  stepIndex = 0;
  phase = "first";
  gameOver = false;

  // Hide specified areas
  RECIPE.hiddenAreas.forEach((areaId) => {
    const el = document.getElementById(areaId);
    if (el) el.style.display = "none";
  });

  // Build pantry
  const pantry = document.getElementById("pantry");
  pantry.innerHTML = "";
  RECIPE.ingredients.forEach((id) => {
    const item = document.createElement("div");
    item.className = "veggie-item";
    item.id = "pantry-" + id;
    item.innerHTML = `
      <div class="veggie-sprite">${id}</div>
      <span class="veggie-label">${id}</span>
    `;
    item.addEventListener("click", () => handleClick({ type: "pantry", id }));
    pantry.appendChild(item);
  });

  // Attach kitchen element listeners
  KITCHEN_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      // Remove old listeners by cloning
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      clone.addEventListener("click", () => handleClick({ type: "kitchen", id }));
    }
  });

  loadStep();
}

// ============================================================
// STEP LOGIC
// ============================================================
function loadStep() {
  const step = RECIPE.steps[stepIndex];
  const expected = phase === "first" ? step.clickFirst : step.clickSecond;

  setStatus(
    phase === "first"
      ? step.instruction
      : `Now click the ${expected.id.replace("-", " ")}`
  );

  updateHighlights(expected);
}

function handleClick(source) {
  if (gameOver) return;

  const step = RECIPE.steps[stepIndex];
  const expected = phase === "first" ? step.clickFirst : step.clickSecond;

  // Ignore clicks on the wrong element
  if (source.type !== expected.type || source.id !== expected.id) return;

  if (phase === "first") {
    phase = "second";
    loadStep();
  } else {
    stepIndex++;
    if (stepIndex >= RECIPE.steps.length) {
      endGame();
    } else {
      phase = "first";
      loadStep();
    }
  }
}

function endGame() {
  gameOver = true;
  clearHighlights();
  lockAll();
  setStatus(`Your ${RECIPE.name} is complete! 🎉`);
  document.getElementById("status").querySelector(".s-icon").textContent = "🎉";
}

// ============================================================
// HIGHLIGHT & LOCK
// ============================================================
function updateHighlights(expected) {
  clearHighlights();
  lockAll();

  // Highlight the expected element
  if (expected.type === "pantry") {
    const el = document.getElementById("pantry-" + expected.id);
    if (el) {
      el.classList.add("active-item");
      el.classList.remove("locked-item");
      addArrow(el);
    }
  } else {
    const el = document.getElementById(expected.id);
    if (el) {
      el.classList.add("active-kitchen");
      el.classList.remove("locked-kitchen");
      addArrow(el);
    }
  }
}

function addArrow(el) {
  const arrow = document.createElement("span");
  arrow.className = "arrow-indicator";
  arrow.textContent = "▼";
  el.style.position = "relative";
  el.appendChild(arrow);
}

function clearHighlights() {
  document.querySelectorAll(".active-item").forEach((el) => {
    el.classList.remove("active-item");
  });
  document.querySelectorAll(".active-kitchen").forEach((el) => {
    el.classList.remove("active-kitchen");
  });
  document.querySelectorAll(".arrow-indicator").forEach((el) => el.remove());
}

function lockAll() {
  document.querySelectorAll(".veggie-item").forEach((el) => {
    el.classList.add("locked-item");
  });
  KITCHEN_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("locked-kitchen");
  });
}

// ============================================================
// UTILITIES
// ============================================================
function setStatus(text) {
  const el = document.getElementById("status-text");
  if (el) el.textContent = text;
}

function resetAll() {
  // Restore any hidden areas before re-init
  ["oven-area", "kettle-area", "microwave-area", "board-area", "stovetop-area"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    }
  );
  initGame();
}

// ============================================================
// START
// ============================================================
window.addEventListener("DOMContentLoaded", initGame);