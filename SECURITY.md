# Security & engineering audit — 2026-11-26

Method: source review following Cloudflare's `security-audit` skill (attack-class checklists for auth, access control, injection, client-side, data isolation, deployment). Source-only; nothing was run against the live site. Scope: a focused single pass, not an exhaustive proof of absence.

## Fixed in this pass
| # | Finding | Fix | Guard |
|---|---------|-----|-------|
| 1 | Admin token was a permanent HMAC of a constant: never expired, could not be limited if leaked (XSS, HAR, shared device). | Token is now `expiry.HMAC(pass, expiry)`, 14 days, constant-time check; the legacy permanent token is rejected. Changing `ADMIN_PASS` still revokes every token. | `test/authz.test.js` |
| 2 | New routes `/cphoto/*` and `/reviews` were missing from `run_worker_first`, so in production the assets layer would answer them (404). | Added to `wrangler.jsonc`. | `test/routes.test.js` compares every Worker route in source with `run_worker_first` |
| 3 | No clickjacking / MIME / referrer protection on static pages. | `_headers`: `X-Frame-Options`, `frame-ancestors 'self'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS. | — |
| 4 | `/visit` (public write) had no rate limit; `/reviews` (public read) had none. | Per-IP limits. | covered by existing rate-limit tests |
| 5 | `/media/*` responses lacked `nosniff`. | Added. | — |

## Verified safe (no change)
- All 51 `/adm/*` routes reject anonymous callers for GET/POST/DELETE (`test/authz.test.js`).
- Every SQL statement uses bound parameters; the few interpolated fragments are fixed whitelists.
- Customer/staff session tokens are stored hashed with expiry; OTP is CSPRNG, hashed, 5 attempts, per-phone and per-IP limits; passwords PBKDF2-SHA256 100k with timing-equalised failure; Google sign-in checks `aud` and `email_verified`.
- Telegram webhook requires the per-bot secret header; customer text is HTML-escaped before it reaches Telegram; admin/staff views escape customer text.
- Server code, migrations and tests are excluded from the public assets (`.assetsignore`).

## Open hardening items (not vulnerabilities today)
- No full Content-Security-Policy: the UI uses inline handlers/styles, so a strict CSP needs a refactor first.
- Guest chat poll token travels in the query string (appears in access logs).
- Registration reveals whether an email exists; OTP send is limited per IP/phone but WhatsApp cost abuse from many IPs is possible.
- Telegram secret and ADMIN_PASS comparisons: the admin one is constant-time; the Telegram header compare is plain `!==`.
- Order tracking by code alone (no PII returned; codes are ~31 bits and rate-limited).
