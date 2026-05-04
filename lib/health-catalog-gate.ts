/**
 * Human health OTC catalog boundaries: exclude pet, fishing, household, general retail,
 * and other items that don't belong in a health-benefits product shop.
 * Used by Walmart imports and cleanup scripts.
 */

const EXCLUDE_SUBSTRINGS = [
  "dog food",
  "cat food",
  " for dogs",
  " for cats",
  " for dog",
  " for cat",
  " puppy formula",
  " kitten formula",
  "puppy food",
  "kitten food",
  "pet food",
  "dry dog food",
  "wet dog food",
  "dog treat",
  "cat treat",
  "cat treats",
  "dog treats",
  "dog biscuit",
  "dog chew",
  "purrfect",
  "purina",
  "pedigree dog",
  "pedigree®",
  "iams dog",
  "iams cat",
  "blue buffalo",
  "fancy feast",
  "friskies",
  "meow mix",
  "sheba ",
  "temptations cat",
  "9lives",
  "whiskas",
  "kibbles",
  "kibble n bits",
  "rachael ray nutrish",
  "nutro ultra",
  "nutro max",
  "royal canin",
  "science diet",
  "prescription diet",
  "milk-bone",
  "milk bone",
  "greenies",
  "busy bone",
  "pig ear",
  "bully stick",
  "rawhide",
  "cat litter",
  "kitty litter",
  "clumping litter",
  "bird seed",
  "bird food",
  "wild bird",
  "hamster food",
  "guinea pig food",
  "rabbit food",
  "aquarium heater",
  "fish tank filter",
  "turtle food",
  "reptile food",
  "fishing bait",
  "fish bait",
  "crappie bait",
  "bass bait",
  "trout bait",
  "live bait",
  "powerbait",
  "power bait",
  "soft bait",
  "plastic worm",
  "worm bait",
  "cricket bait",
  "minnow bucket",
  "tackle box",
  "fishing lure",
  "fishing hooks",
  "fishing hook",
  "fishing line",
  "fishing rod",
  "fishing reel",
  "ice fishing",
  "angler ",
  " deer corn",
  "antler dog",
  "pampers",
  "huggies",
  "luvs diaper",
  "baby wipes",
  "baby wipe",
];

/** Household, apparel, toys, vices, and beauty — not human OTC / clinical self-care. */
const QUESTIONABLE_RETAIL_SUBSTRINGS = [
  "toilet cleaner",
  "toilet bowl cleaner",
  "bathroom cleaner",
  "tub and tile",
  "soap scum",
  "scrubbing bubbles",
  "lysol",
  "clorox toilet",
  "drain cleaner",
  "oven cleaner",
  "dish soap",
  "dish detergent",
  "dishwasher pod",
  "dishwasher tablet",
  "laundry detergent",
  "fabric softener",
  "dryer sheet",
  "stain remover",
  "bleach",
  "floor cleaner",
  "swiffer",
  "mop refill",
  "mr clean",
  "febreeze",
  "febreze",
  "glade plug",
  "air freshener",
  "trash bag",
  "garbage bag",
  "paper towel",
  "toilet paper",
  "paper plate",
  "plastic fork",
  "aluminum foil",
  "plastic wrap",
  "storage bag",
  "ziploc",
  "scented candle",
  " yankee candle",
  "bath & body works",
  "weed killer",
  "lawn fertilizer",
  "mouse trap",
  "rat poison",
  "ant killer",
  "roach",
  "insect spray",
  "pool chlorine",
  "motor oil",
  "car wax",
  "windshield fluid",
  "lego ",
  "lego®",
  "barbie ",
  "hot wheels",
  "action figure",
  "nintendo switch",
  "playstation",
  "xbox ",
  "video game",
  "nerf ",
  "iphone case",
  "phone case",
  "glass screen protector",
  "wine bottle",
  " red wine",
  "white wine",
  " cabernet",
  "merlot ",
  "chardonnay",
  "beer,",
  " lager",
  " ipa ",
  "vodka",
  "whiskey",
  "bourbon",
  " tequila",
  " rum ",
  "cigarette",
  "cigars",
  "cigar ",
  "tobacco",
  "vape juice",
  "e-liquid",
  "lipstick",
  "mascara",
  "eyeshadow palette",
  "nail polish",
  "gel nail",
  "bronzer ",
  "makeup palette",
  "foundation makeup",
  "concealer makeup",
  "eau de parfum",
  "eau de toilette",
  "cologne spray",
  "perfume for women",
  "potato chip",
  "tortilla chips",
  "cheetos",
  "doritos",
  " oreo ",
  "candy bar",
  "m&m's",
  "skittles",
  "ground coffee",
  "coffee beans",
  "coffee k-cup",
  "k-cup",
  "keurig pod",
  "granola bar",
  "fruit snack",
  "fruit snacks",
  "vitaminwater",
  "vitamin water",
  "iced tea,",
  "popsicle",
  "ice cream",
  "frozen pizza",
  "pasta sauce",
  "spaghetti sauce",
  " ramen ",
  " mac and cheese",
  "cereal,",
  "box cereal",
  "dog toy",
  "cat toy",
  "pet carrier",
  "aquarium decoration",
];

function containsFishOilSupplement(t: string): boolean {
  return (
    t.includes("fish oil") ||
    t.includes("omega-3") ||
    t.includes("omega 3") ||
    t.includes("omega3")
  );
}

/** True if title/description suggests sport fishing (not fish-oil supplements). */
function isFishingGearContext(t: string): boolean {
  if (containsFishOilSupplement(t)) return false;
  if (/\bfishing\b/.test(t)) return true;
  if (t.includes("bass pro") && (t.includes("bait") || t.includes("lure"))) return true;
  return false;
}

/** Topical / rinse-off “beauty” products without clear oral OTC or Rx wording. */
function isTopicalCosmeticOrPersonalWash(name: string, t: string): boolean {
  const oralOrDrug = /(tablet|tablets|capsule|capsules|caplet|softgel|gummies?|chewable|lozenge|dietary supplement|supplement facts|rx\b|prescription|ointment \d|cream \d.*%|hydrocortisone|clotrimazole|miconazole|ketoconazole|dandruff treatment|medicated shampoo|antifungal)/i.test(
    `${name} ${t}`
  );
  if (oralOrDrug) return false;

  const topical = /(body wash|body lotion|hand lotion|face lotion|facial serum|face serum|skin cream|body cream|hair mask|shampoo|conditioner|cleanser|face wash|body scrub|shower gel|bubble bath|self-tanner|tanning lotion)/i.test(
    t
  );
  if (!topical) return false;

  // Allow clearly medicated topicals (extra guard)
  if (
    /(psoriasis|eczema cream|anti-itch|antibacterial wash|benzoyl peroxide|salicylic acid.*wash)/i.test(
      t
    )
  ) {
    return false;
  }

  return true;
}

/**
 * SKUs from the in-repo seed catalog (e.g. VIT-D3-1000), not mass-market GTIN imports.
 * These are excluded from bulk “questionable retail” deactivation.
 */
export function isCuratedSeedStyleSku(sku: string): boolean {
  const s = sku.trim();
  if (/^\d{8,14}(-\d+)?$/.test(s)) return false;
  if (/^wm-/i.test(s)) return false;
  return /^[A-Za-z]{2,5}-/.test(s);
}

/**
 * Products that should not appear in a human health benefits shop.
 */
export function isNonHealthRetailProduct(
  name: string,
  description?: string | null
): boolean {
  const t = `${name} ${description ?? ""}`.toLowerCase();
  if (isFishingGearContext(t)) return true;
  for (const s of EXCLUDE_SUBSTRINGS) {
    if (t.includes(s)) return true;
  }
  for (const s of QUESTIONABLE_RETAIL_SUBSTRINGS) {
    if (t.includes(s)) return true;
  }
  if (isTopicalCosmeticOrPersonalWash(name, t)) return true;
  return false;
}

/** True when this row should be deactivated by cleanup (respects curated seed SKUs). */
export function shouldDeactivateFromHealthCatalog(
  sku: string,
  name: string,
  description?: string | null
): boolean {
  if (isCuratedSeedStyleSku(sku)) return false;
  return isNonHealthRetailProduct(name, description);
}

export type SiteCategorySlug =
  | "vitamins"
  | "supplements"
  | "monitoring"
  | "pain-relief"
  | "respiratory"
  | "sleep-mood"
  | "cognitive"
  | "mobility";

function hasOralSupplementCue(name: string, t: string): boolean {
  return (
    /(tablet|tablets|capsule|capsules|caplet|caplets|softgel|softgels|gummy|gummies|chewable|lozenge|liquid supplement|dietary supplement|supplement powder|effervescent)/i.test(
      t
    ) ||
    /\b\d+\s*(mg|mcg|iu)\b/i.test(name) ||
    /(\(\d+\s*mcg\)|\d+\s*iu\))/i.test(name)
  );
}

/**
 * High-confidence category fix from product name (does not inspect Walmart taxonomy).
 */
export function inferSiteCategoryFromName(
  name: string
): SiteCategorySlug | null {
  const t = name.toLowerCase();
  if (isNonHealthRetailProduct(name)) return null;

  if (
    /(blood pressure|glucose meter|blood sugar meter|pulse ox|oximeter|thermometer|test strips|cholesterol test|ketone test|stethoscope)/i.test(
      name
    ) ||
    /(bathroom scale|body scale|digital scale|weight scale|smart scale|talking scale|weighing scale|kitchen scale)/i.test(
      name
    )
  ) {
    return "monitoring";
  }
  if (
    /(\bibuprofen\b|acetaminophen|\baspirin\b|naproxen|pain relief caplet|pain relief tablet|pain relief gel|icy hot|bengay|lidocaine patch|arthritis cream)/i.test(
      t
    )
  ) {
    return "pain-relief";
  }
  if (
    /(nasal spray|cold & flu|cough suppressant|expectorant|chest congestion|vapor rub|neti pot|sinus relief|mucus relief)/i.test(
      t
    )
  ) {
    return "respiratory";
  }
  if (
    /(melatonin|sleep aid|sleep gummy|nighttime sleep|zzzquil|diphenhydramine hcl|doxylamine)/i.test(
      t
    ) &&
    !t.includes("pet")
  ) {
    return "sleep-mood";
  }
  if (
    /(\bvitamin\b|multivitamin|\bvit d\b|vitamin d|\bvit c\b|vitamin c|b12|b-12|folic acid|biotin|prenatal vitamin)/i.test(
      t
    ) &&
    hasOralSupplementCue(name, t) &&
    !t.includes("dog") &&
    !t.includes("cat") &&
    !t.includes("pet")
  ) {
    return "vitamins";
  }
  if (
    /(ginkgo|bacopa|lion'?s mane|phosphatidylserine|ashwagandha|nootropic)/i.test(t) &&
    (hasOralSupplementCue(name, t) ||
      /\b(extract|powder|capsule|capsules|root|liquid focus)\b/i.test(t))
  ) {
    return "cognitive";
  }

  return null;
}
