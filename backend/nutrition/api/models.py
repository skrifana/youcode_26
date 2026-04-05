#Main class to define all fields and levels

from pydantic import BaseModel, Field
from enum import Enum



class ModeEnum(str, Enum):
    static = "static"
    interactive = "interactive"

class KitchenAccess(str, Enum):
    # #this class defines the different levels of kitchen access - full, partial and none
    # full = "Full Access. You have an oven, stove and all pantry access!"
    # partial = "Partial Access. You have a microwave, airfryer and/or kettle!"
    # none = "No microwave, kettle or stove access. Welcome to cooking without fire!"

    full = "full"
    partial = "partial"
    none = "none"


# Add a separate lookup for display labels
KITCHEN_ACCESS_LABELS = {
    KitchenAccess.full: "Full Access. You have an oven, stove and all pantry access!",
    KitchenAccess.partial: "Partial Access. You have a microwave, airfryer and/or kettle!",
    KitchenAccess.none: "No microwave, kettle or stove access. Welcome to cooking without fire!"
}

class Cuisine(str, Enum):
    MiddleEast = "Middle Eastern - hummus, shawarma, shakshouka and more beauties."
    EastAsian = "Cucumber salad, tomato egg soup, and more love."
    SouthAsian = "Dal, biryani, prawn curry and more spice."
    SouthAmerican = "Burritos, tacos, quesadillas and more heaven."
    Basics = "Chicken salad, vegetable wraps, oats and more sweet."


class RecipeMode(str, Enum):
    interactive = "Interactive Mode"
    non_interactive = "Non-Interactive Mode"

class ServingSize(str, Enum):
    single = "Single Size"
    small = "2-4 people"
    bulk = "Bulk (Multiple People)"

class DietaryRestrictions(str, Enum):
    halal = "Halal"
    vegetarian = "Vegetarian"
    vegan = "Vegan"
    gluten_free = "Gluten Free"

#shelter specific
class ShelterSummary(BaseModel):
    id: str
    name: str
    city: str
    lat: float
    lon: float
    organization: str | None = None
    type: str | None = None


class ShelterProfile(BaseModel):
    """Aggregated resident data for a shelter, derived from synthetic profiles CSV."""
    shelter_id: str
    dietary_restrictions: list[str]  # deduplicated across residents
    cultural_backgrounds: list[str]  # deduplicated across residents
    resident_count: int

# recipe request and prompting

class RecipeRequest(BaseModel):
    shelter_id: str = Field(..., description="Used to pull dietary/cultural context")
    ingredients: list[str] = Field(..., min_length=1)
    cuisine: str | None = Field(default=None)
    servings: int = Field(default=4, ge=1, le=100)
    kitchen_access: KitchenAccess
    dietary_overrides: list[str] = Field(
        default=[],
        description="Additional restrictions beyond what the shelter profile contains",
    )
    mode: RecipeMode = RecipeMode.interactive

class MacroHighlight(BaseModel):
    nutrient: str
    amount: str
    benefit: str


class AssemblyStep(BaseModel): # describe all steps of assembly
    step: int
    action: str  # eg - add to bowl, mix, stir etc.
    ingredient: str
    tip: str | None = None  # nutritional or flavour tip


class Recipe(BaseModel):
    title: str
    servings: int
    prep_time: str
    cook_time: str
    ingredients: list[str]
    instructions: list[str]
    macros: list[MacroHighlight]
    substitutions: dict[str, list[str]]
    #Only populated when mode == interactive
    assembly_steps: list[AssemblyStep] = []


class RecipeResponse(BaseModel):
    recipes: list[Recipe]
    kitchen_level: KitchenAccess
    mode: RecipeMode
    shelter_context: ShelterProfile
    note: str | None = None