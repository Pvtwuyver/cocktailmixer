#!/usr/bin/env python3
"""
Haalt alle cocktailrecepten op bij TheCocktailDB (gratis test-key '1') en
schrijft ze weg naar data/cocktails.json.

Werkwijze: de publieke API heeft geen "geef alles"-endpoint op het gratis
niveau, maar wel search.php?f=<letter> (zoek op eerste letter). Door dit
voor elke letter a-z te doen en te dedupliceren op idDrink krijgen we de
volledige beschikbare set met foto's en ingrediënten in één keer.

Gebruik: python scripts/scrape.py
Vereist: requests (zie requirements.txt)
"""

import json
import os
import sys
import time
from datetime import datetime, timezone

import requests

API_BASE = "https://www.thecocktaildb.com/api/json/v1/1"
LETTERS = "abcdefghijklmnopqrstuvwxyz"
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "cocktails.json"
)
REQUEST_DELAY_SECONDS = 0.3
REQUEST_TIMEOUT_SECONDS = 15


def fetch_letter(letter):
    """Haalt alle drinks op die beginnen met de gegeven letter. Geeft een
    lege lijst terug bij een netwerkfout of als er niets gevonden is, zodat
    één mislukte letter de rest van de run niet blokkeert."""
    url = f"{API_BASE}/search.php?f={letter}"
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        print(f"  Waarschuwing: letter '{letter}' overgeslagen ({exc})", file=sys.stderr)
        return []

    drinks = payload.get("drinks") or []
    return drinks


def extract_ingredients(raw_drink):
    """Bouwt een schone lijst van {name, measure} van de 15 losse
    strIngredientN / strMeasureN velden."""
    ingredients = []
    for i in range(1, 16):
        name = raw_drink.get(f"strIngredient{i}")
        if not name or not name.strip():
            continue
        measure = raw_drink.get(f"strMeasure{i}")
        ingredients.append(
            {
                "name": name.strip(),
                "measure": (measure or "").strip(),
            }
        )
    return ingredients


def simplify_drink(raw_drink):
    return {
        "id": raw_drink.get("idDrink"),
        "name": raw_drink.get("strDrink"),
        "category": raw_drink.get("strCategory"),
        "iba": raw_drink.get("strIBA"),
        "alcoholic": raw_drink.get("strAlcoholic"),
        "glass": raw_drink.get("strGlass"),
        "instructions": raw_drink.get("strInstructions"),
        "image": raw_drink.get("strDrinkThumb"),
        "tags": [t.strip() for t in (raw_drink.get("strTags") or "").split(",") if t.strip()],
        "ingredients": extract_ingredients(raw_drink),
    }


def normalize_ingredient_casing(cocktails):
    """TheCocktailDB is crowdsourced en spelt hetzelfde ingrediënt soms met
    verschillende hoofdletters (bijv. "Gin" vs "gin", "Lemon juice" vs
    "Lemon Juice"). Dat levert dubbele entries op in de filterlijst en kan
    zelfs botsende HTML-id's veroorzaken. Deze functie kiest per ingrediënt
    (case-insensitief) de meest voorkomende schrijfwijze als canonieke vorm
    en past die overal toe, in-place."""
    variant_counts = {}
    for drink in cocktails:
        for ingredient in drink["ingredients"]:
            key = ingredient["name"].lower()
            counts = variant_counts.setdefault(key, {})
            counts[ingredient["name"]] = counts.get(ingredient["name"], 0) + 1

    canonical = {
        key: max(variants.items(), key=lambda kv: (kv[1], kv[0]))[0]
        for key, variants in variant_counts.items()
    }

    for drink in cocktails:
        for ingredient in drink["ingredients"]:
            ingredient["name"] = canonical[ingredient["name"].lower()]


def build_dataset():
    drinks_by_id = {}

    for index, letter in enumerate(LETTERS):
        print(f"Ophalen letter '{letter}' ({index + 1}/{len(LETTERS)})...")
        for raw_drink in fetch_letter(letter):
            drink_id = raw_drink.get("idDrink")
            if drink_id and drink_id not in drinks_by_id:
                drinks_by_id[drink_id] = simplify_drink(raw_drink)
        time.sleep(REQUEST_DELAY_SECONDS)

    cocktails = sorted(drinks_by_id.values(), key=lambda d: (d["name"] or "").lower())
    normalize_ingredient_casing(cocktails)

    ingredient_set = set()
    category_set = set()
    glass_set = set()
    alcoholic_set = set()
    for drink in cocktails:
        for ingredient in drink["ingredients"]:
            ingredient_set.add(ingredient["name"])
        if drink["category"]:
            category_set.add(drink["category"])
        if drink["glass"]:
            glass_set.add(drink["glass"])
        if drink["alcoholic"]:
            alcoholic_set.add(drink["alcoholic"])

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "TheCocktailDB (https://www.thecocktaildb.com/)",
        "count": len(cocktails),
        "cocktails": cocktails,
        "ingredients_index": sorted(ingredient_set, key=str.lower),
        "categories_index": sorted(category_set, key=str.lower),
        "glasses_index": sorted(glass_set, key=str.lower),
        "alcoholic_index": sorted(alcoholic_set, key=str.lower),
    }


def main():
    dataset = build_dataset()

    if dataset["count"] == 0:
        print(
            "Fout: geen enkele cocktail opgehaald. Bestaande data/cocktails.json wordt niet "
            "overschreven.",
            file=sys.stderr,
        )
        sys.exit(1)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)

    print(f"Klaar: {dataset['count']} cocktails weggeschreven naar {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
