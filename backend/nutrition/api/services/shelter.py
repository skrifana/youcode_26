# pandas to load both csvs and normalise column names
import pandas as pd
from functools import lru_cache
from pathlib import Path
from backend.nutrition.api.models import ShelterSummary, ShelterProfile

DATA_DIR = Path(__file__).parent.parent / "data"


@lru_cache(maxsize=1)
def _load_shelters() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "shelters.csv")
    # Normalise column names to lowercase, strip whitespace
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    # Drop rows missing coordinates — can't place on map
    df = df.dropna(subset=["latitude", "longitude"])
    return df


@lru_cache(maxsize=1)
def _load_profiles() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "resident_profiles.csv")
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    return df


def get_all_shelters() -> list[ShelterSummary]:
    df = _load_shelters()
    shelters = []
    for _, row in df.iterrows():
        shelters.append(
            ShelterSummary(
                id=str(row.get("id", row.name)),
                name=str(row.get("name", "Unknown")),
                city=str(row.get("city", "")),
                lat=float(row["latitude"]),
                lon=float(row["longitude"]),
                organization=str(row.get("organization", "")) or None,
                type=str(row.get("type", "")) or None,
            )
        )
    return shelters


def get_shelter_by_id(shelter_id: str) -> ShelterSummary | None:
    df = _load_shelters()
    # Match on id column or row index
    mask = df.get("id", pd.Series(df.index)).astype(str) == shelter_id
    row = df[mask]
    if row.empty:
        return None
    r = row.iloc[0]
    return ShelterSummary(
        id=shelter_id,
        name=str(r.get("name", "Unknown")),
        city=str(r.get("city", "")),
        lat=float(r["latitude"]),
        lon=float(r["longitude"]),
        organization=str(r.get("organization", "")) or None,
        type=str(r.get("type", "")) or None,
    )


def get_shelter_profile(shelter_id: str) -> ShelterProfile:
    """
    Aggregate dietary restrictions and cultural backgrounds for all residents
    at a given shelter from the synthetic profiles CSV.
    Falls back to empty lists if shelter_id not found.
    """
    df = _load_profiles()

    # Try to match shelter_id column (could be named shelter_id or shelter)
    id_col = "shelter_id" if "shelter_id" in df.columns else "shelter"
    if id_col not in df.columns:
        # No linkage possible — return empty profile
        return ShelterProfile(
            shelter_id=shelter_id,
            dietary_restrictions=[],
            cultural_backgrounds=[],
            resident_count=0,
        )

    residents = df[df[id_col].astype(str) == shelter_id]

    dietary_restrictions: list[str] = []
    cultural_backgrounds: list[str] = []

    if not residents.empty:
        # Dietary restrictions — may be comma-separated within a cell
        if "dietary_restrictions" in residents.columns:
            dietary_restrictions = _flatten_multi_value(
                residents["dietary_restrictions"].dropna()
            )

        # Cultural backgrounds
        if "cultural_background" in residents.columns:
            cultural_backgrounds = _flatten_multi_value(
                residents["cultural_background"].dropna()
            )

    return ShelterProfile(
        shelter_id=shelter_id,
        dietary_restrictions=dietary_restrictions,
        cultural_backgrounds=cultural_backgrounds,
        resident_count=len(residents),
    )


def _flatten_multi_value(series: pd.Series) -> list[str]:
    """Explode comma-separated values, deduplicate, sort."""
    values: set[str] = set()
    for cell in series:
        for part in str(cell).split(","):
            cleaned = part.strip()
            if cleaned and cleaned.lower() not in ("none", "n/a", "nan", ""):
                values.add(cleaned)
    return sorted(values)