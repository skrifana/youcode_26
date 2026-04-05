import json
import os

from backend.nutrition.api.models import (
    RecipeRequest, RecipeResponse, Recipe, AssemblyStep, MacroHighlight
)
from backend.nutrition.api.services.shelter import get_shelter_profile
from backend.nutrition.api.prompts.recipe_prompt import (
    SYSTEM_PROMPT, build_static_prompt, build_interactive_prompt
)
from fastapi import HTTPException
from groq import Groq

_client = Groq(api_key="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")

LEVEL_NOTES = {
    "full":    None,
    "partial": "Recipes adapted for microwave/kettle use.",
    "none":    "No cooking required — simple assembly recipes only.",
}


def get_recipes(req: RecipeRequest) -> RecipeResponse:
    profile = get_shelter_profile(req.shelter_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Shelter '{req.shelter_id}' not found")

    all_restrictions = sorted(
        set(profile.dietary_restrictions) | set(req.dietary_overrides)
    )

    if req.mode.value == "Interactive Mode":
        prompt = build_interactive_prompt(
            ingredients=req.ingredients,
            servings=req.servings,
            kitchen_access=req.kitchen_access.value,
            cuisine=req.cuisine,
            dietary_restrictions=all_restrictions,
            cultural_backgrounds=profile.cultural_backgrounds,
        )
    else:
        prompt = build_static_prompt(
            ingredients=req.ingredients,
            servings=req.servings,
            kitchen_access=req.kitchen_access.value,
            cuisine=req.cuisine,
            dietary_restrictions=all_restrictions,
        )

    try:
        response = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=3000,
        )
        raw = response.choices[0].message.content
        data = _parse_json(raw)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    recipes = []
    for r in data.get("recipes", []):
        # Safely parse assembly_steps — only include valid dicts with required fields
        raw_steps = r.get("assembly_steps", [])
        assembly_steps = []
        for s in raw_steps:
            if isinstance(s, dict) and "action" in s and "ingredient" in s:
                assembly_steps.append(AssemblyStep(
                    step=s.get("step", len(assembly_steps) + 1),
                    action=s["action"],
                    ingredient=s["ingredient"],
                    tip=s.get("tip"),
                ))

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
                assembly_steps=assembly_steps,
            )
        )

    if not recipes:
        raise HTTPException(status_code=500, detail="Model returned no recipes")

    return RecipeResponse(
        recipes=recipes,
        kitchen_level=req.kitchen_access,
        mode=req.mode,
        shelter_context=profile,
        note=LEVEL_NOTES.get(req.kitchen_access.value),
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
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Model returned invalid JSON: {e}"
            )