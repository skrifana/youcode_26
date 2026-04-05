import json
import os
import anthropic
from backend.nutrition.api.models import RecipeRequest, RecipeResponse, Recipe, AssemblyStep, MacroHighlight
from backend.nutrition.api.services.shelter import get_shelter_profile
from backend.nutrition.api.prompts.recipe_prompt import SYSTEM_PROMPT, build_static_prompt, build_interactive_prompt

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

LEVEL_NOTES = {
    "full":    None,
    "partial": "Recipes adapted for microwave/kettle use.",
    "none":    "No cooking required, simple assembly and fire recipes."
}


def get_recipes(req: RecipeRequest) -> RecipeResponse:
    # Pull shelter's aggregated dietary + cultural context from CSVs
    profile = get_shelter_profile(req.shelter_id)

    # Merge user overrides into the profile's restrictions
    all_restrictions = sorted(
        set(profile.dietary_restrictions) | set(req.dietary_overrides)
    )

    # Choose prompt based on mode
    if req.mode.value == "interactive":
        prompt = build_interactive_prompt(
            ingredients=req.ingredients,
            servings=req.servings,
            kitchen_access=req.kitchen_access.value,
            cuisine=req.cuisine,
            dietary_restrictions=all_restrictions,
            #cultural_backgrounds=profile.cultural_backgrounds,
        )
    else:
        prompt = build_static_prompt(
            ingredients=req.ingredients,
            servings=req.servings,
            kitchen_access=req.kitchen_access.value,
            cuisine=req.cuisine,
            dietary_restrictions=all_restrictions,
            #cultural_backgrounds=profile.cultural_backgrounds,
        )

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    data = _parse_json(raw)

    recipes = []
    for r in data["recipes"]:
        recipes.append(
            Recipe(
                title=r["title"],
                servings=r["servings"],
                prep_time=r["prep_time"],
                cook_time=r["cook_time"],
                ingredients=r["ingredients"],
                instructions=r["instructions"],
                macros=[MacroHighlight(**m) for m in r.get("macros", [])],
                substitutions=r.get("substitutions", {}),
                assembly_steps=[
                    AssemblyStep(**s) for s in r.get("assembly_steps", [])
                ],
            )
        )

    return RecipeResponse(
        recipes=recipes,
        kitchen_level=req.kitchen_access,
        mode=req.mode,
        shelter_context=profile,
        note=LEVEL_NOTES[req.kitchen_access.value],
    )


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        cleaned = (
            raw.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )
        return json.loads(cleaned)