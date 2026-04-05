# getter to return name and coordinate for the leaflet map
from fastapi import APIRouter, HTTPException
from backend.nutrition.api.models import ShelterSummary, ShelterProfile
from backend.nutrition.api.services.shelter import get_all_shelters, get_shelter_by_id, get_shelter_profile

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.get("/", response_model=list[ShelterSummary])
def list_shelters():
    """All shelters with coordinates — used to populate Leaflet map and dropdown."""
    return get_all_shelters()


@router.get("/{shelter_id}", response_model=ShelterSummary)
def get_shelter(shelter_id: str):
    shelter = get_shelter_by_id(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    return shelter


@router.get("/{shelter_id}/profile", response_model=ShelterProfile)
def shelter_profile(shelter_id: str):
    """
    Aggregated dietary restrictions and cultural backgrounds for a shelter's
    residents, derived from the synthetic profiles CSV.
    Used to pre-populate the recipe request context.
    """
    return get_shelter_profile(shelter_id)