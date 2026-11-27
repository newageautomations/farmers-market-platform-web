# Theme page structure standard

This is the structure every market website theme should follow, starting with Pasture. It says how each page is composed, where it is linked from, what managers can place on it and how the editor presents it. A new theme adopts it by adding an entry to `themePageStructures` in `packages/theme/src/theme-page-structure.ts` and styling the shared markup in its own stylesheet. Themes without an entry keep the older behaviour until they are migrated.

Pasture is the reference implementation. Where this document says "the theme", read "a theme that has opted in".

## How a theme opts in

`themePageStructure(theme)` returns one object that the editor, the storefront pages and the starter content all read. A theme sets:

| Setting                | Meaning                                                                                                                                               | Pasture                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `lockedTopPages`       | Pages whose own content must open the page. Nothing can be added above it.                                                                            | Vendors, Applications             |
| `headingOnlyPages`     | Pages that open with their own editable heading instead of a hero section.                                                                            | Policies, Terms & Conditions      |
| `noClosingPages`       | Pages that never show the closing invitation.                                                                                                         | Policies, Terms & Conditions      |
| `footerOnlyPages`      | Pages linked from the footer only, never the header.                                                                                                  | FAQ, Policies, Terms & Conditions |
| `shortHeroPages`       | Pages whose starting hero image is short. `shortHeroHeight` sets the pixels.                                                                          | Contact, FAQ at 220px             |
| `marketTermsPage`      | The market has a Terms & Conditions page.                                                                                                             | Yes                               |
| `marketContactForm`    | The market Contact page has an inquiry form the manager can edit.                                                                                     | Yes                               |
| `aboutStarter`         | Switching on About fills it with an example page.                                                                                                     | Yes                               |
| `shopPagination`       | `numbered` paging or the older `summary` paging.                                                                                                      | Numbered                          |
| `sectionImageShape`    | Image with Text offers an image shape.                                                                                                                | Yes                               |
| `ctaButtonStyle`       | The Call-to-Action Banner offers a button style.                                                                                                      | Yes                               |
| `sectionSpaceDefault`  | Default space above and below every custom section, in pixels. `null` turns the rule off.                                                             | 32                                |
| `shopAvailabilityNote` | Shop cards say "Available at this market". When off, only unavailable products get a note. Either way, 5 or fewer left shows a red "N left in stock". | Off                               |
| `marketStarterText`    | Market Policies and Terms & Conditions start with written example text.                                                                               | Yes                               |
| `marketDayBoothCards`  | Pointing at a booth on the Market Day map shows that vendor's card.                                                                                   | Yes                               |

The backend repeats one of these rules: `StorefrontContactService.submit` lists the themes whose market Contact page accepts messages. Add the new theme there too.

## Pages

### Homepage

- The theme's own homepage sections come first, and managers can reorder them and add library sections.
- Every library section sits in the same content column as the theme's sections. A section never runs edge to edge unless the manager picks **Full screen width** for its background.
- Every custom section (Text, Image with Text, Call-to-Action Banner, Image Banner, Image Gallery, Feature Grid) has space above and below it, on every page. The default is the theme's `sectionSpaceDefault` (32px on Pasture), so no section ever touches the one next to it. Where two sections meet, the gap is the larger of their two settings, not the sum.

### Shop

- Paging is a chevron to the first page, up to three page numbers around the current page, and a chevron to the last page. The chevrons are the same glyphs the dropdown menus use. There are no one-step previous and next controls, because the page numbers already do that. The first-page chevron is dimmed on the first page and the last-page chevron on the last.
- The shop never shows a product count or a "Page X · 1 to 20 of N" line.
- The shared `NumberedPagination` renders this. Themes style it but don't rebuild it.
- A product card says nothing about availability when the product can be added: an enabled Add to cart is enough. Only products that can't be added (or have no upcoming market) show a short note, next to the disabled button.
- Filter options (categories, subcategories and vendors) center their name, their count and their selection icon on one line. Pasture trims each label to its cap height (`text-box: trim-both cap alphabetic`) with a fixed minimum row height, because the body font's tall ascender otherwise sits the letters low. A theme with its own filter styling must check that the text and the icon line up to the pixel.

### Vendors and Applications

- The vendor directory, and the list of open applications, always opens the page. Managers can add sections below it but not above.
- The editor has no Add Section above these blocks. Sections saved above them earlier are still listed, so the manager can move or delete them.

### About (Our story)

- When a manager first switches About on and the page is empty, it fills with an example page: the hero, a "How our market began" story section, the closing invitation, then Image with Text ("The people behind the market"), a Feature Grid ("What makes our market special"), an Image Gallery ("A morning at the market"), a Text section ("Our mission") and a Call-to-Action Banner pointing to Market Dates.
- The example text talks to the manager. It says what belongs in each section, so the manager builds the page by replacing words and photos.
- The example is only added if About has nothing in it. Existing About pages are never overwritten.
- The content is defined in `aboutStarterSections` in `packages/theme/src/website-page-starters.ts`.

### Writing starter text

Example text for Policies, Terms & Conditions and any future page is written as the market speaking to its shoppers, in plain general terms a market could publish as is. It never uses em dashes. It never mentions how the website is built (no "platform", "storefront", "channel" and similar terms). The Policies and Terms text lives in `marketStarterText` in `packages/theme/src/policies.ts`.

### Contact

- The page starts with a short hero section (image height 220px).
- The page has a contact form, and visitors don't need an account to use it. Each message is saved for the market and creates a **New website message** notification for the managers. The notification opens **Website › Website messages** (`/market/contact-submissions`), where the manager reads the message and marks it read or unread.
- In the editor the form is a dropdown in the side panel. Its fields are rows you drag to reorder, as with Policies. Selecting a field opens its label, its required switch and, for a dropdown, its choices.
- Full name, email and message are always on the form and always required, so every message can be answered. Phone and subject can be removed. Managers can add their own fields: short answer, long answer and dropdown. There is no checkbox field. The form holds up to 12 fields, and a dropdown up to 10 choices.
- On wider screens (above 760px) the form has two columns. The message and any long-answer field span both columns; every other field takes one. Phones show one column.
- A validation message such as "Please complete this field." sits in the gap below its field. Showing or hiding one never moves the fields below it.
- Clicking into the message (or any long answer) doesn't highlight it: like the single-line fields, it keeps its color and gets no outline.
- Answers to the manager's own fields are saved with a copy of each field's label, so older messages still make sense after the form changes.
- If every public contact detail is empty, the **Public contact information** row shows an "Add details" tag, and its settings explain what to fill in. Once any detail is filled in, the tag goes away.

### FAQ

- The page starts with a short hero section (image height 220px).
- The questions sit in a **Questions** dropdown in the side panel. They're rows you drag to reorder within that list, or move with the arrow keys on a row's grip, the same as Policies. There are no up and down arrow buttons. Selecting a question edits it in the settings panel.
- FAQ is linked from the footer only.

### Policies

- There is no hero section. The page opens with its own heading ("Our policies"), which the manager edits in **Policies page**, along with an optional introduction.
- A new market Policies page comes with its four policies already written: Preordering & Pickup, Order Changes & Cancellations, Refunds & Returns, and Product Information & Allergens. A policy that is still blank (on a site set up before this) shows a **Use example text** button in its settings.
- There is no closing invitation.
- Policies are rows you drag to reorder in the **Policies** dropdown.
- Policies are linked from the footer only.

### Terms & Conditions

- Terms & Conditions is a page in the **Preview page** list, with its own **Enable page** switch. It is not a row in the side panel.
- It is built like Policies: a heading the manager can edit, an optional introduction and titled terms that you drag to reorder. There is no hero section and no closing invitation.
- A new Terms & Conditions page comes already written, with six terms: Using this website, Preorders and payment, Our vendors and their products, Market dates and cancellations, Your information, and Changes to these terms. A blank term shows a **Use example text** button.
- Only terms that have both a title and text are shown on the public page.
- It is linked from the footer only.
- The market version is saved as `marketTerms`. Vendor websites keep their own plain-text terms and the checkout acceptance that goes with them, which this does not change.

### Market Day

Market Day replaces the homepage while a market is open.

- **Hero:** the theme's normal hero, in its everyday colors. Market Day never recolors the background, the headline sign, the text or the buttons. The only additions are a small "Market day" tag above the headline and the countdown below the buttons. Like the normal hero, it slides up under the see-through header.
- **Buttons:** the primary button reads "Find a booth" with the same right arrow, placed after the label, that the normal hero's primary button uses. It doesn't use a map pin. The secondary button is "Today's vendors".
- **Countdown:** it is styled as part of the theme, not as a plain card. On Pasture it is painted on a wooden sign like the headline: green slats, a nail in each corner, slat ends sticking out of both sides and white lettering. The digits sit on cream plates, and the progress bar is a sunflower-yellow stripe in a dark green groove. The sign is only as wide as its contents (the clock and the opening-hours line), never stretched across the column. A theme with a signature headline treatment should reuse it here.
- **Venue line:** it uses the theme's heading color.
- **Booth cards on the map:** pointing at a booth fades in that vendor's card, built from the same classes as the "Vendors today" cards. The booth name sits in the top-left corner. Below it, the vendor's picture (or their initial) sits beside the vendor's name and main category, and a **Visit storefront** link closes the card. The vendor's name is plain text, not a link. Pointing at the card tilts the picture with the same eased 320ms transition as the "Vendors today" cards. The card shows no booth size and no "Assigned to…" line. It stays open while the pointer is on it so the link can be clicked, and closes shortly after the pointer leaves. A booth without a vendor shows its name and "Open booth".
  - `MarketMap` has an opt-in `renderHoverCard` prop. Without it, the map keeps its original read-only details tooltip, which the manager's tools still use.
  - The public map may not include a vendor's id, so the card finds today's vendor by id first, then by name.
  - Category names show as written; an all-caps code such as `FRESH_PRODUCE` reads "Fresh produce".
- **Vendors today:** each vendor card shows the vendor's main category where "Visit their booth on market day" used to be. Its link reads **Find their booth (A01) →**, and the whole card is that link. It scrolls to the map, moves the map to that booth, selects it and opens its booth card as if it were pointed at, instead of opening the vendor's shop offerings. The opened card follows the booth when the map is zoomed. A vendor with no booth on the map shows "Not on today's map" and isn't a link. The category and booth come from the published map, so a vendor without a booth also has no category on its card. The card matching lives in `lib/market-day-booths.ts`; `MarketMap` takes a `locateId` to move to a booth (and open its card) and calls `onLocated` once done, so the caller clears it.
- **Vendors page during Market Day:** while a market is in Market Day mode, `/vendors` defaults to that date until it ends (a requested `?date=` still wins). On that date the cards use the same booth links, pointing at `/?marketDay=<id>&booth=<elementId>#market-day-map`, which opens the booth on the homepage map, and the summary link reads "See today's market map" instead of linking to the shop, which no longer sells a started date. This applies on every theme; only themes with `marketDayBoothCards` open a card on arrival. Other dates keep their shop offerings links.

## Sections

### Image with Text

- The image has a shape picker. It uses the same shapes as the other image shape controls: straight edges, rounded, square, rounded square, circle, dome, star and single rounded corner. The picker is in the Image block's settings and in the section's Layout group.
- The shape applies only when the image sits beside the text. When the image is the full-width background, it always fills the section, and so does the empty-image placeholder.
- **Framed** is a card with no outline. A border that only spans the content column looks like a stray divider. The section spacing keeps it apart from its neighbours.

### Image Gallery

- **Add photograph** opens the image library straight away. The photo is added once the manager picks one, so no empty row with its own dropdown appears.
- The carousel layout stays in the content column with the same side padding as other sections.

### Feature Grid

- The icon picker shows each icon itself, drawn the way the storefront draws it, not its name.

### Call-to-Action Banner

- It has a **Button style** setting: Filled or Outlined. Until the manager picks one, the button follows the background as before (Outlined on the theme color).

### Space above and below, on every custom section

- Each custom section has a **Space above and below** slider, from 0 to 160px in 4px steps. It starts at the theme default (32px on Pasture), and 0 removes the space. It sits in **Size & spacing** for Text, Image with Text and the Call-to-Action Banner, and in **Layout** (beside Section spacing, which sets the space inside the section) for the Image Banner, Image Gallery and Feature Grid.

### Background color, on every section that has one

- The picker shows each choice as the color it is on the selected theme and palette, labelled Page background, Light card and Theme color. The internal names (paper, surface, ink) never appear.
- Pasture's colors are the page mint, the cream card and the leading color for the chosen palette. Other themes use their palette's background, surface and primary.
- A background on **Full screen width** fills the window. Page background stays the page's own color on purpose, so with it a full-width background looks the same as a contained one. Themes don't give Page background a separate tint to make the width visible; managers who want a full-width band pick Light card or Theme color.

## Header and footer

- Header: Shop, Market Dates, Vendors, Become a Vendor, Contact, and About when it is on.
- Footer: everything in the header, plus FAQ, Policies, Terms & Conditions and Your account, each shown only when its page is on.
- A theme decides header links by filtering the shared navigation with `footerOnlyPages`, not by writing its own list.

## Shared pieces to reuse

| Piece                                                              | Where                                                | Use                                                                                          |
| ------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `themePageStructure`, `sectionBackgroundSwatches`                  | `packages/theme/src/theme-page-structure.ts`         | All of the theme's page rules, and the color behind each background choice.                  |
| `aboutStarterSections`                                             | `packages/theme/src/website-page-starters.ts`        | The example About page.                                                                      |
| `WebsiteRailList`                                                  | `apps/admin/src/WebsiteRailList.tsx`                 | Drag-to-reorder rows for a page's own items: policies, terms, FAQ questions and form fields. |
| `SectionBackgroundField`                                           | `apps/admin/src/WebsiteEditorContext.tsx`            | The background color picker with swatches.                                                   |
| `MarketMap` `renderHoverCard`, `BoothVendorCard`                   | `packages/ui/src/MarketMap.tsx`, `MarketDayLive.tsx` | The Market Day booth card on the map.                                                        |
| `SectionSpaceField`, `websiteSectionSpaceStyle`                    | `WebsiteEditorContext.tsx`, `packages/theme`         | The Space above and below slider, and the CSS variable (`--website-space-block`) it sets.    |
| `marketStarterText`, `defaultMarketPolicies`, `defaultMarketTerms` | `packages/theme/src/policies.ts`                     | Written example Policies and Terms.                                                          |
| `PolicyListPage`                                                   | `apps/storefront/src/components/`                    | The Policies and Terms & Conditions page body.                                               |
| `NumberedPagination`                                               | `apps/storefront/src/components/ui/`                 | Numbered shop paging.                                                                        |
| `ContactForm` with `fields`                                        | `apps/storefront/src/components/`                    | The market inquiry form, built from the manager's fields.                                    |
| `ContactSubmissions` with `createMarketContactApi`                 | `apps/admin/src/vendor/`, `packages/api`             | The manager's Website messages page.                                                         |

A theme only adds styling for these, scoped to its own site class (for example `.pasture-site`), in its own stylesheet. It doesn't add new markup for them.

## Saved data

Every new setting is optional, so websites saved before it was added keep working:

- `presentation.imageShape` on Image with Text, `presentation.buttonStyle` on the Call-to-Action Banner, and `presentation.spaceBlock` (0 to 160) on every custom section, in the shared section contract. That contract is byte-identical in the web and backend repositories.
- `marketTerms`, which has the same shape as `policies`. It is accepted only on market websites.
- `contact.form.fields`. When it is missing, the default fields are used: full name, email, phone, subject and message.

Market contact messages are stored in `storefront_contact_submission`, with `market_id` and `answers` added by migration `1798200000000-MarketStorefrontContact`. Each row belongs to exactly one vendor or one market.

## Pasture status

Pasture follows everything above. Until the local backend has the new migration and has been restarted, the editor can't preview or save these new settings: image shape, button style, space above and below, Terms & Conditions content and form field changes. Its preview check still uses the old rules until then.
