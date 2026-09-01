#!/usr/bin/env python3
"""
Lokale regressietest voor scripts/scrape.py, met synthetische data.
Werkt zonder internetverbinding — test alleen de verwerkingslogica
(ingrediënten extraheren, casing normaliseren), niet de HTTP-aanroep.

Gebruik: python scripts/test_fixture.py
"""

import sys

from scrape import extract_ingredients, normalize_ingredient_casing, simplify_drink

FAILURES = []


def check(label, condition):
    status = "OK  " if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        FAILURES.append(label)


def make_raw_drink(**overrides):
    base = {
        "idDrink": "99999",
        "strDrink": "Testcocktail",
        "strCategory": "Ordinary Drink",
        "strIBA": None,
        "strAlcoholic": "Alcoholic",
        "strGlass": "Cocktail glass",
        "strInstructions": "Shake and strain.",
        "strDrinkThumb": "https://www.thecocktaildb.com/images/media/drink/example.jpg",
        "strTags": "Classic,Sour",
    }
    for i in range(1, 16):
        base[f"strIngredient{i}"] = None
        base[f"strMeasure{i}"] = None
    base.update(overrides)
    return base


def test_extract_ingredients_skips_empty():
    raw = make_raw_drink(
        strIngredient1="Gin",
        strMeasure1="2 oz",
        strIngredient2="",
        strIngredient3="Lime juice",
        strMeasure3=None,
    )
    ingredients = extract_ingredients(raw)
    check(
        "extract_ingredients: alleen niet-lege ingrediënten, in volgorde",
        [i["name"] for i in ingredients] == ["Gin", "Lime juice"],
    )
    check(
        "extract_ingredients: ontbrekende measure wordt lege string",
        ingredients[1]["measure"] == "",
    )


def test_simplify_drink_fields():
    raw = make_raw_drink(strIngredient1="Vodka", strMeasure1="1 oz")
    drink = simplify_drink(raw)
    check("simplify_drink: id correct", drink["id"] == "99999")
    check("simplify_drink: naam correct", drink["name"] == "Testcocktail")
    check("simplify_drink: tags gesplitst", drink["tags"] == ["Classic", "Sour"])
    check("simplify_drink: image aanwezig", drink["image"].startswith("https://"))


def test_normalize_ingredient_casing():
    cocktails = [
        {"ingredients": [{"name": "gin", "measure": "1 oz"}, {"name": "Lime Juice", "measure": "1 oz"}]},
        {"ingredients": [{"name": "Gin", "measure": "2 oz"}]},
        {"ingredients": [{"name": "Gin", "measure": "1 1/2 oz"}]},
        {"ingredients": [{"name": "lime juice", "measure": "1/2 oz"}]},
    ]
    normalize_ingredient_casing(cocktails)
    names = {ing["name"] for c in cocktails for ing in c["ingredients"]}
    check(
        "normalize_ingredient_casing: 'Gin' wint van 'gin' (2 tegen 1)",
        "Gin" in names and "gin" not in names,
    )
    check(
        "normalize_ingredient_casing: geen dubbele schrijfwijzen meer over",
        len(names) == 2,
    )


def main():
    test_extract_ingredients_skips_empty()
    test_simplify_drink_fields()
    test_normalize_ingredient_casing()

    print()
    if FAILURES:
        print(f"{len(FAILURES)} test(en) gefaald: {FAILURES}")
        sys.exit(1)
    print("Alle tests geslaagd.")


if __name__ == "__main__":
    main()
