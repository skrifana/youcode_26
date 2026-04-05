// Application state
const state = {
    currentPage: 0,
    servings: '',
    ingredients: [],
    appliances: [],
    dietary: [],
    cuisine: ''
};

// Data
const ingredientsList = [
    'Chicken', 'Beef', 'Pork', 'Fish', 'Eggs', 'Milk', 'Cheese', 'Tomatoes',
    'Onions', 'Garlic', 'Potatoes', 'Rice', 'Pasta', 'Bread', 'Lettuce',
    'Carrots', 'Bell Peppers', 'Mushrooms', 'Broccoli', 'Spinach'
];

const appliancesList = [
    { id: 'kettle', label: 'Kettle', icon: '🫖' },
    { id: 'microwave', label: 'Microwave', icon: '📟' },
    { id: 'stove', label: 'Stove', icon: '🔥' },
    { id: 'oven', label: 'Oven', icon: '🔲' }
];

const dietaryOptions = [
    { id: 'none', label: 'None' },
    { id: 'gluten-free', label: 'Gluten-Free' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'halal', label: 'Halal' }
];

const cuisineOptions = [
    { id: 'middle-east', label: 'Middle East' },
    { id: 'east-asian', label: 'East Asian' },
    { id: 'south-asian', label: 'South Asian' },
    { id: 'indigenous', label: 'Indigenous' },
    { id: 'latin-american', label: 'Latin American' },
    { id: 'mediterranean', label: 'Mediterranean' },
    { id: 'not-specified', label: 'Not Specified' }
];

const pages = ['servings', 'ingredients', 'kitchen', 'dietary', 'cuisine'];
const pageLabels = ['Servings', 'Ingredients', 'Kitchen', 'Dietary', 'Cuisine'];

// Initialize app
function init() {
    setupServingsPage();
    setupIngredientsPage();
    setupKitchenPage();
    setupDietaryPage();
    setupCuisinePage();
    updateProgressBar();
}

// Update progress bar
function updateProgressBar() {
    const progress = ((state.currentPage + 1) / 5) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-text').textContent = `Step ${state.currentPage + 1} of 5`;
    document.getElementById('progress-label').textContent = pageLabels[state.currentPage];
    
    document.querySelectorAll('.step-label').forEach((label, index) => {
        label.classList.toggle('active', index === state.currentPage);
    });
}

// Navigate between pages
function navigateToPage(pageIndex) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(`page-${pages[pageIndex]}`).classList.add('active');
    state.currentPage = pageIndex;
    updateProgressBar();
}

// Servings Page
function setupServingsPage() {
    const input = document.getElementById('servings-input');
    const nextBtn = document.getElementById('servings-next');
    
    input.addEventListener('input', (e) => {
        state.servings = e.target.value;
        nextBtn.disabled = !state.servings || parseInt(state.servings) <= 0;
    });
    
    nextBtn.addEventListener('click', () => {
        navigateToPage(1);
    });
}

// Ingredients Page
function setupIngredientsPage() {
    const grid = document.getElementById('ingredients-grid');
    const count = document.getElementById('ingredients-count');
    
    ingredientsList.forEach(ingredient => {
        const btn = document.createElement('button');
        btn.className = 'selection-btn';
        btn.textContent = ingredient;
        btn.addEventListener('click', () => {
            const index = state.ingredients.indexOf(ingredient);
            if (index > -1) {
                state.ingredients.splice(index, 1);
                btn.classList.remove('selected');
            } else {
                state.ingredients.push(ingredient);
                btn.classList.add('selected');
            }
            updateIngredientsCount();
        });
        grid.appendChild(btn);
    });
    
    function updateIngredientsCount() {
        const num = state.ingredients.length;
        count.textContent = `${num} ingredient${num !== 1 ? 's' : ''} selected`;
    }
    
    document.getElementById('ingredients-back').addEventListener('click', () => {
        navigateToPage(0);
    });
    
    document.getElementById('ingredients-next').addEventListener('click', () => {
        navigateToPage(2);
    });
}

// Kitchen Page
function setupKitchenPage() {
    const grid = document.getElementById('kitchen-grid');
    const count = document.getElementById('kitchen-count');
    
    appliancesList.forEach(appliance => {
        const btn = document.createElement('button');
        btn.className = 'appliance-btn';
        btn.innerHTML = `
            <div class="appliance-icon">${appliance.icon}</div>
            <div>${appliance.label}</div>
        `;
        btn.addEventListener('click', () => {
            const index = state.appliances.indexOf(appliance.id);
            if (index > -1) {
                state.appliances.splice(index, 1);
                btn.classList.remove('selected');
            } else {
                state.appliances.push(appliance.id);
                btn.classList.add('selected');
            }
            updateKitchenCount();
        });
        grid.appendChild(btn);
    });
    
    function updateKitchenCount() {
        const num = state.appliances.length;
        count.textContent = `${num} appliance${num !== 1 ? 's' : ''} selected`;
    }
    
    document.getElementById('kitchen-back').addEventListener('click', () => {
        navigateToPage(1);
    });
    
    document.getElementById('kitchen-next').addEventListener('click', () => {
        navigateToPage(3);
    });
}

// Dietary Page
function setupDietaryPage() {
    const list = document.getElementById('dietary-list');
    const count = document.getElementById('dietary-count');
    
    dietaryOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'selection-btn';
        btn.textContent = option.label;
        btn.addEventListener('click', () => {
            const index = state.dietary.indexOf(option.id);
            if (index > -1) {
                state.dietary.splice(index, 1);
                btn.classList.remove('selected');
            } else {
                state.dietary.push(option.id);
                btn.classList.add('selected');
            }
            updateDietaryCount();
        });
        list.appendChild(btn);
    });
    
    function updateDietaryCount() {
        const num = state.dietary.length;
        count.textContent = `${num} restriction${num !== 1 ? 's' : ''} selected`;
    }
    
    document.getElementById('dietary-back').addEventListener('click', () => {
        navigateToPage(2);
    });
    
    document.getElementById('dietary-next').addEventListener('click', () => {
        navigateToPage(4);
    });
}

// Cuisine Page
function setupCuisinePage() {
    const list = document.getElementById('cuisine-list');
    const submitBtn = document.getElementById('cuisine-submit');
    
    cuisineOptions.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'selection-btn';
        btn.textContent = option.label;
        btn.addEventListener('click', () => {
            document.querySelectorAll('#cuisine-list .selection-btn').forEach(b => {
                b.classList.remove('selected');
            });
            btn.classList.add('selected');
            state.cuisine = option.id;
            submitBtn.disabled = false;
        });
        list.appendChild(btn);
    });
    
    document.getElementById('cuisine-back').addEventListener('click', () => {
        navigateToPage(3);
    });
    
    submitBtn.addEventListener('click', () => {
        alert('Form submitted! All preferences have been saved.\n\n' + 
              'Your selections:\n' +
              `Servings: ${state.servings}\n` +
              `Ingredients: ${state.ingredients.length} selected\n` +
              `Appliances: ${state.appliances.length} selected\n` +
              `Dietary: ${state.dietary.length} selected\n` +
              `Cuisine: ${state.cuisine}`);
    });
}

// Start the app
init();