# Catalog commonality

Exact match on normalized brand + name + size (keys of at least 24 characters). Food rows tagged `exclude-from-bundles` are never retired. Pre-existing demo rows are never deactivated.

Unique normalized keys: 3007
Batch duplicates folded into an existing row: 209
Typical plan products (catalogCount / vendor overlap >= 3): 62

## Overlap matrix

| Vendor | Vendor | Shared keys |
| --- | --- | ---: |
| ccp-fl-2026 | fieldtex2024 | 0 |
| ccp-fl-2026 | medline | 108 |
| ccp-fl-2026 | medline-h5608-2026 | 104 |
| ccp-fl-2026 | solutran2025 | 0 |
| ccp-fl-2026 | walmart | 0 |
| fieldtex2024 | medline | 1 |
| fieldtex2024 | medline-h5608-2026 | 0 |
| fieldtex2024 | solutran2025 | 0 |
| fieldtex2024 | walmart | 0 |
| medline | medline-h5608-2026 | 138 |
| medline | solutran2025 | 0 |
| medline | walmart | 0 |
| medline-h5608-2026 | solutran2025 | 0 |
| medline-h5608-2026 | walmart | 0 |
| solutran2025 | walmart | 0 |

UCare’s 57 coded names are print fragments shorter than 24 characters, so `ucare2025` shares 0 keys with every other catalog. The 92 name-only rows were not imported.

## Typical plan product core set

| SKU | Name | Catalogs |
| --- | --- | --- |
| 3401 | GeriCare Zinc Sulfate Tablets 50 mg Dietary supplement. | ccp-fl-2026, medline, medline-h5608-2026 |
| 3842 | Claritin 24-Hr Antihistamine Allergy Tablets 10 mg Helps relieve indoor and outdoor allergy symptoms. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1745 | GeriCare Magnesium Oxide Coated Tablets 400 mg Compare to the active ingredient in MAG-OX 400. | ccp-fl-2026, medline, medline-h5608-2026 |
| 3416 | Medline Flaxseed Oil Softgels 1000 mg Also a source of alpha-linolenic acid. | ccp-fl-2026, medline, medline-h5608-2026 |
| 4144 | Bisacodyl Laxative Tablets 5 mg Enteric coated. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1028 | Guaifenesin Mucus Relief Tablets 400 mg Helps thin and loosen mucus and relieve chest congestion. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1073 | Medline 70% Isopropyl Alcohol 16 oz. Topical first aid essential. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1076 | CareAll Petroleum Jelly 13 oz. Moisturizes rough, dry, chapped skin. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1089 | Medline Oral Digital Thermometer Results in 30 seconds. One-piece, snap-on protective cover. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1155 | Effervescent Denture Cleanser Tablets Compare to the active ingredient in Efferdent. | ccp-fl-2026, medline, medline-h5608-2026 |
| 2233 | Reliable 1 Vitamin D3 Softgels 2000IU Easier to swallow softgel. | ccp-fl-2026, medline, medline-h5608-2026 |
| 7500 | Stop Smoking GoodSense Stop Smoking Nicotine Gum 4 mg. Compare to the active ingredient of Nicorette gum. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1207 | Medline Extra Strength Pain Relief Tablets 250 mg acetaminophen, 250 mg aspirin plus 65 mg caffeine. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1216 | GoodSense Effervescent Pain Relief Tablets Compare to the active ingredients in Alka-Seltzer. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1217 | Geri-Lanta Antacid & Antigas Liquid 12 oz. Compare to the active ingredients in Regular Strength Mylanta. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1247 | Medline Remedy Specialized Skin Cream 4 oz. All-over body cream with 1.5% dimethicone. Scented. | ccp-fl-2026, medline, medline-h5608-2026 |
| 6234 | GeriCare Vitamin C Tablets 500 mg Also known as ascorbic acid. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1412 | Medline FitRight ActivEdge Bladder Pads Contoured shape with fabric-like backsheet. Light absorbency. 3.5” x 9”. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1419 | Medline FitRight ActivEdge Underwear for Women Odor & leak protection. Max absorbency. L/XL (40”-56” waist). | ccp-fl-2026, medline, medline-h5608-2026 |
| 1602 | Major Sugar-Free Sore Throat Spray 6 oz. Cherry flavor. Compare to the active ingredient in Chloraseptic. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1751 | ImmuBlast Immune System Chewable Tablets Compare to the active ingredients in Airborne. Citrus flavor. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1757 | True Plus Glucose Chewable Tablets 4g Raises low blood sugar and boosts energy. Orange flavor. | ccp-fl-2026, medline, medline-h5608-2026 |
| 1883 | Medline Adult Toothbrush Soft bristles are gentle on teeth and gums. Contoured handle. Wrapped. | ccp-fl-2026, medline, medline-h5608-2026 |
| 7289 | Health Star Melatonin Tablets 5 mg Dietary supplement. | ccp-fl-2026, medline, medline-h5608-2026 |
| 2301 | Night Time XStrength Pain Reliever Sleep Aid Caplets Compare to the active ingredients in Tylenol PM. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1020 | GoodSense Cough Drops 5.8 mg menthol. Cherry flavor. Compare to the active ingredient in Halls. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1891 | CURAD Adhesive Bandage Variety Pack First aid essential in assorted sizes. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1068 | Medline Sterile Cotton Gauze Bandage Gently stretches to conform to contours. 4.5” x 4.1 yd. roll. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-2126 | Medline Pistol Grip Reacher Extends your reach by 2 feet to grasp lightweight objects. 32” long. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-5001 | Medline 24-Inch Knurled Chrome Grab Bar Mounts directly to wall with included hardware. 300 lb. capacity. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1719 | Medline FitRight Aloe Quilted Personal Wipes Thick 8” x 12” wipes cleanse moisturize and soothe. Unscented. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1858 | Medline FitRight Aloe Personal Wipes Gentle aloe-based formula. Standard weight. 8” x 10”. Unscented. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-3758 | Gold Bond Medicated Diabetic Foot Cream 3.4 oz. Soothing relief for dry, cracked skin. 24 hours of moisture. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-4201 | Medline Ibuprofen Tablets 200 mg NSAID pain reliever and fever reducer. Coated for easier swallowing. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-5009 | InterPlak Rechargeable Toothbrush Replacement Head Push on and click in place. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-6665 | FLONASE 24-Hour Allergy Relief Nasal Spray Non-drowsy. 72 metered sprays. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-6671 | Mucinex DM 12-Hr Expectorant & Cough Tablets 600 mg guaifenesin, 30 mg dextromethorphan. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-6715 | Anbesol Max Strength Pain Relief Gel 0.33 oz. Maximum strength 20% benzocaine. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1033 | Reliable-1 Saline Nasal Spray 3 oz. Compare to the active ingredient in Ocean. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1077 | ReadyPrep PVP Povidone Iodine Prep Solution 4 oz. Effective first aid antiseptic. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-5007 | Conair Interplak Dental Water Jet Cordless, battery operated water jet flushes out plaque and food debris. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1195 | GoodSense Hemorrhoid Ointment 2 oz. Compare to the active ingredients in Preparation H Hemorrhoidal Ointment. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1205 | Medline Naproxen Sodium Tablets 220 mg Relief for up to 12 hours. Compare to the active ingredient in Aleve. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-7425 | Medline Acetaminophen Tablets 500 mg Pain reliever and fever reducer. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1231 | GeriCare Milk of Magnesia 12 oz. Compare to the active ingredient in Philips’ Milk of Magnesia. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1234 | Medline Senna Natural Laxative Tablets 8.6 mg Compare to the active ingredients in Senokot. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-6172 | Dr. Reddy’s Arthritis Pain Relief Gel 3.53 oz. Compare to the active ingredient in Voltaren Arthritis Pain Gel | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-8663 | Biofreeze Cold Therapy Pain Relief Gel 3 oz. Vanishing scent. Gel roll-on. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1546 | GoodSense Cough Drops 7.5 mg menthol. Compare to the active ingredient in Halls. Honey lemon flavor. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1557 | Swan Eczema Moisturizing Cream 7.3 oz. 1% colloidal oatmeal. Fragrance-free. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1732 | Major Lactase Dairy Digestive Aid Caplet 3,000 FCC Compare to the active ingredient in Lactaid Fast Act. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1776 | Diphenhydramine Antihistamine Tablets 25 mg Compare to the active ingredient in Benadryl Allergy Ultratabs. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1043 | CURAD Clear Waterproof Bandages Holds tight even when wet. 4-sided seal. 1” x 3”. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1044 | Medline Isopropyl Alcohol Prep Pads Medium pad saturated with 70% isopropyl alcohol. 1.125” x 2.375”. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-1637 | CURAD Sterile Non-Stick Pads Absorbent, non-stick pad protects minor cuts, scrapes. Medium 3” x 4”. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-2227 | Medline SparkleFresh Denture Adhesive Cream 2.4 oz. Compare to Fixodent. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-7322 | Sheffield Scar Gel 0.7 oz. Compare to active ingredient in Mederma Advanced Scar Gel. | ccp-fl-2026, medline, medline-h5608-2026 |
| CCP26-6719 | Neosporin + Pain Relief Antibiotic Ointment 1 oz. No sting. Bacitracin, neomycin, polymyxin B, pramoxine. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-6511 | CURAD Flex-Fabric Bandages Breathable woven fabric stretches and moves with you. 4-sided seal. Assorted sizes. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-3708 | Geri-Tussin DM Cough Suppressant Expectorant 16 oz. Compare to the active ingredients in Robitussin DM. | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-1418 | Medline FitRight ActivEdge Underwear for Women Odor & leak protection. Max absorbency. S/M (28”-40” waist). | ccp-fl-2026, medline, medline-h5608-2026 |
| MH26-6943 | Colgate Fluoride Toothpaste 4 oz. Great regular flavor. | ccp-fl-2026, medline, medline-h5608-2026 |
