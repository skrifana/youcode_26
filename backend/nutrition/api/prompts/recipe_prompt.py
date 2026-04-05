SYSTEM_PROMPT = """You are a nutrition assistant helping people at women's shelters in British Columbia, Canada plan meals.

Your recommendations must be:
- Practical given the available ingredients and kitchen constraints
- Nutritionally balanced, highlight macronutrients such as protein, fiber and important vitamins. Would also be nice to include the health benefits.
- Adhere to cuisine requirements and be culturally inclusive and respectful of the backgrounds listed
- Sensitive to all dietary restrictions listed
- If serving size is for multiple people, create recipes that are customizable for bulk portions
- Recipes must be easily customizable, be sure to provide substitutions for all key ingredients.

Respond ONLY with valid JSON matching the exact schema provided.
No preamble, no markdown fences, no extra keys."""

KITCHEN_CONTEXT = {
    "full": (
        "Full kitchen access: stove, oven, pots, pans, knives, all equipment available. "
        "Cooked meals, soups, stir-fries, baked dishes are all appropriate."
    ),
    "partial": (
        "Partial kitchen access: microwave, kettle, toaster, mini fridge only. Must not require stove or oven. "
        "Suggest microwave-friendly meals, wraps, overnight dishes, or kettle-based recipes only."
    ),
    "none": (
        "No kitchen access at all. Assembly-only dishes - no heat source available. "
        "Wraps, salads, fruit plates, crackers with spreads, no-cook grain bowls."
    ),
}


def build_static_prompt(
    ingredients: list[str],
    servings: int,
    kitchen_access: str,
    cuisine: str | None,
    dietary_restrictions: list[str]
) -> str:
    cuisine_line = f"Preferred cuisine style: {cuisine}" if cuisine else "No cuisine preference — be varied and inclusive."
    diet_line = ", ".join(dietary_restrictions) if dietary_restrictions else "None specified"

    return f"""Generate recipe.

Available ingredients: {", ".join(ingredients)}
Servings needed: {servings}
{cuisine_line}
Kitchen situation: {KITCHEN_CONTEXT[kitchen_access]}
Dietary restrictions (hard constraints): {diet_line}

Return JSON in EXACTLY this shape:
{{
  "recipes": [
    {{
      "title": "string",
      "servings": {servings},
      "prep_time": "string",
      "cook_time": "string",
      "ingredients": ["quantity + ingredient"],
      "instructions": ["step as string"],
      "macros": [
        {{"nutrient": "Protein", "amount": "12g per serving", "benefit": "Supports muscle repair"}},
        {{"nutrient": "Fibre", "amount": "6g per serving", "benefit": "Supports digestion"}},
        {{"nutrient": "Iron", "amount": "3mg per serving", "benefit": "Prevents fatigue"}}
      ],
      "substitutions": {{
        "ingredient_name": ["substitute1", "substitute2"]
      }},
      "assembly_steps": []
    }}
  ]
}}"""


def build_interactive_prompt(
    ingredients: list[str],
    servings: int,
    kitchen_access: str,
    cuisine: str | None,
    dietary_restrictions: list[str],
    cultural_backgrounds: list[str],
) -> str:
    cuisine_line = f"Preferred cuisine style: {cuisine}" if cuisine else "No cuisine preference."
    diet_line = ", ".join(dietary_restrictions) if dietary_restrictions else "None specified"

    return f"""Generate an interactive step-by-step recipe for a cooking game where the user clicks ingredients and kitchen tools.

Available ingredients: {", ".join(ingredients)}
Servings needed: {servings}
{cuisine_line}
Kitchen situation: {KITCHEN_CONTEXT[kitchen_access]}
Dietary restrictions (hard constraints): {diet_line}

CRITICAL RULE FOR assembly_steps — each "action" field MUST start with one of these exact verbs.
The game uses the verb to decide which kitchen tool lights up:

  chop / slice / dice / cut   -> cutting board
  pour / fry / saute / cook   -> stovetop pan
  boil / simmer               -> stovetop pot
  mix / stir / add / combine  -> bowl
  microwave / heat            -> microwave
  bake / roast                -> oven
  brew / steep                -> kettle

The "ingredient" field must be a SINGLE ingredient name (no quantities), matching what the user will click in the pantry.

Return JSON in EXACTLY this shape — do not deviate:
{{
  "recipes": [
    {{
      "title": "string",
      "servings": {servings},
      "prep_time": "string",
      "cook_time": "string",
      "ingredients": ["quantity + ingredient"],
      "instructions": ["step as string"],
      "macros": [
        {{"nutrient": "Protein", "amount": "12g per serving", "benefit": "Supports muscle repair"}},
        {{"nutrient": "Fibre", "amount": "6g per serving", "benefit": "Supports digestion"}},
        {{"nutrient": "Iron", "amount": "3mg per serving", "benefit": "Prevents fatigue"}}
      ],
      "substitutions": {{
        "ingredient_name": ["substitute1", "substitute2"]
      }},
      "assembly_steps": [
        {{"step": 1, "action": "pour oil into pan", "ingredient": "oil", "tip": "medium heat prevents burning"}},
        {{"step": 2, "action": "chop finely", "ingredient": "onion", "tip": "smaller pieces cook faster"}},
        {{"step": 3, "action": "fry until golden", "ingredient": "onion", "tip": "about 3-4 minutes"}},
        {{"step": 4, "action": "boil until tender", "ingredient": "lentils", "tip": "high in plant-based protein"}},
        {{"step": 5, "action": "stir in to combine", "ingredient": "spices", "tip": "toast briefly to release aroma"}},
        {{"step": 6, "action": "mix everything together", "ingredient": "lentils", "tip": "add salt to taste"}}
      ]
    }}
  ]
}}

The assembly_steps in your response must reflect the ACTUAL recipe you generate, using only the ingredients provided.
Every step's "action" MUST start with one of: chop, slice, dice, cut, pour, fry, saute, cook, boil, simmer, mix, stir, add, combine, microwave, heat, bake, roast, brew, steep."""