# Kenoza’s Flower — project guide

## Architecture

This is an Indonesian flower storefront and admin application built with TanStack Start and React. The index route mounts `src/components/flower-shop.tsx`. The same application uses hash destinations (`/#orders`, `/#profile`, `/#wishlist`, `/#admin`) for major views. The root route owns metadata and the shared document. Initial catalog constants provide server-rendered content; live catalog data replaces them. Checkout is blocked until the database catalog has loaded.

- `src/components/flower-shop.tsx`: storefront, categories, product cards, authentication, cart, wishlist, profile, sound toggle, notifications, polling, and success modal.
- `src/components/flower-admin.tsx`: protected dashboard, orders, offline sales, catalog editing, uploads, categories, promos, reports, customers, activity and settings.
- `src/components/flower-checkout.tsx`: shared online/offline checkout with delivery, address, courier note, promo and payment choices.
- `src/components/flower-orders.tsx`: reusable order list, status actions, invoice preview, and print view.
- `src/components/flower-modal.tsx`: accessible Radix modal wrapper.
- `src/lib/flower-store.ts`: shared models, API client, Identity browser integration, audio, PDF and data exports.
- `src/styles.css`: pastel floral design, DM Serif Display + DM Sans, responsive storefront/admin layouts and invoice print rules.
- `netlify/functions/store.mts`: public catalog, verified name-based registration, privileged admin bootstrap, authenticated customer state, checkout, orders, admin CRUD, reviews, and account updates.
- `netlify/functions/flower-photo.mts`: public photo binary responses backed by Netlify Blobs.
- `db/schema.ts`, `db/index.ts`, `drizzle.config.ts`: Postgres schema and Drizzle Netlify adapter. Migrations live under `netlify/database/migrations` and must accompany schema changes.
- `public/img`: static product photographs and custom generated hero. `public/favicon.svg` is the floral icon.

## Important decisions

All persistent application records belong in Netlify Database. Customer carts and wishlists are JSONB columns associated with stable account IDs. Customers enter only a display name; random guest account IDs and hashed 30-day session tokens in shopping_sessions isolate customers even when names match. HttpOnly SameSite cookies carry session tokens. Logout revokes the session; names alone never recover historical accounts. Images are binary assets in Blobs. Browser storage is used only for the sound preference, never as an order database.

Admin authentication uses `@netlify/identity`. A normalized username is SHA-256 mapped to a synthetic internal email; customers never enter email or phone. Registration is mediated by the server's Identity admin API, which creates confirmed users. Authorization uses the database account's server-managed `is_admin` value. Never accept that value from customer input. Bootstrap verifies a salted scrypt hash stored in settings before creating the requested initial Admin. Never disclose hashes or credentials in API responses, logs or documentation.

Online purchases, including website orders picked up at the store, are ONLINE and immediately Lunas/Dikonfirmasi. OFFLINE sales are Admin-created and immediately Selesai/Lunas. Payment choices only record payment; there is no external payment processor. Preserve this user-requested behavior and do not introduce a manual payment approval requirement. Do not require WhatsApp or phone numbers.

Checkout uses a raw pooled SQL transaction so stock checks, order items, invoice row, activity and cart clearing commit together. Products are locked in deterministic ID order; a per-request advisory lock and unique request key protect retries. Prices and discounts are revalidated on the server. Offline price overrides are Admin-only. Order numbers derive from the Postgres sequence with a KF prefix. Do not replace it with browser counters or row counts. Invoice line names and prices are historical snapshots.

Archive products instead of hard deleting referenced rows. Category names have a foreign key with update cascade. Account name changes preserve the Identity ID so order ownership is stable. Customer requests must never access other customers' orders or Admin mutations.

Carts/wishlists save through a serialized client request queue. Checkout awaits the queue so a delayed cart save cannot resurrect a completed cart. Order/status polling runs every seven seconds and establishes a silent initial baseline before new-event alerts. Audio starts after interaction and respects the user's sound setting.

## Conventions and development

Use TypeScript, Indonesian product copy, accessible buttons and labeled forms. All modals use the shared Radix wrapper. Keep large success and notification modals for important events. Prefer existing styles and shared helpers. Use Image CDN URLs for asset display; uploaded photos are served by the photo function. External photo URLs are restricted to Unsplash and Pexels via matching server validation and CDN configuration.

Use `pnpm install` and `netlify dev --port 8889` for local development when permitted. Schema changes require `pnpm exec drizzle-kit generate --name descriptive_change`. The deploy pipeline validates builds. Follow current session restrictions on builds/tests; do not claim runtime validation unless it was actually performed. `TESTING.md` provides a manual deployed-site acceptance checklist.
