# Importing the real catalogue

Prepare `products.json`:
```json
{"products": [{"category": "rudraksha", "title": "Five Mukhi Rudraksha, Nepal, 20 mm", "slug": "five-mukhi-rudraksha-nepal-20mm",
  "shortDescription": "…", "body": "Truthful description: origin, size, how it was sourced…", "taxGroup": "GST_3", "returnEligible": false,
  "attributes": {"mukhi_count": 5, "rudraksha_origin": "Nepal", "bead_type": "Single bead", "bead_diameter_mm": 20, "certification_status": "None"},
  "variants": [{"sku": "RUD-5M-NP-20-001", "title": "20 mm", "pricePaise": "210000", "weightGrams": 8, "uniqueSpecimen": true, "options": {}, "attributes": {}, "openingStock": 1}]}]}
```
Dry run: `pnpm db:seed -- --import products.json --dry-run` (reports unknown categories, duplicate slugs/SKUs). Then without `--dry-run`. Products arrive as **drafts**: add original photos, check attributes and certificates, then publish (the publish checklist enforces completeness).
