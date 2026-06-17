"""
generate_dataset.py
==================
Generate realistic supplement product datasets matching the sample file structure.

Each product has:
  - id:             category-code (e.g. whey-001)
  - page_content:    Realistic product description (2-3 sentences)
  - metadata:        Basic product info (sku, name, brand, category, price, weight, flavor, origin, image_url, product_url)
  - attributes:      Category-specific fields (nutrition, ingredients, dietary tags, goals)

Run:
    python generate_dataset.py
Output:
    download/dataset_online/dataset/whey_protein_dataset.json
    download/dataset_online/dataset/creatine_dataset.json
    download/dataset_online/dataset/protein_bar_dataset.json
    download/dataset_online/dataset/preworkout_dataset.json
    download/dataset_online/dataset/protein_cookie_dataset.json
"""

import json
import random
import os
import math
from pathlib import Path

random.seed(42)

BASE_DIR   = Path(__file__).parent
OUT_DIR    = BASE_DIR / "dataset"
OUT_DIR.mkdir(exist_ok=True)

# ──────────────────────────────────────────────────────────────
# MASTER DATA
# ──────────────────────────────────────────────────────────────

BRANDS = {
    "whey_protein": [
        "Nutricost", "BulkSupplements", "Bowmar", "Optimum Nutrition",
        "Vitalibis", "NOW Sports", "Allmax", "MusclePharm", "Labrada",
        "Rule1", "MuscleTech", "Ghost", "Gaspari Nutrition", "Rivalus",
        "Momentous", "Transparent Labs", "Reflex Nutrition", "BSN",
        "Myprotein", "Thorne", "PEScience", "Dymatize", "Ascent"
    ],
    "creatine": [
        "MET-Rx", "Jacked Factory", "Thorne", "Rule1", "BulkSupplements",
        "Beast Sports", "Optimum Nutrition", "PrimaForce", "NutraBio",
        "Nutricost", "NOW Sports", "Creapure", "ATP Lab", "BPI Sports",
        "MuscleTech", "MusclePharm", "Universal Nutrition", "Transparent Labs",
        "EFX Sports", "ProLab", "GAT Sport", "Kaged Muscle", "Con-Cret",
        "Allmax", "Dymatize"
    ],
    "protein_bar": [
        "RXBar", "Premier Protein", "Atlas Bar", "Good! Snacks", "No Cow",
        "Clif Builders", "Built Bar", "Fulfil", "Detour", "BSN",
        "Think!", "PowerBar", "Kirkland", "Kind Protein", "Pure Protein",
        "Grenade", "ProBar", "MusclePharm", "Quest Nutrition",
        "ONE", "Barebells", "ThinkThin", "Lenny & Larry's", "Power Crunch",
        "Quest Hero"
    ],
    "preworkout": [
        "Bucked Up", "GAT Sport", "ProSupps", "Kaged Muscle", "NutraBio",
        "Dymatize", "1st Phorm", "Redcon1", "Transparent Labs", "EVL",
        "Jacked Factory", "Legion Athletics", "Axe & Sledge", "BSN",
        "Cellucor", "Huge Supplements", "Gorilla Mode", "MAN Sports",
        "MusclePharm", "Nitraflex", "Onnit", "Alpha Lion", "BPI Sports",
        "RYSE", "Ghost", "C4", "Beyond Raw", "PEScience", "Dr Jekyll",
        "Myprotein", "Optimum Nutrition"
    ],
    "protein_cookie": [
        "Lenny & Larry's", "Myprotein", "PhD Nutrition", "Grenade",
        "Quest Nutrition", "MuscleTech", "Bhu Foods", "Built Bar",
        "Quest Hero", "Barebells", "ONE", "RXBar", "Premier Protein",
        "Clif Builders", "ThinkThin", "Kirkland", "Good! Snacks"
    ],
}

ORIGINS = [
    "USA", "UK", "Australia", "Canada", "Germany",
    "Netherlands", "Sweden", "France", "Japan"
]

GOALS_POOL = {
    "whey_protein": [
        "recovery", "endurance", "muscle_gain", "lean_muscle",
        "strength", "weight_loss", "meal_replacement"
    ],
    "creatine": [
        "strength", "power", "muscle_gain", "lean_muscle",
        "endurance", "performance", "explosive_power"
    ],
    "protein_bar": [
        "muscle_gain", "high_protein_snack", "muscle_maintenance",
        "weight_loss", "low_carb_snack", "meal_replacement", "daily_protein"
    ],
    "preworkout": [
        "energy", "pump", "focus", "strength", "endurance",
        "performance", "alertness", "intensity"
    ],
    "protein_cookie": [
        "muscle_gain", "high_protein_snack", "muscle_maintenance",
        "weight_loss", "daily_protein", "convenient_snack"
    ],
}

DIETARY_POOL = {
    "whey_protein": [
        "has_lactose", "gluten-free", "low-sugar", "lactose_free",
        "keto-friendly", "vegan", "non-gmo", "organic"
    ],
    "creatine": [
        "vegan", "gluten-free", "keto-friendly", "non-gmo",
        "third-party tested", "banned-substance-free", "dairy-free"
    ],
    "protein_bar": [
        "gluten-free", "vegan", "low-sugar", "keto-friendly",
        "non-gmo", "organic", "low-carb", "dairy-free"
    ],
    "preworkout": [
        "gluten-free", "vegan", "keto-friendly", "non-gmo",
        "dairy-free", "sugar-free", "natural-ingredients", "stim-free-available"
    ],
    "protein_cookie": [
        "gluten-free", "vegan", "low-sugar", "keto-friendly",
        "non-gmo", "dairy-free", "egg-free", "soy-free"
    ],
}

# ──────────────────────────────────────────────────────────────
# WHEY PROTEIN
# ──────────────────────────────────────────────────────────────

WHEY_TYPES = ["concentrate", "isolate", "hydrolysate", "blend"]
WHEY_FLAVORS = [
    "Chocolate", "Vanilla", "Strawberry", "Cookies & Cream", "Peanut Butter",
    "Mocha", "Birthday Cake", "Salted Caramel", "Mint Chocolate Chip",
    "Banana", "Blueberry", "Cinnamon Roll", "Pina Colada", "Mango",
    "Double Rich Chocolate", "French Vanilla", "Chocolate Peanut Butter",
    "Fruit Punch", "Rainbow", "Cinnamon Bun"
]
WHEY_SERVING_SIZES = [30, 31, 32, 33, 34, 35]  # grams

WHEY_PAGE_TEMPLATES = [
    "{brand} {type_label} in {flavor} is a {whey_type} whey protein that {lactose_info}. {dietary_info} Each {serving}g serving delivers {protein}g of protein and supports {goal1} and {goal2}. With {servings} servings per container it delivers great value for daily training.",
    "{brand} {name} in {flavor} provides {protein}g of protein per {serving}g serving. {whey_desc}. {dietary_info} Ideal for {goal1} and {goal2}. {servings} servings per container.",
    "Experience {brand} {whey_type} {flavor} — {protein}g protein per serving from {whey_desc}. {dietary_info} Supports {goal1} and {goal2}. {servings} servings per container.",
]

def whey_type_label(wt):
    return {
        "concentrate": "100% Whey Protein",
        "isolate": "Whey Protein Isolate",
        "hydrolysate": "Hydrolyzed Whey Protein",
        "blend": "Whey Protein Blend",
    }.get(wt, wt)

def whey_desc(wt):
    return {
        "concentrate": "concentrate whey protein with optimal amino acid profile",
        "isolate": "isolate whey protein with high purity and fast absorption",
        "hydrolysate": "hydrolyzed whey protein for rapid digestion and absorption",
        "blend": "blend of whey concentrate and isolate for sustained release",
    }.get(wt, wt)

def generate_whey(id_num, brand, flavor):
    wt   = random.choice(WHEY_TYPES)
    lbl  = whey_type_label(wt)
    wdesc = whey_desc(wt)
    servings = random.choice([28, 30, 43, 45, 70, 72, 90, 100])
    serving  = random.choice(WHEY_SERVING_SIZES)
    protein  = serving - random.randint(3, 6)  # ~75-90% protein by weight
    price    = round(random.uniform(20, 140) + (servings / 50), 2)
    weight   = round((servings * serving) / 1000 + random.uniform(0.05, 0.15), 3)
    sku_base = brand[:3].upper() + "-" + wt[:4].upper()
    has_lactose = wt in ["concentrate", "blend"]
    lactose_info = "contains lactose" if has_lactose else "lactose-free and easy to digest"
    dietary = random.sample(DIETARY_POOL["whey_protein"], k=random.randint(1, 3))
    if has_lactose and "has_lactose" not in dietary:
        dietary = ["has_lactose"] + [d for d in dietary if d != "lactose_free"]
    goals = random.sample(GOALS_POOL["whey_protein"], k=2)
    goal1, goal2 = goals
    dietary_info = dietary[0].replace("-", " ").capitalize() + "."

    templates = WHEY_PAGE_TEMPLATES
    template = random.choice(templates)

    brand_alt = brand if random.random() > 0.3 else brand.split()[0]

    page_content = template.format(
        brand=brand_alt,
        type_label=lbl,
        name=name_from_brand(brand, wt, flavor),
        whey_type=wt,
        flavor=flavor,
        lactose_info=lactose_info,
        dietary_info=dietary_info,
        serving=serving,
        protein=protein,
        whey_desc=wdesc,
        servings=servings,
        goal1=goal1.replace("_", " "),
        goal2=goal2.replace("_", " "),
    )

    attributes = {
        "protein_source": f"whey_{wt}",
        "whey_type": wt,
        "dietary": dietary,
        "goals": goals,
        "serving_size_g": serving,
        "servings_per_container": servings,
        "protein_per_serving_g": protein,
    }
    if wt == "blend":
        attributes["protein_per_serving_g"] = protein
        attributes["whey_concentrate_ratio"] = random.choice(["40/60", "50/50", "30/70"])
        attributes["whey_isolate_ratio"] = random.choice(["40/60", "50/50", "30/70"])

    return build_product(
        id_num=f"whey-{id_num:03d}",
        category="whey_protein",
        sku=f"WHY-{sku_base}-{id_num:03d}",
        brand=brand,
        name=f"{lbl} - {flavor}",
        price=price,
        weight=weight,
        flavor=flavor,
        origin=random.choice(ORIGINS),
        page_content=page_content,
        attributes=attributes,
    )


# ──────────────────────────────────────────────────────────────
# CREATINE
# ──────────────────────────────────────────────────────────────

CREATINE_TYPES = ["monohydrate", "micronized", "HCl", "ethyl_ester", "buffered"]
CREATINE_FORMS = ["powder", "capsule", "tablet"]
CREATINE_FLAVORS = ["Unflavored", "Fruit Punch", "Watermelon", "Blue Raspberry",
                     "Green Apple", "Sour Gummy", "Mango", "Cherry Limeade",
                     "Grape", "Orange", "Strawberry Lemonade", "Tropical"]
CREATINE_PAGE_TEMPLATES = [
    "{brand} {cre_type_label} in {flavor} delivers {creatin}g of creatine per {serving}g {form}. {purity_info} {third_party_info} At {purity}% purity it supports {goal1} and {goal2}. {servings_info}",
    "{brand} {cre_type_name} {form} in {flavor} provides {creatin}g creatine per serving. {form_desc}. {dietary_info} {purity_info} Formulated for {goal1} and {goal2}. {servings_info}",
    "Discover {brand} {cre_type_name} — {creatin}g of pure creatine {form}. {form_desc}. {purity_info} {third_party_info} Supports {goal1} and {goal2}. {servings_info}",
]

def cre_type_label(ct):
    return {
        "monohydrate": "Creatine Monohydrate",
        "micronized": "Micronized Creatine",
        "HCl": "Creatine HCl",
        "ethyl_ester": "Creatine Ethyl Ester",
        "buffered": "Buffered Creatine",
    }.get(ct, ct)

def cre_type_name(ct):
    return {
        "monohydrate": "creatine monohydrate powder",
        "micronized": "micronized creatine powder",
        "HCl": "creatine HCl capsule",
        "ethyl_ester": "creatine ethyl ester tablet",
        "buffered": "buffered creatine formula",
    }.get(ct, ct)

def cre_form_desc(form, ct):
    desc = {
        "powder": "Fast-dissolving powder for easy mixing",
        "capsule": "Convenient capsule form for precise dosing",
        "tablet": "Easy-to-swallow tablets for on-the-go use",
    }
    return desc.get(form, "")

def generate_creatine(id_num, brand, flavor):
    ct        = random.choice(CREATINE_TYPES)
    form      = random.choice(CREATINE_FORMS)
    servings  = random.choice([30, 60, 90, 120, 150, 180, 200, 250, 300])
    purity    = round(random.uniform(97.0, 99.9), 1)
    creatin   = round(random.uniform(2.0, 5.0), 1)
    serving   = random.randint(3, 6) if form in ["capsule", "tablet"] else random.randint(4, 8)
    price     = round(random.uniform(16, 55) + (servings / 30), 2)
    weight    = round((servings * serving) / 1000 + random.uniform(0.02, 0.05), 3)
    third_party = random.random() > 0.35
    sku_base  = ct[:4].upper()
    goals     = random.sample(GOALS_POOL["creatine"], k=2)
    goal1, goal2 = goals
    dietary   = random.sample(DIETARY_POOL["creatine"], k=random.randint(1, 2))
    purity_info = f"Ultra-pure at {purity}% with no fillers." if purity >= 99 else f"At {purity}% purity it is formulated for maximum effectiveness."
    third_party_info = "Third-party tested for purity and banned substance safety." if third_party else "Manufactured in GMP-certified facilities."
    form_desc    = cre_form_desc(form, ct)
    servings_info = f"{servings} {form}s per container." if form in ["capsule","tablet"] else f"{servings} servings per container."
    dietary_info = dietary[0].replace("-", " ").capitalize() + "."

    template = random.choice(CREATINE_PAGE_TEMPLATES)
    brand_alt = brand if random.random() > 0.2 else brand.split()[0]

    page_content = template.format(
        brand=brand_alt,
        cre_type_label=cre_type_label(ct),
        cre_type_name=cre_type_name(ct),
        flavor=flavor,
        creatin=creatin,
        serving=serving,
        form=form,
        form_desc=form_desc,
        purity=purity,
        purity_info=purity_info,
        third_party_info=third_party_info,
        dietary_info=dietary_info,
        servings_info=servings_info,
        goal1=goal1.replace("_", " "),
        goal2=goal2.replace("_", " "),
    )

    attributes = {
        "creatine_type": ct,
        "form": form,
        "creatine_per_serving_g": creatin,
        "purity_percent": purity,
        "third_party_tested": third_party,
        "serving_size_g": serving,
        "servings_per_container": servings,
        "dietary": dietary,
        "goals": goals,
    }
    if form in ["capsule", "tablet"]:
        attributes["capsules_per_serving"] = random.randint(2, 5)
        attributes["capsules_per_container"] = servings * attributes["capsules_per_serving"]

    return build_product(
        id_num=f"cre-{id_num:03d}",
        category="creatine",
        sku=f"CRE-{sku_base}-{ct[:4].upper()}-{id_num:03d}",
        brand=brand,
        name=f"{cre_type_label(ct)} - {flavor}",
        price=price,
        weight=weight,
        flavor=flavor,
        origin=random.choice(ORIGINS),
        page_content=page_content,
        attributes=attributes,
    )


# ──────────────────────────────────────────────────────────────
# PROTEIN BAR
# ──────────────────────────────────────────────────────────────

BAR_TYPES   = ["bar", "crisp_bar", "cookie", "brownie"]
BAR_TEXTURES = ["chewy", "crispy", "crunchy", "soft"]
BAR_PAGE_TEMPLATES = [
    "{brand} {product_type} in {flavor} delivers {protein}g of protein from {source}. {texture_desc}. Each serving has {cal} kcal, {carbs}g carbs, {fat}g fat, {sugar}g sugar, and {fiber}g fiber. {dietary_info} Supports {goal1} and {goal2}.",
    "{brand} {name} {product_type} in {flavor} provides {protein}g protein with {texture} texture. {macros}. {dietary_info} Great for {goal1} and {goal2}.",
    "Try {brand} {product_type} in {flavor} — {protein}g protein, {texture} texture. {macros}. {dietary_info} Ideal for {goal1} and {goal2}.",
]

PROTEIN_SOURCES = [
    "whey_protein_isolate", "casein", "soy_protein", "egg_white",
    "blend_protein", "plant_protein", "whey_concentrate",
    "casein_whey_blend", "pea_protein", "rice_protein"
]

def texture_desc(t):
    return {
        "chewy": "Chewy texture with satisfying bite",
        "crispy": "Light and crispy layer for crunch lovers",
        "crunchy": "Crunchy texture with delightful bite",
        "soft": "Soft and indulgent texture",
    }.get(t, t)

def source_label(s):
    return {
        "whey_protein_isolate": "whey protein isolate",
        "casein": "milk protein casein",
        "soy_protein": "soy protein isolate",
        "egg_white": "egg white protein",
        "blend_protein": "blend of whey and casein",
        "plant_protein": "plant-based protein blend",
        "whey_concentrate": "whey protein concentrate",
        "casein_whey_blend": "casein and whey blend",
        "pea_protein": "pea protein isolate",
        "rice_protein": "brown rice protein",
    }.get(s, s)

def generate_protein_bar(id_num, brand, flavor, product_type):
    source    = random.choice(PROTEIN_SOURCES)
    texture   = random.choice(BAR_TEXTURES)
    protein   = random.randint(14, 25)
    carbs     = random.randint(15, 30)
    fat       = random.randint(4, 12)
    sugar     = random.randint(1, 8)
    fiber     = random.randint(3, 18)
    cal       = protein * 4 + carbs * 4 + fat * 9
    pieces    = random.choice([6, 8, 10, 12, 15, 18, 20, 24])
    serving_g = random.randint(50, 75)
    price     = round(random.uniform(25, 40) + (pieces / 5), 2)
    weight    = round(pieces * serving_g / 1000 + random.uniform(0.05, 0.1), 3)
    dietary   = random.sample(DIETARY_POOL["protein_bar"], k=random.randint(1, 3))
    goals     = random.sample(GOALS_POOL["protein_bar"], k=2)
    goal1, goal2 = goals
    dietary_info = dietary[0].replace("-", " ").capitalize() + "."
    name_label = "Protein " + product_type.replace("_", " ").title()

    macros = f"{cal} kcal, {carbs}g carbs, {fat}g fat, {sugar}g sugar, {fiber}g fiber."
    template = random.choice(BAR_PAGE_TEMPLATES)
    brand_alt = brand if random.random() > 0.2 else brand.split()[0]

    page_content = template.format(
        brand=brand_alt,
        product_type=product_type,
        name=name_label,
        flavor=flavor,
        protein=protein,
        source=source_label(source),
        texture=texture,
        texture_desc=texture_desc(texture),
        macros=macros,
        cal=cal,
        carbs=carbs,
        fat=fat,
        sugar=sugar,
        fiber=fiber,
        dietary_info=dietary_info,
        goal1=goal1.replace("_", " "),
        goal2=goal2.replace("_", " "),
    )

    attributes = {
        "product_type": product_type,
        "protein_source": source,
        "protein_per_serving_g": protein,
        "carbs_per_serving_g": carbs,
        "fat_per_serving_g": fat,
        "calories_per_serving": cal,
        "sugar_per_serving_g": sugar,
        "fiber_per_serving_g": fiber,
        "serving_size_g": serving_g,
        "pieces_per_package": pieces,
        "texture": texture,
        "dietary": dietary,
        "goals": goals,
    }

    return build_product(
        id_num=f"bar-{id_num:03d}",
        category="protein_bar",
        sku=f"BAR-{brand[:3].upper()}-{product_type[:3].upper()}-{id_num:03d}",
        brand=brand,
        name=f"{name_label} - {flavor}",
        price=price,
        weight=weight,
        flavor=flavor,
        origin=random.choice(ORIGINS),
        page_content=page_content,
        attributes=attributes,
    )


# ──────────────────────────────────────────────────────────────
# PRE-WORKOUT
# ──────────────────────────────────────────────────────────────

STIMULANT_LEVELS = ["none", "low", "moderate", "high", "extreme"]
PREWORKOUT_FORMS = ["powder", "capsule", "ready-to-drink"]
KEY_INGREDIENTS_POOL = [
    "Caffeine Anhydrous", "Beta-Alanine", "L-Tyrosine", "Taurine",
    "Alpha-GPC", "Creatine Monohydrate", "L-Citrulline", "Betaine Anhydrous",
    "Electrolytes", "L-Arginine", "Caffeine Citrate", "L-Citrulline Malate",
    "Betaine", "Natural Caffeine", "L-Theanine", "Ashwagandha",
    "Arginine AKG", "Creatine Nitrate", "Yohimbine", "DMHA",
    "CarnoSyn Beta-Alanine", "BCAAs", "Quercetin", "Agmatine Sulfate",
    "L-Norvaline", "Huperzine A", "Alpha-Yohimbine"
]
PRE_PAGE_TEMPLATES = [
    "{brand} {name} is a {stim_label} pre-workout in {flavor} featuring {caffeine}mg of caffeine per serving. Key ingredients: {ingredients}. {contains_creatine}. {dietary_info} Designed to support {goal1} and {goal2} for peak performance.",
    "{brand} {product_name} in {flavor} delivers {caffeine}mg caffeine ({stim_label}) per serving. Ingredients: {ingredients}. {contains_creatine}. {dietary_info} Supports {goal1} and {goal2}.",
    "Unlock your potential with {brand} {product_name} — {stim_label} intensity, {caffeine}mg caffeine. {ingredients_str}. {contains_creatine}. {dietary_info} Built for {goal1} and {goal2}.",
]

def stim_label(s):
    return {
        "none": "stimulant-free",
        "low": "low-stimulant",
        "moderate": "moderate-stimulant",
        "high": "high-stimulant",
        "extreme": "extreme-stimulant",
    }.get(s, s)

def generate_preworkout(id_num, brand, flavor):
    stim      = random.choice(STIMULANT_LEVELS)
    caffeine  = 0 if stim == "none" else random.choice([
        random.randint(50, 100),   # low
        random.randint(100, 180),  # moderate
        random.randint(180, 280),  # high
        random.randint(280, 400),  # extreme
    ]) if stim != "none" else 0
    servings  = random.choice([20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120])
    serving_g = random.choice([5.0, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0, 10.5, 11.0, 12.0, 13.0])
    price     = round(random.uniform(29, 65) + (servings / 20), 2)
    weight    = round(servings * serving_g / 1000 + random.uniform(0.02, 0.05), 3)
    form      = "powder"
    contains_creat = random.random() > 0.4
    num_ing   = random.randint(4, 8)
    ingredients = random.sample(KEY_INGREDIENTS_POOL, k=num_ing)
    if contains_creat and "Creatine Monohydrate" not in ingredients:
        ingredients = ["Creatine Monohydrate"] + ingredients[:num_ing-1]
    ingredients_str = ", ".join(ingredients[:5]) + "." if len(ingredients) > 5 else ", ".join(ingredients) + "."
    beta_ala = random.randint(1000, 3500) if "Beta-Alanine" in ingredients or "CarnoSyn Beta-Alanine" in ingredients else 0
    l_cit    = random.randint(3000, 8000) if "L-Citrulline" in ingredients or "L-Citrulline Malate" in ingredients else 0
    dietary  = random.sample(DIETARY_POOL["preworkout"], k=random.randint(1, 2))
    goals    = random.sample(GOALS_POOL["preworkout"], k=2)
    goal1, goal2 = goals
    dietary_info = dietary[0].replace("-", " ").capitalize() + "."
    contains_creatine_str = "Includes creatine for added strength support." if contains_creat else "Stimulant-free formula without creatine."
    name_label = random.choice(["Pre-Workout", "Pre-Training Formula", "Training Formula", "Pre-Workout Igniter", "Pre-Workout Matrix", "Training Stack"])

    template = random.choice(PRE_PAGE_TEMPLATES)
    brand_alt = brand if random.random() > 0.2 else brand.split()[0]

    page_content = template.format(
        brand=brand_alt,
        name=name_label,
        product_name=name_label,
        flavor=flavor,
        stim_label=stim_label(stim),
        caffeine=caffeine,
        ingredients=", ".join(ingredients),
        ingredients_str=ingredients_str,
        contains_creatine=contains_creatine_str,
        dietary_info=dietary_info,
        goal1=goal1.replace("_", " "),
        goal2=goal2.replace("_", " "),
    )

    attributes = {
        "form": form,
        "stimulant_level": stim,
        "caffeine_per_serving_mg": caffeine,
        "beta_alanine_mg": beta_ala,
        "l_citrulline_mg": l_cit,
        "contains_creatine": contains_creat,
        "key_ingredients": ingredients,
        "serving_size_g": serving_g,
        "servings_per_container": servings,
        "dietary": dietary,
        "goals": goals,
    }

    return build_product(
        id_num=f"pre-{id_num:03d}",
        category="preworkout",
        sku=f"PRE-{brand[:3].upper()}-{stim[:3].upper()}-{id_num:03d}",
        brand=brand,
        name=f"{name_label} - {flavor}",
        price=price,
        weight=weight,
        flavor=flavor,
        origin=random.choice(ORIGINS),
        page_content=page_content,
        attributes=attributes,
    )


# ──────────────────────────────────────────────────────────────
# PROTEIN COOKIE
# ──────────────────────────────────────────────────────────────

COOKIE_TYPES  = ["cookie", "brownie"]
COOKIE_TEXTURES = ["chewy", "soft", "crispy", "crunchy"]
COOKIE_PAGE_TEMPLATES = [
    "{brand} protein cookie in {flavor} delivers {protein}g of protein from {source}. {texture_desc}. Each cookie has {cal} kcal, {carbs}g carbs, {fat}g fat, {sugar}g sugar, and {fiber}g fiber. {dietary_info} Great for {goal1} and {goal2}.",
    "Indulge in {brand} protein {cookie_type} {flavor} — {protein}g protein, {texture} texture. {macros}. {dietary_info} Supports {goal1} and {goal2}.",
    "{brand} {cookie_type} in {flavor} provides {protein}g protein per {serving}g serving. {texture_desc}. {macros}. {dietary_info} Perfect for {goal1} and {goal2}.",
]

def generate_protein_cookie(id_num, brand, flavor):
    source    = random.choice(["whey_protein_isolate", "blend_protein", "whey_concentrate", "plant_protein", "casein_whey_blend"])
    texture   = random.choice(COOKIE_TEXTURES)
    protein   = random.randint(12, 22)
    carbs     = random.randint(18, 38)
    fat       = random.randint(5, 14)
    sugar     = random.randint(2, 12)
    fiber     = random.randint(2, 12)
    cal       = protein * 4 + carbs * 4 + fat * 9
    pieces    = random.choice([6, 8, 10, 12, 15, 18, 24])
    serving_g = random.randint(55, 85)
    price     = round(random.uniform(22, 38) + (pieces / 5), 2)
    weight    = round(pieces * serving_g / 1000 + random.uniform(0.05, 0.1), 3)
    cookie_type = random.choice(COOKIE_TYPES)
    dietary  = random.sample(DIETARY_POOL["protein_cookie"], k=random.randint(1, 3))
    goals    = random.sample(GOALS_POOL["protein_cookie"], k=2)
    goal1, goal2 = goals
    dietary_info = dietary[0].replace("-", " ").capitalize() + "."
    macros   = f"{cal} kcal, {carbs}g carbs, {fat}g fat, {sugar}g sugar, {fiber}g fiber."

    template = random.choice(COOKIE_PAGE_TEMPLATES)
    brand_alt = brand if random.random() > 0.2 else brand.split()[0]

    page_content = template.format(
        brand=brand_alt,
        cookie_type=cookie_type,
        flavor=flavor,
        protein=protein,
        source=source_label(source),
        texture=texture,
        texture_desc=texture_desc(texture),
        macros=macros,
        cal=cal,
        carbs=carbs,
        fat=fat,
        sugar=sugar,
        fiber=fiber,
        serving=serving_g,
        dietary_info=dietary_info,
        goal1=goal1.replace("_", " "),
        goal2=goal2.replace("_", " "),
    )

    attributes = {
        "product_type": cookie_type,
        "protein_source": source,
        "protein_per_serving_g": protein,
        "carbs_per_serving_g": carbs,
        "fat_per_serving_g": fat,
        "calories_per_serving": cal,
        "sugar_per_serving_g": sugar,
        "fiber_per_serving_g": fiber,
        "serving_size_g": serving_g,
        "pieces_per_package": pieces,
        "texture": texture,
        "dietary": dietary,
        "goals": goals,
    }

    return build_product(
        id_num=f"ckie-{id_num:03d}",
        category="protein_cookie",
        sku=f"PCK-{brand[:3].upper()}-{cookie_type[:3].upper()}-{id_num:03d}",
        brand=brand,
        name=f"Protein {cookie_type.title()} - {flavor}",
        price=price,
        weight=weight,
        flavor=flavor,
        origin=random.choice(ORIGINS),
        page_content=page_content,
        attributes=attributes,
    )


# ──────────────────────────────────────────────────────────────
# SHARED HELPERS
# ──────────────────────────────────────────────────────────────

def name_from_brand(brand, wt, flavor):
    return f"{whey_type_label(wt)} - {flavor}"

def build_product(id_num, category, sku, brand, name, price, weight, flavor, origin, page_content, attributes):
    slug = (brand + " " + name + " " + flavor).lower().replace(" ", "-").replace("_", "-")
    slug = "".join(c if c.isalnum() or c in "-." else "-" for c in slug)
    slug = slug[:100]
    return {
        "id": id_num,
        "page_content": page_content,
        "metadata": {
            "sku": sku,
            "name": name,
            "brand": brand,
            "category": category,
            "price": price,
            "weight_kg": weight,
            "flavor": flavor,
            "origin_country": origin,
            "image_url": f"https://example.com/images/{slug}.jpg",
            "product_url": f"https://example.com/products/{slug}",
        },
        "attributes": attributes,
    }


# ──────────────────────────────────────────────────────────────
# FLAVOR POOLS
# ──────────────────────────────────────────────────────────────

WHEY_FLAVORS_FULL = [
    "Chocolate", "Vanilla", "Strawberry", "Cookies & Cream", "Peanut Butter",
    "Chocolate Peanut Butter", "Mocha Cappuccino", "Birthday Cake", "Salted Caramel",
    "Mint Chocolate Chip", "Banana Cream", "Blueberry", "Cinnamon Roll", "Pina Colada",
    "Mango", "Double Rich Chocolate", "French Vanilla", "Fruit Punch", "Rainbow",
    "Cinnamon Bun", "Apple Pie", "Chocolate Milk", "Caramel Latte", "Chocolate Malt",
    "White Chocolate", "Rocky Road", "S'mores", "Tiramisu", "Coconut", "Peanut Butter Cup"
]

PREWORKOUT_FLAVORS = [
    "Blue Raspberry", "Fruit Punch", "Watermelon", "Green Apple", "Sour Gummy",
    "Cherry Limeade", "Tropical Punch", "Mango", "Strawberry Lemonade", "Grape",
    "Sour Watermelon", "Arctic Ice", "Blackberry", "Pineapple", "Orange Citrus",
    "Sour Apple", "Rainbow", "Cotton Candy", "Peach Tea", "Rocket Pop",
    "Tiger's Blood", "Miami Vice", "Frost Bite", "Blueberry Lemonade", "Pink Lemonade"
]

PROTEIN_BAR_FLAVORS = [
    "Chocolate", "Chocolate Chip", "Double Chocolate", "Peanut Butter", "Chocolate Peanut Butter",
    "Oatmeal Chocolate Chip", "Salted Caramel", "Birthday Cake", "Cookies & Cream", "S'mores",
    "Blueberry", "Cinnamon Roll", "Lemon", "Mint Chocolate", "Almond", "Coconut Almond",
    "Hazelnut", "Raspberry", "Strawberry", "Dark Chocolate", "White Chocolate", "Caramel",
    "Fudge Brownie", "Cookie Dough", "Vanilla", "Coffee", "Maple", "Pecan", "Cherry",
    "Peanut Butter Cup", "Chocolate Hazelnut"
]

PROTEIN_COOKIE_FLAVORS = [
    "Chocolate Chip", "Double Chocolate", "Peanut Butter", "Snickerdoodle", "Birthday Cake",
    "Oatmeal Raisin", "Coconut", "White Chocolate Macadamia", "Pecan Blondie", "Sugar",
    "Oatmeal Chocolate Chip", "Mint Chocolate Chip", "Salted Caramel", "Peanut Butter Cup",
    "Almond Joy", "Fudge Brownie", "Lemon", "Cinnamon Bun", "Apple Pie", "Red Velvet"
]

# ──────────────────────────────────────────────────────────────
# MAIN GENERATION
# ──────────────────────────────────────────────────────────────

def generate_whey_dataset(n=70):
    brands  = random.sample(BRANDS["whey_protein"], k=min(n, len(BRANDS["whey_protein"])))
    flavors = random.choices(WHEY_FLAVORS_FULL, k=n)
    dataset = []
    for i in range(n):
        brand  = brands[i % len(brands)]
        flavor = flavors[i]
        dataset.append(generate_whey(i + 1, brand, flavor))
    return dataset

def generate_creatine_dataset(n=40):
    brands  = random.sample(BRANDS["creatine"], k=min(n, len(BRANDS["creatine"])))
    flavors = random.choices(CREATINE_FLAVORS, k=n)
    dataset = []
    for i in range(n):
        brand  = brands[i % len(brands)]
        flavor = flavors[i]
        dataset.append(generate_creatine(i + 1, brand, flavor))
    return dataset

def generate_protein_bar_dataset(n=70):
    brands  = random.sample(BRANDS["protein_bar"], k=min(n, len(BRANDS["protein_bar"])))
    flavors = random.choices(PROTEIN_BAR_FLAVORS, k=n)
    types   = random.choices(BAR_TYPES, k=n, weights=[50, 20, 15, 15])
    dataset = []
    for i in range(n):
        brand       = brands[i % len(brands)]
        flavor      = flavors[i]
        product_type = types[i]
        dataset.append(generate_protein_bar(i + 1, brand, flavor, product_type))
    return dataset

def generate_preworkout_dataset(n=70):
    brands  = random.sample(BRANDS["preworkout"], k=min(n, len(BRANDS["preworkout"])))
    flavors = random.choices(PREWORKOUT_FLAVORS, k=n)
    dataset = []
    for i in range(n):
        brand  = brands[i % len(brands)]
        flavor = flavors[i]
        dataset.append(generate_preworkout(i + 1, brand, flavor))
    return dataset

def generate_protein_cookie_dataset(n=30):
    brands  = random.sample(BRANDS["protein_cookie"], k=min(n, len(BRANDS["protein_cookie"])))
    flavors = random.choices(PROTEIN_COOKIE_FLAVORS, k=n)
    dataset = []
    for i in range(n):
        brand  = brands[i % len(brands)]
        flavor = flavors[i]
        dataset.append(generate_protein_cookie(i + 1, brand, flavor))
    return dataset


def main():
    datasets = [
        ("whey_protein", generate_whey_dataset(70)),
        ("creatine",     generate_creatine_dataset(40)),
        ("protein_bar",  generate_protein_bar_dataset(70)),
        ("preworkout",   generate_preworkout_dataset(70)),
        ("protein_cookie", generate_protein_cookie_dataset(30)),
    ]

    print("")
    print("=" * 65)
    print("  SUPPLEMENT DATASET GENERATOR v2")
    print("=" * 65)
    print(f"\nOutput: {OUT_DIR}\n")

    total = 0
    for name, dataset in datasets:
        out_path = OUT_DIR / f"{name}_dataset.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)
        total += len(dataset)
        print(f"  OK {name.ljust(15)} -> {out_path.name}  ({len(dataset)} items)")

    print(f"\n  Total: {total} products generated")
    print(f"  Output: {OUT_DIR}")
    print("")

    for name, dataset in datasets:
        s = dataset[0]
        print(f"\n--- {name} sample ---")
        print(f"  ID:     {s['id']}")
        print(f"  Brand:  {s['metadata']['brand']}")
        print(f"  Name:   {s['metadata']['name']}")
        print(f"  Price:  ${s['metadata']['price']}")
        print(f"  Weight: {s['metadata']['weight_kg']}kg")
        print(f"  Attrs:  {list(s['attributes'].keys())}")


if __name__ == "__main__":
    main()
