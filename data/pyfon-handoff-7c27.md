# Pyfon Platform: Handoff 7c27 (22 Oct 2026). STANDALONE. Replaces 7c24 and 7c26.
Read with `pyfon-platform-prompt-v3.md`. This file is newer and wins. Delete 7c24 and 7c26 from Project knowledge and keep only this.

## 0. FIRST JOB IN THE NEW CHAT
1. Ask PASS/FAIL once for: 7c27 mco cart coupon box (built last, untested until he reports).
2. Still never confirmed: (a) 7c14 city pages, (b) 7c15 content API. He said "not urgent". Ask once more near Phase 11.
3. His chat credits are very limited. ONE combined reply per phase group, many short paste blocks. He often replies only "pass"/"done". Do small fixes inside the same reply as the next phase.
4. Next choice (ask him once): (A) wire TriM and M & Co. to the Site builder (BV4, section 9), (B) real photos and placeholder cleanup, (C) B1 part 2 then deploy. Suggest (C) B1 part 2 + Phase 10 dealers if he has no preference.

## 1. The business
Pyfon Brands: graphic design and printing (paperwork, indoor/outdoor ads, posters, laser/UV/heat-press printing, embroidery) and merchandise branding. Sells via WhatsApp catalog in KES. Three partners (Creative, Production, Finance), dealers later. Emlabs is his tech company and owns the technology. Every interface shows two footer lines from `packages/ui` `Footer`: "Operated by Pyfon Brands" and "Built and owned by Emlabs ? ? Emlabs. All rights reserved." Free tiers only until the business has run 3 to 4 months. Never copy competitor names, logos, wording or images.

## 2. Environment
Windows, PowerShell 5.1, VS Code, Node 24, Git. Repo `C:\Users\Labs\Documents\pyfon`, private GitHub `MoRanauk/pyfon`, branch `main`. DB over WebSocket 443 (`DB_DRIVER=neon-ws`). Backend `http://localhost:3000`. Migrations in `backend\migrations`; latest `035_coupon_uuid`.
IMPORTANT: `users.id` is a UUID, not a number. Check the real column type (information_schema) before writing any migration that references users or orders.

`backend\.env` keys: DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGINS (list 5173 to 5177), DB_DRIVER, CLOUDINARY_URL, OPENWA_URL, OPENWA_SESSION, OPENWA_KEY, OPENWA_KEY_HEADER, BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, CF_ACCOUNT_ID, CF_AI_TOKEN (optional CF_AI_MODEL), VAULT_PASSPHRASE. Optional: BREVO_SMS_SENDER, BREVO_WA_SENDER, BREVO_WA_TEMPLATE_ID. Still to add: SITE_URL, SMS_GATEWAY_URL, SMS_GATEWAY_KEY, SENTRY_DSN.
Vault passphrase: not the four exposed strings. Never ask him to paste a passphrase; use `Read-Host -AsSecureString`. Brevo email works (Gmail sender may hit spam until a domain is bought).

Interface codes: mco, prestige, trim (customer); m3-creative, m3-production, m3-finance (partner); dev; vendor. Header `X-Interface: <code>`.
Accounts: developer moranauk@gmail.com; partners pyfonbrands@gmail.com (creative), nowmonari@gmail.com (production), laterthomaso@gmail.com (finance); dealer1@example.com; fake test customers. He tests mail with ezra.o.monari@gmail.com. No partner has a phone saved (`set-phone.js`). WhatsApp mode `direct`. Order WhatsApp number 0794802462.

Run commands: backend `npm run dev` in `backend` (restart after .env change or new route); migrations `npm run migrate` in `backend`; apps from repo root: M3 Labs `npm run dev -w @pyfon/m3labs` (5174); mco `-w @pyfon/mco-brands` (5173); gift shop `-w @pyfon/prestige-m` (5175); TriM `-w @pyfon/trim-atelier` (5176); blank app `-w @pyfon/studio` (5177). Ad hoc DB scripts: `node --env-file=.env src\scripts\<file>.js` from `backend`.

## 3. Stack and architecture
React + Vite frontends (Cloudflare Pages later), Node/Express (ES modules) on Render free later, Neon Postgres, Cloudinary images, Brevo email, Cloudflare Workers AI (Haruno helper), Sentry later, free uptime monitor later. Monorepo: `backend/`, `apps/{mco-brands,prestige-m,trim-atelier,m3labs,studio}`, `packages/{ui,theme,api-client}`, `data/`.
M3 Labs is ONE app for the three partner desks AND the developer console (menus `apps/m3labs/src/partnerNav.js` and `devNav.js`).
- Route groups `backend/src/routes/groups.js`: `group(role)` = authenticate + requireRole. `/v1/customer`, `/v1/partner`, `/v1/dev` (+`/system/*`), `/v1/vendor`. Public: `/v1/auth`, `/v1/catalog`, `/v1/videos`, `/v1/dealers`, `/v1/help`, `/v1/content`, `/v1/track`. App wiring in `backend/src/app.js` (helmet, cors allowlist, rate limit 300/min, request logger).
- Helpers: `db/pool.js` (`query` returns `{rows}`), `db/tx.js` (`withTransaction`), `errors.js` (`HttpError(status, code, message, details)`, `asyncHandler`), `validate.js` (`parse(zod, data)`), `audit.js` (`audit(req, {action, entityType, entityId, actorUserId, details})`), `middleware/auth.js` (`authenticate`, `requireRole`; `req.user` has id, email, fullName, role, stage, interface), `req.interfaceCode` from X-Interface.
- Partner rules on the server: own logins; cover for another partner; two different partners per stage sign-off; three-key completion; rejection with reason; all-three approval for `price_change, product_delete, invoice_discount, csv_import, money_delete` (and coupons, see section 6); audit log. Developer cannot sign off or change prices.

## 4. Gift shop (`apps/prestige-m`, "Pyfon Gift Hub")
Files in `src`: `site.js`, `content.js` (NAVTREE, CONTENT, ContentProvider, wa()), `personalised.js` (PTREE, PCOLS), `cities.js`, `Deliver.jsx`, `Layout.jsx`, `Home.jsx`, `Sub.jsx` (listing for /shop and /c/:key; PARAMS for, occasion, flower, style, colour, delivery, node), `Crumbs.jsx`, `Product.jsx`, `Cart.jsx`, `Checkout.jsx`, `Series.jsx`/`PersonalisedRoute.jsx`, `DoYou.jsx` ("Do You" design-your-own, 7c23 PASS), `Orders.jsx`, `Track.jsx`, `Account.jsx`, `Bits.jsx`, `Help.jsx`, `askAi.js`, `helpTours.js`, `siteEdit.js` (engine v3). CSS `jx.css (jx-)`, `home2.css (hm-)`, `sub.css (sbp-)`, `bl.css (bl-)`, `deliver.css (dl-)`, `dy.css`, `od.css (od-)`. Unused/old: `AuthState.jsx`, `CartState.jsx`, `Shop.jsx`, `Collage.jsx`.
Routes: `/`, `/shop`, `/c/personalised`, `/c/:key`, `/deliver/:slug`, `/p/:sku`, `/cart`, `/checkout`, `/account`, `/orders`, `/track`, `*`.
State comes from `store.jsx` (`useAuth`, `useCart`, `useCatalog`); API from `api.js` (`api`, `API_URL`, `STORE`, `tokens`, `img`). Themes `prestige` (Her) and `prestigeHim`; Layout picks mood from `?for=`.
CSV `tags` vocabulary: `for:mum|wife-girlfriend|sister-friend|colleague-boss|her|him|friends|colleagues|dad|kids|couples`; `occasion:romantic|anniversary|get-well|graduation|congratulations|wedding|apology|sympathy|birthday|valentines|mothers-day|new-baby`; `flower:rose|carnation|lily|gerbera|chrysanthemum|sunflower|tulip`; `style:bouquet|vase|box|envelope|basket|heart|card`; `colour:red|pink|white|yellow|orange|purple`; `delivery:sameday|nairobi|anywhere`; `node:<slug>` and `placeholder`. Budget links `?price=u3|m3|m5|o8`. Add-ons tagged `addon`. Fresh items `delivery:nairobi` hide courier.
Personalised tree (7c22/24 PASS): Personalised > group > sub > leaf (Drinkware, Gift Sets, Accessories, Apparel, Office, Do You). Migration 032 `subcategories.parent_id`; `scripts/seed-personalised.js` makes 10 placeholders per leaf (SKU `PH-`, tag `placeholder`, listed in prestige and mco, NOT trim). Deep levels link via `node:` tags; renaming a deep node does not rename its tags. Placeholders are LIVE to customers: hide or delete before launch.

## 5. TriM Atelier (`apps/trim-atelier`) and M & Co. (`apps/mco-brands`)
- TriM: own black/ivory/gold design (`tz-`/`th-`), no Tz.jsx file. Files `Layout.jsx`, `Home.jsx` (slides in `site.js`), `Shop.jsx`, `Product.jsx`, `Cart.jsx`, `Checkout.jsx`, `Collection.jsx` (`/collection`), `Orders.jsx`, `Track.jsx`, `Account.jsx`, `Best.jsx`, `Swipe.jsx`, `cats.js`, `od.css`. Catalogue: 1 Pendant & Neckwear, 2 Eternal Bands, 3 Timepieces, 4 Haute Parfumerie, 5 Velvet Skin, 6 Objet d'Art & Accents; `subcategory` = brand; SKUs `TM-*`; luxury brands are `quote`.
- M & Co. (mco, 5173): uses its OWN `AuthState.jsx`/`CartState.jsx`/`CatalogState.jsx`; checkout is inside `Cart.jsx` (no Checkout.jsx); `App.jsx` has `Layout` and `LiteLayout` routes (cart, account, orders, track are in LiteLayout or Layout as patched). Has `Orders.jsx` (old class names `ocard/track`), `Track.jsx` (7c27), `Quote.jsx`, `Sell.jsx`, `CoBrand.jsx`, `Group.jsx`, `Info.jsx`, `FloatingVideo`, `PhoneField`. Shows Personalised placeholders.
- Neither TriM nor M & Co. is wired to the Site builder.

## 6. Orders, tracking, coupons (7c26 and 7c27)
- Customer orders: `routes/customerOrders.js` (POST /orders, POST /quote-requests, GET /orders, GET /quote-requests), `customerFiles.js`, `jobs/tracking.js` `buildStages`. WhatsApp text links to `SITE_URL/orders`.
- 7c26 PASS: My orders in gift + TriM (`Orders.jsx`, `/orders`), announcement bar remembers close 24h (localStorage `ann_closed`) in gift and TriM, thank-you "Track my order" link, checkout `Fld` focus fix.
- 7c26 part 2 PASS: public tracking `POST /v1/track` (`routes/publicTrack.js`; rate limit 12/15 min/IP; order ref + last 9 digits of phone + same shop; same 404 for wrong ref or phone; returns only ref, date, delivery label, cancelled flag, stages). `Track.jsx` and `/track` in all three shops; footer links.
- RULE: never define a component inside another component and use it as a tag (input loses focus each keystroke). Define at file level or call as a function.
- Coupons (7c27, PASS for create/approve/apply in gift and TriM checkout): migrations 033 (tables `coupons`, `coupon_approvals`, `coupon_redemptions`; `orders.coupon_code`, `orders.discount_kes`), 034 (percent cap 15), 035 (user columns to uuid). Backend `src/coupons.js` (`checkCoupon`, `couponDiscount`), `routes/customerCoupons.js` (`POST /v1/customer/coupons/check`, preview only), `routes/partnerCoupons.js` (`/v1/partner/coupons` list, create, `/:id/approve`, `/:id/disable`). Rules: percent max 15, fixed KES allowed, min order, max uses, date range, shop list, one use per customer, discount on items only (not delivery), recomputed on the server inside the order transaction. A new coupon is `pending` and becomes `active` only after all three partners approve (creator counts as one); any partner can disable; developers cannot manage coupons. Audited. `POST /orders` accepts `couponCode`; response has `discountKes`, `couponCode`; WhatsApp text has a "Coupon discount" line. M3 Labs `Coupons.jsx` (route `/coupons`, menu Shop > Coupons). Cart pages in gift and TriM tell the customer to enter the code at checkout. mco cart coupon box: BUILT 7c27 part 3, UNTESTED.
- Not done: the order e-mail/WhatsApp for quotes shows no coupon; no coupon report in Reports; old coupon rows from failed attempts may exist (status pending).

## 7. Site content, Site builder, Theme manager, Code vault, Partner Products
- Site content API (`routes/siteContent.js`): tables `site_content`, `site_content_history`; public `GET /v1/content/:store` (prestige, trim, mco, studio; cache 60 s); developer-only `PUT /v1/dev/content/:store`, history, restore. Allowed keys: announce, home, msg, ctx, cities, words, theme, navOrder, layout, blocks, components, pages, customCss. Limits: strings 600 chars, 60 list items, depth 6, theme keys `--pf-*` with hex except `--pf-font`/`--pf-radius`, 90 KB cap, audited. 7c15 public API unconfirmed.
- Site builder v3 (`SiteBuilder.jsx`, engine `siteEdit.js`, postMessage `pf:1`): PASS. Overlay edits on hard-coded pages only.
- Theme manager 7c25 (`ThemeManager.jsx`, `routes/devTheme.js` at `/v1/dev/theme`, route `/theme`): PASS.
- Studio (`apps/studio`, 5177): PASS. Code vault (migration 031, `vaultCrypto.js`, `devVault.js`, `CodeVault.jsx`): PASS; passphrase never stored.
- Partner Products drill-down (`partnerBrowse.js`, `Products.jsx`): PASS; `partnerCatalog.js` price changes on live items need approval.

## 8. Other existing systems
- Catalog public `/v1/catalog/:storefront/{categories,tree,items,items/:sku}` (active AND listed in `item_storefronts`; limit <= 60). Item shape: sku, type, name, category, categorySlug, subcategory, description, priceType, priceKes, compareAtPriceKes, minOrderQty, options, personalization, stockStatus, leadTimeDays, tags, features, featured, video, image, images (+optionImages, designs on one item).
- CSV: `backend/src/csv/importer.js`, CLI `scripts/import-products.js`; admin imports need all-three approval (`csv_import`). Do not use `Import-Csv | Export-Csv`. CSV import writes category names; `node:` tags and `PH-` placeholders are not in the CSV: check export + re-import before the first CSV load.
- Auth: login returns `{token, user, mustChangePassword}`; customers register; reset by 6-digit code; tokens carry `iface`; login limiter 20/15 min.
- Developer desk: Security (Scan, Login attacks, Dependency audit, Secrets watch, Access matrix, Pen-test lab), Live sessions, Tools (SQL console, API tester, Commands, Links), Code (DB map, Code explorer, Learn), Guides, Site builder, Theme, Code vault. Dev pages use `./http.js` (`get`, `post`, `call`).
- M3 Labs: Money book, invoices, approvals, Coupons, Connect (Brevo email, OpenWA WhatsApp, SMS stub), CSV admin, Tickets, Reports, Activity log. Delivery: pickup 0, Nairobi 300, courier quote (keep `apps/*/src/delivery.js` and `backend/src/delivery.js` in sync). Existing CSS classes in `apps/m3labs/src/styles.css`: bar note card row chip kpi sheet grid2 tree job mrow actbar btn line err muted center grow ptree ptable thumb pill filebtn danger sm crumb checks scroll (plus ok, linkbtn). Prefix new classes (gift `jx- hm- sbp- bl- dl-`; TriM `tz- th-`; orders `od-`; builder `sb-`; studio `st-`).
- Haruno helper: `HelpButton` props `path, topics, faq, tours, go, lift, ai`; AI `POST /v1/help/ask` (12/min/IP, 150/day). Tour selectors on new pages are untested guesses.
- Shared packages: `packages/ui` (Footer, Navbar, ProductCard, formatKES, Button, TextField, PasswordField, ResetByCode, Reveal, Slider, HelpButton, HarunoChat), `packages/theme`, `packages/api-client`.

## 9. SITE BUILDER v4 (BV4-1 to BV4-4; NOT STARTED)
v3 overlays edits on hard-coded pages. v4 = pages as data (HubSpot-style).
- BV4-1 Core: `packages/builder-runtime`; JSON page `{id, path, seo, tree:[node]}`, node `{id, type, props, style:{base,tablet,phone}, children[]}`; registry (section, columns, container, heading, rich text, image, button, icon, divider, spacer, video, gallery, tabs, accordion, form, product grid, product card, menu, footer); shared renderer; table `site_pages(storefront, path, draft jsonb, published jsonb, version)`.
- BV4-2 Editor UI: left rail (Add / Layers / Pages / Theme), right inspector, canvas with insertion lines, resize, breadcrumbs, multi-select, shortcuts.
- BV4-3 System: tokens, symbols, templates, asset library, dynamic bindings, forms inbox, redirects, draft/publish/schedule, versions, permissions, comments, link and accessibility checks.
- BV4-4: wire TriM, M & Co., Studio; export/import; publish check.
Keep dev-only access, API validation, audit, history/restore. Do not start until he asks.

## 10. Known gaps / leftovers
- Gaps: announcement bar in mco has no memory; mco orders page uses old class names; free-delivery threshold needs backend; "Get 15% off" badge only if true; gift starter CSV lacks some tags and `video_url`; no "Update cart" button.
- B1 part 2 (customer temporary passwords on storefronts): public `POST /v1/auth/password-help` (rate limited, same answer either way, table `password_help_requests`, audited); "Ask the team to reset my password" button on each shop's reset screen; shops must handle `mustChangePassword`. Backend already allows role customer in `POST /v1/dev/system/users/:id/temp-password`.
- Other: dealer brief for design jobs (`jobs.dealer_brief`) needs his OK; per-option prices; real prices/images; partner phone numbers then phone-code check; products edited before migration 023 may be overwritten by first CSV load; move `FloatingVideo`, `PhoneField.jsx`, `Help.jsx` into `packages/ui`; `subcategories.category_id/parent_id` no foreign key; unused `Tree.jsx`, M3 Labs `/help` route.
- Test-data cleanup before launch: test accounts, outbound messages, partner test chats, Test Dealer One and dealer1@example.com, test jobs, invoices (INV-000001 test discount), approval requests, tickets, `ZZ TEST` products/videos, fake customers, `password_help_requests`, test `money_entries` (soft delete only), `code_notes`, test code_vault snapshots, `site_content` test rows, test coupons and `coupon_redemptions`, starter gift products if unwanted, ALL `PH-` placeholders (tag `placeholder`) with their `item_images` and `item_storefronts` rows. `uptime_checks` purges after 35 days.

## 11. REMINDERS BEFORE WE FINISH (raise before Phase 11 and at Phase 13)
1. Test the temporary-password email IN DAYTIME (Developer desk > People > Users > right-click a partner > Send temporary password, then "Change password").
2. SMS gateway: he hosts an open-source one; ask which software, match `routes/partnerSend.js`.
3. Real payment details in `apps/m3labs/src/invoiceInfo.js`; social handles (`social.js`, `invoiceInfo.js`).
4. OpenWA hosted online; when down the app shows "Open WhatsApp on my phone instead".
5. Set `SITE_URL`. Buy a domain (email code check, mail out of spam, logo in invoice email).
6. Test-data cleanup (section 10) including Personalised placeholders and test coupons.
7. Do NOT send a customer temporary password until B1 part 2 is built.
8. Free uptime monitor pinging `/health` every 5 min. Put CF_ACCOUNT_ID, CF_AI_TOKEN, SENTRY_DSN in Render. Add a Sentry link to `devLinks.js`.
9. Code explorer and Secrets watch say "not on this server" on Render (the vault covers code viewing).
10. Re-run Pen-test lab and Access matrix on the deployed backend. Add the new public routes `/v1/track` and `/v1/customer/coupons/check` to that review.
11. Gift shop: real photos, real quote (`SITE.showSample`), real prices, name check, fresh-item delivery rules, flower/cake dealers, real delivery towns and fees. Only show "4.8 stars", "Get 15% off", "next-day"/"same-day" if true.
12. TriM: real prices and photos, hero slide photos, no "authorised dealer" claims unless true, replace SAMPLE prices and reviews (`site.js`).
13. Vault passphrase safekeeping. Deployed CORS_ORIGINS must include the Studio origin. Builder iframe origins (`VITE_SHOP_*_URL`) set on Cloudflare. Content `customCss` stays developer-only.
14. Placeholders must not be visible at launch.

## 12. Agreed order from here
1. Choice (A) Site builder wiring / (B) real photos / (C) B1 part 2 + Phase 10 dealers.
2. Orders/tracking polish, announcement bar in mco.
3. 6e deploy, Phase 10, Phase 11 go live, Phase 12 upgrade plan, Phase 13 handover.
M-Pesa and delivery email LAST. Money book dealer-payment shortcut and monthly summary export later.

## 13. How to work
- Fewer, bigger replies. Several short paste blocks, each ending `Write-Host 'Part N done'` or a PASS/FAIL line. Two-line summary at start, checkpoint at end. Short sentences (phone reader, photographs laptop screen). Handoff at the end of each combined reply as one file he replaces once.
- Never ask for passwords, connection strings, keys, tokens or passphrases. If pasted, tell him to rotate. Never tell him to type a secret as a bare `Add-Content` string.
- Full replacement files for edits, but BEFORE replacing a file make sure you have SEEN it, and say what the old file had that the new one drops. Never paste two attempts at the same block.
- PowerShell: single-line `if (...) { ... }`, never start a line with `else`/`elseif`. `Read-Host` swallows the NEXT pasted line, so paste it ALONE.
- Create files with here-strings (`@'...'@ | Set-Content -Encoding ascii path`). The closing `'@` must start the line. Paths start `$root = 'C:\Users\Labs\Documents\pyfon'`. Scripts run from `backend`: `cd "$root\backend"`. After writing a backend `.js` run `node --check` and print PASS/FAIL. Middle dot `&middot;` in JSX text, `'\u00b7'` in JS strings. Written files ASCII only.
- Patching: small Node script in `backend/src/scripts` with exact strings, normalise CRLF to LF and restore, replacer function in `String.replace`; prints Patched / Already done / NOT FOUND and exits 1 on a miss (nothing written). Check NAME CLASHES including CSS classes.
- New partner/dev routes go in a new file under `backend/src/routes`, mounted in `groups.js`.
- To see files, use a "send me the files" block: `Set-Clipboard -Value 'empty'`, build the text, `Set-Clipboard`, `Start-Sleep -Seconds 1`, PASS if `(Get-Clipboard -Raw).Length -gt 200`; he pastes into the CHAT box. Use `git ls-files -co --exclude-standard`. Never assume a file exists; use `Test-Path`. Screenshots cost credits.
- Paths he types have NO quote marks. He does not know products by SKU. Every page must be CENTRED. When he supplies a reference layout, copy it exactly; each click must do what its label says. He wants professional, complex tooling.
- RULE: never claim something works until he reports PASS; say plainly what is untested. Right now untested: 7c14, 7c15, mco cart coupon box.
