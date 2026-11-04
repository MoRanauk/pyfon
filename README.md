<div align="center">

<img src="assets/terminal.svg" alt="Animated code snippet introducing Ezra" width="640">

</div>

## Hi, I'm Ezra 👋

I'm a medical student and BSc Human Anatomy graduate from the University of Nairobi. I build the software behind small businesses: backend APIs, storefronts and the dashboards that run them. My long-term goal is to bring the same approach to healthcare.

## Flagship project: Pyfon

[**Pyfon**](https://github.com/MoRanauk/pyfon) is a platform for a printing and branding business. A single Node.js backend serves every app: three customer storefronts, a partner portal, a dealer app and a website builder. Customers order on the storefronts, partners approve each job step by step in the portal, outside dealers take on specialist work, and the studio lets a developer customize the shops by drag and drop.

<div align="center">

<img src="assets/architecture.svg" alt="Six apps send requests to one Pyfon API, which reads and writes a PostgreSQL database" width="720">

</div>

Every app is live:

| App | What it does |
|---|---|
| [M & Co. Brands](https://pyfon-mco.moranauk.workers.dev/) | Customer storefront for printed and branded products |
| [Pyfon Gift Hub](https://pyfon-gifthub.moranauk.workers.dev/) | Customer storefront for gifts |
| [TriM Atelier](https://pyfon-trimatelier.moranauk.workers.dev/) | Customer storefront for jewellery, timepieces and fragrance |
| [M3 Labs](https://pyfonlab.moranauk.workers.dev/) | Partner portal: jobs, approvals and customer messaging |
| [Dealer](https://pyfon-dealer.moranauk.workers.dev/) | Portal for outside dealers who take on specialist jobs |
| [Studio](https://pyfon-studio.moranauk.workers.dev/) | Website builder with a drag-and-drop canvas |

**Built with:** Node.js, Express, React, Vite, PostgreSQL on Neon, with the backend on Render and the frontends on Cloudflare.

## Where it started

Pyfon grew out of two earlier shop projects, where I learned to build and deploy backends.

| Project | What it does | Stack |
|---|---|---|
| [Emlabs-backend](https://github.com/MoRanauk/Emlabs-backend) | Clothing shop API with a seeded 30-item catalog. My first shop backend, and the model for Pyfon's design. | Node.js, Express, MongoDB, Mongoose |
| [business-website](https://github.com/MoRanauk/business-website) | React business website served by an Express backend as a single deployable unit | Node.js, Express, React |

## Tools I work with

**Backend:** ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)

**Frontend:** ![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

**Data:** ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white) ![Neon](https://img.shields.io/badge/Neon-00E599?logo=neon&logoColor=black)

**Hosting and workflow:** ![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=black) ![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white) ![Git](https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white)

## Background

I hold a BSc in Human Anatomy, and my under# Pyfon Brands Platform

One Node.js backend serving three customer storefronts, the M3 Labs partner portal, a dealer app, a website builder and a developer console for a printing and branding business. Built and owned by Emlabs.

## Overview

Pyfon Brands sells graphic design, printing and branded merchandise. This platform replaces a WhatsApp-catalog workflow with a full system: customers browse and order on a storefront, three business partners approve each job step by step, payment is collected by M-Pesa, and customers are kept informed by WhatsApp, SMS and email.

One backend and one database serve every app. Each storefront has its own shop identity, its own customer accounts and its own orders, while sharing the same code and infrastructure.

## Apps

| App | Folder | Purpose | Live |
|---|---|---|---|
| M & Co. Brands | `apps/mco-brands` | Customer storefront, a broad marketplace of printed and branded products | [Open](https://pyfon-mco.moranauk.workers.dev/) |
| Pyfon Gift Hub | `apps/gift-hub` | Customer storefront for gifts and accessories | [Open](https://pyfon-gifthub.moranauk.workers.dev/) |
| TriM Atelier | `apps/trim-atelier` | Customer storefront with its own pages and style | [Open](https://pyfon-trimatelier.moranauk.workers.dev/) |
| M3 Labs | `apps/m3labs` | Partner portal: jobs, approvals, money book, customer chat, catalog, plus the developer desk | [Open](https://pyfonlab.moranauk.workers.dev/) |
| Studio | `apps/studio` | Website builder canvas: arrange a page by drag and drop and preview it before applying changes to the live shops | [Open](https://pyfon-studio.moranauk.workers.dev/) |
| Dealer | `apps/dealer` | Portal for outside dealers who take on specialist jobs | [Open](https://pyfon-dealer.moranauk.workers.dev/) |

Shared code lives in `packages/` (theme, api-client, ui), so every app uses the same look, components and API calls.

## Screenshots

### Storefronts

**M & Co. Brands home page**

<img src="https://github.com/user-attachments/assets/e1b73d6e-7284-4408-a778-3f4d1de77816" alt="M & Co. Brands home page" width="900">

**Pyfon Gift Hub home page**

<img src="https://github.com/user-attachments/assets/03884373-ec03-4ec6-a8af-e564c6e2a1c1" alt="Pyfon Gift Hub home page" width="900">

**TriM Atelier home page**

<img src="https://github.com/user-attachments/assets/13ce4a58-15a5-48d2-ab29-1135f845f6bf" alt="TriM Atelier home page" width="900">

**Product pages**

<img src="https://github.com/user-attachments/assets/0768b7ba-8e86-4ea5-b6b4-cef761c83c45" alt="Product page sample" width="600">
<img src="https://github.com/user-attachments/assets/b4bd496d-87bd-4cc9-8492-c5e41558d08f" alt="Product page sample" width="600">
<img src="https://github.com/user-attachments/assets/cd7fd1b3-cf85-4112-b4c5-725218ad4c3a" alt="Product page sample" width="600">

### M3 Labs partner portal

**Partner dashboard and job board**

<img src="https://github.com/user-attachments/assets/abe4247c-d8db-4233-8491-d36db1159c23" alt="M3 Labs partner dashboard" width="900">
<img src="https://github.com/user-attachments/assets/76b60708-2eb2-4aa2-9027-2988158493b9" alt="M3 Labs job board" width="900">

**Workspace tools.** Partners and managers get a focus timer, scheduler, to-do list and calculator built into the portal, so they can manage their workload without leaving it.

<img src="https://github.com/user-attachments/assets/d9e4a20d-11ed-4b6d-906b-17e027e1f06a" alt="M3 Labs workspace tools" width="900">

### Studio

**Website builder.** The studio lets a developer customize storefront pages by drag and drop instead of writing code, and test changes before publishing them.

<img src="https://github.com/user-attachments/assets/a3ee2767-a8c9-473d-8c01-0d98f18f57cd" alt="Studio website builder with a blank page" width="900">

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

```
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
```

### How an order flows

1. A customer opens a storefront, which loads products from the catalog.
2. At checkout the backend validates the order, prices it from the database and saves the order, its lines and a partner job in one transaction.
3. A confirmation message is queued and sent by WhatsApp, with SMS and email as fallbacks.
4. The customer receives an M-Pesa payment prompt, and the callback confirms the payment.
5. The partners move the job through creative, production, and finance and delivery, each step requiring sign-off.
6. The customer follows progress on the tracking page until delivery.

## Repository structure

```
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
```

## Setup

Requires Node.js 20.6 or newer, a Neon Postgres database and a running OpenWA service.

```
git clone https://github.com/MoRanauk/pyfon.git
cd pyfon
npm install
cd backend
cp .env.example .env      # fill in the values described below
npm run migrate
npm run dev
```

### Scripts (backend)

| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-restart, reading `.env` |
| `npm start` | Start for production |
| `npm run migrate` | Apply database migrations |
| `npm test` | Run the partner rules tests |

### Configuration

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

```
cd backend
npm test
```

On Windows, `run-tests.ps1` runs the same suite.

## Deployment

Backend on Render, frontends on Cloudflare Workers, database on Neon. Cloudflare configuration for the six apps is included in the repository.

## Status

In active development. All six apps are live (see the Apps table above).

## Author

Built by Ezra under Emlabs.
I'm now training in medicine while building software, with the aim of making tools that work for the people who run clinics and care for patients.

## Get in touch

[Email](mailto:moranauk@gmail.com) · [Blog](https://empearls.beehiiv.com/)
