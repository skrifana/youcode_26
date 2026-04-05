import json
import os
import google.generativeai as genai


from backend.nutrition.api.models import (
    RecipeRequest, RecipeResponse, Recipe, AssemblyStep, MacroHighlight
)
from backend.nutrition.api.services.shelter import get_shelter_profile
from backend.nutrition.api.prompts.recipe_prompt import (
    SYSTEM_PROMPT, build_static_prompt, build_interactive_prompt
)
from fastapi import HTTPException


_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBfFUewXDRMSKvxFPAuNmUi3hTvLPuFkRI")

genai.configure(api_key=_API_KEY)



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

    if req.mode.value == "interactive":
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
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(prompt)
        raw = response.text

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")

    data = _parse_json(raw)

    recipes = []
    for r in data.get("recipes", []):
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

# def get_recipes(req: RecipeRequest) -> RecipeResponse:
#     """Core business logic — called by the router in recomment_prompt.py."""

#     profile = get_shelter_profile(req.shelter_id)
#     if profile is None:
#         raise HTTPException(status_code=404, detail=f"Shelter '{req.shelter_id}' not found")

#     all_restrictions = sorted(
#         set(profile.dietary_restrictions) | set(req.dietary_overrides)
#     )

#     if req.mode.value == "interactive":
#         prompt = build_interactive_prompt(
#             ingredients=req.ingredients,
#             servings=req.servings,
#             kitchen_access=req.kitchen_access.value,
#             cuisine=req.cuisine,
#             dietary_restrictions=all_restrictions,
#             cultural_backgrounds=profile.cultural_backgrounds,
#         )
#     else:
#         prompt = build_static_prompt(
#             ingredients=req.ingredients,
#             servings=req.servings,
#             kitchen_access=req.kitchen_access.value,
#             cuisine=req.cuisine,
#             dietary_restrictions=all_restrictions,
#         )

#     try:
#         message = _get_client().messages.create(
#             model="claude-opus-4-5",
#             max_tokens=3000,
#             system=SYSTEM_PROMPT,
#             messages=[{"role": "user", "content": prompt}],
#         )
#     except anthropic.AuthenticationError:
#         raise HTTPException(
#             status_code=502,
#             detail="Invalid Anthropic API key. Set ANTHROPIC_API_KEY or update the hardcoded value in recipe_services.py"
#         )
#     except anthropic.APIStatusError as e:
#         raise HTTPException(status_code=502, detail=f"Claude API error: {e.message}")

#     raw = message.content[0].text
#     data = _parse_json(raw)

#     recipes = []
#     for r in data.get("recipes", []):
#         recipes.append(
#             Recipe(
#                 title=r["title"],
#                 servings=r["servings"],
#                 prep_time=r["prep_time"],
#                 cook_time=r["cook_time"],
#                 ingredients=r["ingredients"],
#                 instructions=r["instructions"],
#                 macros=[MacroHighlight(**m) for m in r.get("macros", [])],
#                 substitutions=r.get("substitutions", {}),
#                 assembly_steps=[
#                     AssemblyStep(**s) for s in r.get("assembly_steps", [])
#                 ],
#             )
#         )

#     if not recipes:
#         raise HTTPException(status_code=500, detail="Model returned no recipes")

#     return RecipeResponse(
#         recipes=recipes,
#         kitchen_level=req.kitchen_access,
#         mode=req.mode,
#         shelter_context=profile,
#         note=LEVEL_NOTES.get(req.kitchen_access.value),
#     )


# def _parse_json(raw: str) -> dict:
#     """Strip markdown fences if present, then parse JSON."""
#     try:
#         return json.loads(raw)
#     except json.JSONDecodeError:
#         cleaned = (
#             raw.strip()
#             .removeprefix("```json")
#             .removeprefix("```")
#             .removesuffix("```")
#             .strip()
#         )
#         try:
#             return json.loads(cleaned)
#         except json.JSONDecodeError as e:
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"Model returned invalid JSON: {e}"
#             )
