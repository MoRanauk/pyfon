# Pyfon Brands Platform

One Node.js backend serving three customer storefronts, the M3 Labs partner portal, a dealer app, a website builder and a developer console for a printing and branding business. Built and owned by Emlabs.

## Overview

Pyfon Brands sells graphic design, printing and branded merchandise. This platform replaces a WhatsApp-catalog workflow with a full system: customers browse and order on a storefront, three business partners approve each job step by step, payment is collected by M-Pesa, and customers are kept informed by WhatsApp, SMS and email.

One backend and one database serve every app. Each storefront has its own shop identity, its own customer accounts and its own orders, while sharing the same code and infrastructure.

## Apps

| App | Folder | Purpose |
|---|---|---|
| M & Co. Brands | `apps/mco-brands` | Customer storefront, a broad marketplace of printed and branded products |
| Pyfon Gift Hub | `apps/gift-hub` | Customer storefront for gifts and accessories |
| TriM Atelier | `apps/trim-atelier` | Customer storefront with its own pages and style |
| M3 Labs | `apps/m3labs` | Partner portal: jobs, approvals, money book, customer chat, catalog, plus the developer desk |
| Dealer | `apps/dealer` | Portal for outside dealers who take on specialist jobs |
| Studio | `apps/studio` | Website builder canvas: arrange a page by drag and drop and preview it before applying changes to the live shops |

Shared code lives in `packages/` (theme, api-client, ui), so every app uses the same look, components and API calls.

## Features

**Customers**
- Per-shop accounts, orders, quote requests and uploaded design files
- Checkout drafts, delivery options and coupons
- Order tracking with plain-language progress ("Preparing your design", "In production", "Ready for dispatch")
- M-Pesa payment prompt with automatic payment confirmation
- Reviews, product videos and social links

**Partners (M3 Labs)**
- Role-based job workflow with sign-offs for creative, production, and finance and delivery, enforced in code and covered by automated tests
- Money book: ledger, per-job costs and reversals
- Invoices and payment records
- Chat with customers, with emoji, stickers and file sharing
- Catalog management with CSV import and export, and coupons
- Activity log and applications from new partners and dealers

**Dealers**
- Invitations, dealer login and vendor jobs, so specialist work can be outsourced through the same backend

**Developer desk**
- Users, sessions, security checks, system health, logs, theme and settings
- Support tickets and reports
- Encrypted vault for stored secrets
- Uptime monitoring and alerts
- Website builder for customizing the storefronts

**Platform**
- Server-side pricing and validation, so prices cannot be changed from the browser
- Transactional order placement: the order, its lines, the coupon use and the partner job are created together or not at all
- Queued messaging: confirmations are saved with the order and delivered later, so orders succeed even when WhatsApp is down
- Audit log, rate limiting, security headers and error tracking

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20.6+, Express 5 (ES modules) |
| Database | PostgreSQL on Neon, with versioned migrations |
| Frontends | React, Vite |
| Validation and security | zod, helmet, cors, express-rate-limit, JSON Web Tokens |
| Files | multer, file-type, Cloudinary |
| Data import | csv-parse |
| Messaging | OpenWA (WhatsApp, separate service), SMS gateway, Brevo email |
| Payments | M-Pesa |
| AI help | Cloudflare AI |
| Monitoring | Sentry, uptime checks |
| Tests | Node built-in test runner |

## Architecture

    React apps (storefronts, M3 Labs, dealer, studio)
                    |
                    v
          Express API (backend/)
          /        |         \
    Neon        Cloudinary    Message queue --> OpenWA --> WhatsApp
    Postgres    (files)                    \--> SMS
                                            \--> Email
                    |
                    v
                 M-Pesa (payment prompt and callback)

### How an order flows

1. A customer opens a storefront, which loads products from the catalog.
2. At checkout the backend validates the order, prices it from the database and saves the order, its lines and a partner job in one transaction.
3. A confirmation message is queued and sent by WhatsApp, with SMS and email as fallbacks.
4. The customer receives an M-Pesa payment prompt, and the callback confirms the payment.
5. The partners move the job through creative, production, and finance and delivery, each step requiring sign-off.
6. The customer follows progress on the tracking page until delivery.

## Repository structure

    apps/
      mco-brands/       customer storefront
      gift-hub/         customer storefront
      trim-atelier/     customer storefront
      m3labs/           partner portal and developer desk
      dealer/           dealer portal
      studio/           website builder canvas
    backend/
      migrations/       database changes
      public/           product images
      src/
        routes/         API endpoints
        auth/           registration, login, roles
        approvals/      partner sign-offs and money book
        jobs/           order and job handling
        messages/       message queue and sender
        mpesa/          payment prompt and callback
        middleware/     request checks
        csv/            product import and export
        db/             database access
        uploads/        file handling
        scripts/        maintenance scripts
      test/             automated tests
    packages/           shared theme, api-client and ui
    ops/uptime/         monitoring setup
    data/               product data

## Setup

Requires Node.js 20.6 or newer, a Neon Postgres database and a running OpenWA service.

    git clone https://github.com/MoRanauk/pyfon.git
    cd pyfon
    npm install
    cd backend
    cp .env.example .env      # fill in the values described below
    npm run migrate
    npm run dev

## Scripts (backend)

| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-restart, reading `.env` |
| `npm start` | Start for production |
| `npm run migrate` | Apply database migrations |
| `npm test` | Run the partner rules tests |

## Configuration

All settings are environment variables, listed with empty values in `backend/.env.example`. Never commit a real `.env`.

| Group | Variables |
|---|---|
| Core | `PORT`, `SITE_URL`, `DEALER_PORTAL_URL`, `CORS_ORIGINS` |
| Database | `DATABASE_URL`, `DB_DRIVER` |
| Auth and secrets | `JWT_SECRET`, `VAULT_PASSPHRASE` |
| WhatsApp (OpenWA service) | `OPENWA_URL`, `OPENWA_SESSION`, `OPENWA_KEY`, `OPENWA_KEY_HEADER` |
| Message sending | `SENDER_DISABLED` |
| Email (Brevo) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `APPLY_NOTIFY_EMAIL` |
| SMS | `SMS_GATEWAY_URL`, `SMS_GATEWAY_KEY` |
| M-Pesa | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_TILL`, `MPESA_TILL_NAME` |
| Files | `CLOUDINARY_URL` |
| AI help | `CF_ACCOUNT_ID`, `CF_AI_TOKEN`, `CF_AI_MODEL` |
| Monitoring | `SENTRY_DSN` |

Set `SENDER_DISABLED` during development so test orders do not message real customers.

## API overview

Customer order endpoints (each request is scoped to the storefront and the logged-in customer):

| Method | Path | Purpose |
|---|---|---|
| POST | `/orders` | Place an order |
| POST | `/quote-requests` | Request a quote for custom work |
| GET | `/orders` | List the customer's orders with tracking |
| GET | `/quote-requests` | List the customer's quote requests |

The backend also exposes route groups for storefront content (catalog, groups, reviews, site content), partner operations (jobs, approvals, money, invoices, messages, catalog, coupons), dealers, and the developer desk. See `backend/src/routes/`.

## Tests

The partner approval rules are covered by automated tests.

    cd backend
    npm test

On Windows, `run-tests.ps1` runs the same suite.

## Deployment

Planned: backend on Render, frontends on Cloudflare Pages, database on Neon. Cloudflare configuration for the six apps is included in the repository.

## Screenshots

Find some screenshots here: a storefront home page, a product page, the M3 Labs job board and the studio canvas.
M & Co Brands Homepage: <img width="1917" height="969" alt="image" src="https://github.com/user-attachments/assets/e1b73d6e-7284-4408-a778-3f4d1de77816" />

Pyfon Gift Hub Homepage: <img width="1914" height="970" alt="image" src="https://github.com/user-attachments/assets/03884373-ec03-4ec6-a8af-e564c6e2a1c1" />

TriM-Atelier Homepage: <img width="1918" height="967" alt="image" src="https://github.com/user-attachments/assets/13ce4a58-15a5-48d2-ab29-1135f845f6bf" />

Product pages samples:
<img width="1161" height="916" alt="image" src="https://github.com/user-attachments/assets/0768b7ba-8e86-4ea5-b6b4-cef761c83c45" />

<img width="805" height="889" alt="image" src="https://github.com/user-attachments/assets/b4bd496d-87bd-4cc9-8492-c5e41558d08f" />
<img width="922" height="900" alt="image" src="https://github.com/user-attachments/assets/cd7fd1b3-cf85-4112-b4c5-725218ad4c3a" />

The partners Dashboard:
<img width="1489" height="937" alt="image" src="https://github.com/user-attachments/assets/abe4247c-d8db-4233-8491-d36db1159c23" />
<img width="1822" height="967" alt="image" src="https://github.com/user-attachments/assets/76b60708-2eb2-4aa2-9027-2988158493b9" />

Partners, Managers and any admin need essential tools to manage workload within the limited time.
Therefore, Essential tools are basic needs such like food is a basic need to the sustainance of life.
However some evolved bugs argue that a car is also a basic need :)
<img width="1627" height="958" alt="image" src="https://github.com/user-attachments/assets/d9e4a20d-11ed-4b6d-906b-17e027e1f06a" />

Behind every successful woman there is a man👨! Oops!It is vice versa... Behind every successful man there is a mom/dad-figure
"That is well said...a round of aplause for him:;"
 <img width="480" height="266" alt="LetsGoApplauseGIFbyEmmys" src="https://github.com/user-attachments/assets/1296b848-28f9-4730-9e4d-31d58e27298f" />

 So the developer desk limits much of code-writing and saves time for just a drag and drop feature to customize the webpages:
<img width="1834" height="970" alt="image" src="https://github.com/user-attachments/assets/a3ee2767-a8c9-473d-8c01-0d98f18f57cd" />
The studio blank page is a studio indeed not a bedsitter but one which enablesthe developer to test features before publishing changes.



## Status

In active development. The following are the live links to the frontends:
1. https://pyfon-mco.moranauk.workers.dev/
2. https://pyfon-gifthub.moranauk.workers.dev/
3. https://pyfon-trimatelier.moranauk.workers.dev/
4. https://pyfonlab.moranauk.workers.dev/
5. https://pyfon-studio.moranauk.workers.dev/
## Author

Built by Ezra under Emlabs.
