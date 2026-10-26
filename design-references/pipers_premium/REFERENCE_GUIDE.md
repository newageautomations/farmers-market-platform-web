# Modern Farmhouse Premium Theme — Visual Reference Kit

**Reference identity:** the original Pipers Farm ecommerce designs documented by blubolt and Awwwards (historical). The old `pipersfarm.com` experience is no longer the same design; it has rebranded.

## What this kit contains

- `reference_gallery.html`: visual gallery with original remote screenshots and labels; open with an internet connection.
- `image_sources.json`: exact screenshot image URLs, provenance, and purpose.
- `download_references.ps1`: optional Windows PowerShell command to save a local screenshot copy in `references/` (some sites may block automated downloads).
- `CODEX_HANDOFF.md`: the page-by-page theme specification and safe implementation boundaries.
- `references/`: populated if you run the downloader successfully.

**Note:** The imagery is **linked, not embedded** in the downloaded files. Screenshots could not be fetched into this execution environment. The PowerShell helper lets you make a local snapshot on your own machine, subject to the source website allowing downloads. The gallery can also display remote screenshots online without downloading.

## Primary design references

### P01: Photographic hero + transparent overlay header
![Photographic hero + transparent overlay header](https://a.storyblok.com/f/162198/4210x2106/8be16dfb51/pipers-farm-min.jpg)
**Reference class:** Original Pipers Farm · **Priority:** Essential
**Learn from it:** Homepage hero, announcement strip, navigation over photographic imagery; strong contrast via scrim
**Publisher:** https://blubolt.com/case-study/pipers-farm-shopify-blubolt

### P02: Centered text-on-photo seasonal campaign
![Centered text-on-photo seasonal campaign](https://assets.awwwards.com/awards/submissions/2021/10/615d9791ec7c5072863310.png)
**Reference class:** Original Pipers Farm · **Priority:** Essential
**Learn from it:** Alternate hero overlay typography, CTA border, typography hierarchy
**Publisher:** https://www.awwwards.com/sites/pipers-farm

### P03: Desktop editorial category/promo tiles
![Desktop editorial category/promo tiles](https://a.storyblok.com/f/162198/1176x600/472bfa31ef/after-2.jpeg/m/2000x0/)
**Reference class:** Original Pipers Farm · **Priority:** Essential
**Learn from it:** Homepage/category photography-led tiles, offset text blocks and circular arrows
**Publisher:** https://blubolt.com/case-study/pipers-farm-shopify-blubolt

### P04: Mobile editorial cards and circular arrows
![Mobile editorial cards and circular arrows](https://a.storyblok.com/f/162198/376x812/fa241c11f6/phone-1-2.jpeg/m/560x0/)
**Reference class:** Original Pipers Farm · **Priority:** Essential
**Learn from it:** Mobile tile stacking, generous typography and clickable arrow affordances
**Publisher:** https://blubolt.com/case-study/pipers-farm-shopify-blubolt

### P05: Product detail: gallery, purchase column, accordions
![Product detail: gallery, purchase column, accordions](https://a.storyblok.com/f/162198/1632x2067/14f7ff47a8/pdp-2.jpeg/m/1400x0/)
**Reference class:** Original Pipers Farm · **Priority:** Essential
**Learn from it:** Product detail layout, image gallery, quantity stepper, purchase action, disclosure dividers
**Publisher:** https://blubolt.com/case-study/pipers-farm-shopify-blubolt

### P06: Product storytelling photographic gallery
![Product storytelling photographic gallery](https://assets.awwwards.com/awards/external/2021/11/618528574c90e243927581.jpg)
**Reference class:** Original Pipers Farm · **Priority:** Useful
**Learn from it:** Gallery hierarchy, close-up lifestyle product photography, generous edge-aligned crops
**Publisher:** https://www.awwwards.com/inspiration/cranberry-port-sauce-pipers-farm-pipers-farm

### P07: Image-overlaid copy card, editorial positioning
![Image-overlaid copy card, editorial positioning](https://mycodelesswebsite.com/wp-content/uploads/2024/06/Pipers-Farm-Farm-Websites.jpg)
**Reference class:** Original Pipers Farm — different era · **Priority:** Useful
**Learn from it:** Secondary hero composition with floating light copy panel, not a mandatory design
**Publisher:** https://mycodelesswebsite.com/farm-websites/

### P08: Image-first product category mosaic
![Image-first product category mosaic](https://web-tips.co.uk/media/2019/10/pipers-farm-referral-code-discont-first-order-coupon.jpg)
**Reference class:** Original Pipers Farm — older design · **Priority:** Optional
**Learn from it:** Optional category-image mosaic; ignore the promotional popup and older header design
**Publisher:** https://web-tips.co.uk/pipers-farm-referral-code-10-off-discount/

### C01: Warm cream + dark forest green footer system
![Warm cream + dark forest green footer system](https://assets.awwwards.com/awards/element/2023/02/63fd4d090023b365668416.jpg)
**Reference class:** Complementary — NOT Pipers Farm · **Priority:** Essential
**Learn from it:** Footer column rhythm, social/legal links, oversized brand wordmark treatment; adapt to existing real links
**Publisher:** https://www.awwwards.com/inspiration/footer-logo-design-real-noni

### C02: Warm farm-to-table cart and checkout
![Warm farm-to-table cart and checkout](https://mir-s3-cdn-cf.behance.net/project_modules/2800_opt_1/85dd10143577455.627d3aea1e3a2.png)
**Reference class:** Complementary — NOT Pipers Farm · **Priority:** Essential
**Learn from it:** Cart/checkout grouping, warm neutrals, tidy order summary and inputs; do not copy fake checkout logic
**Publisher:** https://www.behance.net/gallery/143577455/Farm-To-Table-Website-Design

### C03: Shop: product grids and filters
![Shop: product grids and filters](https://mir-s3-cdn-cf.behance.net/project_modules/max_632_webp/1f3e9150222875.625979263f532.png)
**Reference class:** Complementary — NOT Pipers Farm · **Priority:** Useful
**Learn from it:** Functional category/filter positioning and image-centric product grid; premium styling comes from Pipers sources
**Publisher:** https://www.behance.net/gallery/50222875/Agricom-Agriculture-Organic-Food-WordPress-Theme

## How to use in Codex

1. Give Codex this entire directory/ZIP along with `CODEX_HANDOFF.md`.
2. If possible, run `download_references.ps1` so Codex can inspect local JPG/PNG files directly.
3. Cite references by ID in the implementation instructions (`P01`, `P03`, `P05`, `C01`, `C02`).
4. Verify that Codex can actually read the visual references. When images are unavailable, it must follow the written specifications and report the limitation, rather than claiming it saw them.
5. Treat references as *inspiration*, not assets to ship or layouts to clone. Use vendor-authorized product and farm photography already imported into Vendure.

## Provenance & boundaries

P01–P06 reference the historical Pipers Farm presentation; P07–P08 show different historical treatments; C01–C03 are clearly identified complementary sites/design concepts. Avoid the Pipers Farm logo, imagery, copy and distinctive trade dress in the actual product. Do not claim these are screenshots of the current site.
