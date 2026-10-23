# Pyfon Platform: Handoff 7c26 (22 Oct 2026). ADDENDUM to 7c24. This file wins where they differ.
Keep BOTH files in Project knowledge (7c24 for the full background, this for what changed). Next time we merge them into one standalone file.

## Status
- 7c23 "Do You" page: PASS. 7c25 Theme manager: PASS (his report).
- 7c26 part 1 (My orders, both shops; gift announcement bar remembers close for 24h; thank-you "Track my order" link): PASS (blocks 1 to 3).
- 7c26 checkout focus fix (Fld moved outside Checkout in both shops): PASS.
- 7c26 part 2 (public tracking, TriM header and announcement bar): BUILT, UNTESTED until he reports PASS.

## What was built in 7c26
- `apps/{prestige-m,trim-atelier}/src/Orders.jsx` (route `/orders`, uses `store.jsx` useAuth, replaces the old unused AuthState version; classes `od-`, file `od.css`). Gift `Layout.jsx`: header Orders link when signed in, footer My orders, announcement close stored in localStorage `ann_closed` (24h).
- `backend/src/routes/publicTrack.js`, mounted in `app.js` at `/v1/track` (public, POST, rate limit 12 per 15 min per IP). Body `{ref, phone}`. Matches `orders.ref` + `storefront_code` = X-Interface (mco|prestige|trim) + last 9 digits of `contact_phone`. Same 404 for wrong ref or phone. Returns only ref, createdAt, delivery label, cancelled flag, tracking stages (via `jobs/tracking.js`). Never returns address, prices, names or items.
- `Track.jsx` in both shops (route `/track`, accepts `?ref=`). Links: footer "Track my order" in both shops, signed-out Orders page, TriM header Orders link when signed in. TriM `Layout.jsx` announcement bar also remembers close (24h).
- Scripts: `patch-orders-ui.js`, `patch-fld-focus.js`, `patch-track.js` in `backend/src/scripts`.

## New rules learned
- NEVER define a component (capitalised function returning JSX) inside another component's body and use it as a tag: it remounts on every keystroke and the input loses its cursor. Define it at file level, or call it as a plain function. A scan of all apps found only the two Checkout files (fixed). `DoYou.jsx` `fld` is called as a function, so it is safe.
- TriM `Layout.jsx` has no Tz.jsx file; the TriM home uses `Home.jsx`.
- WhatsApp order message links to SITE_URL/orders (set SITE_URL before launch). Could also mention /track.

## Not yet done
- `mco-brands` has no Orders or Track page (it uses AuthState/CartState, separate from the other two shops).
- 7c14 city pages and 7c15 content API PASS/FAIL still unconfirmed (ask once more near Phase 11).
- Old Orders.jsx in mco-brands may share the AuthState problem; unseen.

## Next, agreed order
1. Wire TriM and M & Co. to the Site builder (BV4 decision), or smaller step first.
2. Real photos, coupon backend, orders for mco-brands.
3. B1 part 2, deploy, Phase 10 dealers, Phase 11 go live, Phase 12 upgrade plan, Phase 13 handover.
Reminders in 7c24 section 12 still apply.
