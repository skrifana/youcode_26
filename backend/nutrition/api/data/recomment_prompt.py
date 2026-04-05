from fastapi import APIRouter, HTTPException
from backend.nutrition.api.models import RecipeRequest, RecipeResponse
from backend.nutrition.api.services.recipe_services import get_recipes

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("/", response_model=RecipeResponse)
def recommend_recipes(req: RecipeRequest):
    """
    Main endpoint. Accepts shelter_id + pantry ingredients + preferences,
    pulls dietary/cultural context from CSV, returns Claude-generated recipes.
    """
    try:
        return get_recipes(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))