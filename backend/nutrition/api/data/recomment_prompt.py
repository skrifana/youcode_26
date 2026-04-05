#
#
#
# from fastapi import APIRouter, HTTPException
# from backend.nutrition.api.models import RecipeRequest, RecipeResponse
# from backend.nutrition.api.services.recipe_services import get_recipes
#
# # This is the ONLY router for recipe generation.
# # recipe_services.py contains the logic; this file exposes the HTTP endpoint.
# router = APIRouter(prefix="/recommend", tags=["recommend"])
#
#
# @router.post("/", response_model=RecipeResponse)
# def recommend_recipes(req: RecipeRequest):
#     """
#     POST /recommend/
#     Accepts shelter_id + pantry ingredients + preferences,
#     pulls dietary/cultural context from CSV, returns Claude-generated recipes.
#     """
#     try:
#         return get_recipes(req)
#     except HTTPException:
#         raise  # re-raise FastAPI exceptions as-is
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
#
# @router.post("/recommend", response_model=RecipeResponse)
# async def get_recommendation(request: RecipeRequest):
#     # This calls your Claude processing logic
#     recipe_data = await get_recipes(request)
#     return recipe_data


from fastapi import APIRouter, HTTPException
from backend.nutrition.api.models import RecipeRequest, RecipeResponse
from backend.nutrition.api.services.recipe_services import get_recipes

router = APIRouter(prefix="/recommend", tags=["recommend"])

@router.post("/", response_model=RecipeResponse)
def recommend_recipes(req: RecipeRequest):
    # This is the single entry point the website will call
    return get_recipes(req)