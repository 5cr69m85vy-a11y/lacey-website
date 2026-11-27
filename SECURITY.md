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

## Second pass — hardening items closed (2026-11-27)
| Item | Change | Guard |
|------|--------|-------|
| No Content-Security-Policy | Strict CSP in `_headers`: `script-src 'self' https://accounts.google.com` (no `unsafe-inline`), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`. The only inline event handlers (product-image load/error) were replaced by delegated listeners. Verified in a browser with the policy enforced: no violations on storefront, account, support and admin. | `test/routes.test.js` fails if an inline script or `on*=` attribute is added |
| Guest chat token in the URL (access logs) | Sent in the `X-Chat-Token` header; the query parameter is no longer read. | `test/extra.test.js`, `test/security.test.js` |
| WhatsApp cost abuse from many IPs | Global hourly OTP cap (`OTP_GLOBAL_RL`, default 300) and 10 OTPs/day per phone. | `test/authz.test.js` |
| Order-code guessing via `/track` | 40 misses per 10 min per IP; the public endpoint no longer triggers the maintenance sweep more than once per 30 s. | `test/authz.test.js` |
| Telegram webhook secret compared with `!==` | Constant-time compare (`safeEq` moved to `worker/lib.js`). | `test/tg.test.js` |

## Accepted / not changed
- Registration says when an email already exists. Hiding it would break the sign-up UX; it is limited to 10 attempts/hour/IP.
- `style-src` keeps `'unsafe-inline'` (the UI sets inline styles); scripts are strict, which is what blocks XSS.
- `connect-src` allows any `https:` host because the storefront can be pointed at a separate API origin in settings.
