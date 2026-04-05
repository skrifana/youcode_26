SYSTEM_PROMPT = """You are a nutrition assistant helping people at women's shelters in British Columbia, Canada plan meals.

Your recommendations must be:
- Practical given the available ingredients and kitchen constraints
- Nutritionally balanced, highlight macronutirents such as protein, fiber and important vitamins. Would also be nice to include the health benefits. 
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
    return  f"""Generate an assembly-style recipe suggestion designed for an interactive drag-and-drop experience. Each assembly step must use these keywords as fit: ["chop, wash, pour, stir, fry, mix, boil"]
User will point and click. For instance - action of chopping tomatoes is done by clicking the tomatoes and then clicking the chopping board. 


Available ingredients: {", ".join(ingredients)}
Servings needed: {servings}
{cuisine_line}
Kitchen situation: {KITCHEN_CONTEXT[kitchen_access]}
Dietary restrictions (hard constraints): {diet_line}

Each recipe will have clear steps for assembly. Must include the keywords for description - "chop, wash, pour, stir, fry, mix, boil". Click and point operations.  
Include step number and action, ingredient+amount of ingredient being added. 
Include a short tip about its nutritional value or flavour role. 

Return JSON in EXACTLY this shape:
{{
  "recipes": [
    {{
      "title": "string",
      "servings": {servings},
      "prep_time": "string",
      "cook_time": "No cooking required",
      "ingredients": ["quantity + ingredient"],
      "instructions": ["brief assembly instruction"],
      "macros": [
        {{"nutrient": "Protein", "amount": "12g per serving", "benefit": "Supports muscle repair"}},
        {{"nutrient": "Fibre", "amount": "6g per serving", "benefit": "Supports digestion"}}
      ],
      "substitutions": {{
        "ingredient_name": ["substitute1", "substitute2"]
      }},
      "assembly_steps": [
        {{"step": 1, "action": "Add to bowl", "ingredient": "mixed greens", "tip": "Rich in folate and vitamin K"}},
        {{"step": 2, "action": "Layer on top", "ingredient": "chickpeas", "tip": "Great plant-based protein source"}},
        {{"step": 3, "action": "Drizzle over", "ingredient": "olive oil", "tip": "Healthy fats help absorb vitamins"}}
      ]
    }}
  ]
}}"""