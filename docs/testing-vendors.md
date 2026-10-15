# Requested testing vendors

The local seed adds the 17 supplied businesses to `vendure_demo_market_ops` on loopback PostgreSQL. It uses the sibling backend's existing application services without editing that project. All seed code, catalog data, output files and temporary assets stay in this frontend project.

Run from `E:\coding\farmers-market-platform-web`:

```powershell
# Preview the target and requested records without writes.
node scripts/seed-testing-vendors.cjs --dry-run

# Add missing records. Existing prices, stock, passwords and workflow data are preserved.
node scripts/seed-testing-vendors.cjs

# Independently check the saved records in a read-only transaction.
node scripts/seed-testing-vendors.cjs --verify

# Add or verify one vendor without processing unrelated businesses.
node scripts/seed-testing-vendors.cjs --seed --vendor=manna-roots
node scripts/seed-testing-vendors.cjs --verify --vendor=manna-roots
```

The existing persistent demo baseline must already exist. The script refuses other database names, remote hosts, production configuration and enabled providers. It does not reset the database, apply migrations or change existing schedules, applications, layouts, assignments or billing. The entire business import commits in one transaction. Retrying skips existing businesses, accounts and products, and does not restock existing inventory.

The data includes 78 products with USD prices, package sizes, descriptions and stock; 14 shared category facet values; one owner account and native commerce channel per business; protected product and stock ownership; directory profiles; local storefront records; approved market memberships and listings; and attendance, directory approvals and offerings for upcoming market occurrences. Manna Roots has its original four products plus ten additional juices and shots. Booth assignments are left for the existing layout workflow.

Each fictional owner email is `<vendor-slug>@example.test`. The account password is `local-identity-regression-only-password`, matching the existing local demo accounts. Naomi Williams and Steve Smith retain the supplied names. Other owner names, phone numbers and addresses are fictional.

Category membership overlaps through normal product facets. For example, Bakery includes Showbread Catering, Mummy’s Macarons, Grammies Crackers, Jake n Bake, Twice Baked Cafe and Sunflour & Crumb. Coffee & Drinks includes Manna Roots, Last Watch Coffee and Twice Baked Cafe. Produce includes Norma Jean’s Greens and 9-1 Produce Farm, while Fermented & Pickled Foods includes Pucker Up! and Anna’s Kimchi. Individual products can have multiple categories.

Brand colors, hex values and category codes are saved in each directory entry's `contact.branding` and `contact.categories`. Colors are also readable in manager notes. Showbread Catering uses cream as its unspecified secondary color. Anna’s Kimchi uses red as primary, white as secondary and green as accent. The existing storefront theme contract does not currently render these per-vendor brand colors.

The seed writes verified IDs, contacts, colors, local storefront hosts and category counts to `docs/testing-vendors.json`. Owner accounts sign in at [Admin](http://localhost:4322). Business storefronts use `http://<vendor-slug>.localhost:4321` with the normal local servers running:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Existing preorder windows determine when products appear in the market occurrence catalog. The seed preserves those windows. Vendor storefront catalogs can be browsed independently of market preorder windows.

The original 68-product import passed independent database verification and native API checks for all 17 owner logins, admin catalogs, inventory projections, storefront host resolution and public product catalogs. At that time, each of the four upcoming occurrences had 17 participating vendors and 68 offerings, totaling 272 offerings. A second seed run created zero duplicate vendors or products. These historical checks predate the ten additional Manna Roots products. Vendor-scoped seed reports are written to `docs/testing-vendor-<slug>.json` and leave the original full-import report intact.
