# Deployment

**Project:** Circulation Studio
**Last updated:** 2026-07-19

## Hosting

- **Platform:** Cloudflare Pages
- **Repository:** https://github.com/CirculationStudio/circulation-studio
- **Preview URL:** https://circulation-studio.pages.dev/
- **Production URL:** circulationstudio.com
- **Build command:** `npm run build`
- **Output directory:** `_site`

## Domain strategy

Building and reviewing fully on the Cloudflare preview URL above before
switching DNS on circulationstudio.com. Redirect map (see Redirects below)
needs to be in place before that cutover, not after.

## Indexing

Two origins serve this site. The preview host is publicly reachable and stays
that way after cutover, because every preview deploy gets its own subdomain.
Only the production host may be indexed.

**Decided by the build, from `CF_PAGES_BRANCH`, not by a switch anyone flips.**
A deploy of `main` on Cloudflare Pages is production. Everything else, preview
branches and local builds alike, is noindex, through both a `robots` meta tag
and `robots.txt`. Both halves read one value, `deploy.indexable`, so they cannot
disagree. The logic and the reasoning are in `src/_data/deploy.js`.

**On the production host, nothing is restricted.** No robots meta tag is emitted
at all and `robots.txt` allows everything. The decision is recomputed from the
branch name on every build, so there is no state that can get stuck. A
production build where the branch is unreadable fails the deploy rather than
falling through to noindex, because a failed deploy is visible and a live site
quietly carrying noindex is not.

Every build prints which mode it chose, so the Cloudflare build log is the
record. **After cutover, confirm on the live domain**: view source on
circulationstudio.com and there should be no `robots` meta tag, and
circulationstudio.com/robots.txt should read `Allow: /`.

If the production branch is ever renamed, rename `PRODUCTION_BRANCH` in
`src/_data/deploy.js` with it. That is the one thing here a human keeps in step.

Every page also carries a self-referencing canonical pointing at the production
origin, built from the same `site.url` the JSON-LD uses, so a preview page names
production as its real address as well as declining to be indexed.

## Cloudflare Pages Settings

### Build Configuration

```
Build command: npm run build
Build output directory: _site
Root directory: /
Node version: 24
```

### Environment Variables

```
NODE_VERSION=24
```

## Cloudflare Performance Settings

**Not yet configured or verified in the dashboard.** The settings below are
inherited defaults to review, not confirmed live settings.

### Enabled Features

- **Early Hints:** [to verify]
- **HTTP/3:** [to verify]
- **0-RTT:** [to verify]
- **Brotli:** [to verify]
- **Rocket Loader:** OFF recommended (breaks JS)

### Cache Configuration

- **Tiered Cache:** [to verify]
- **Cache Rules:** [To be configured based on content types]

### Speed Optimization

- **Auto Minify:** OFF recommended (minification handled at build time)
- **Cloudflare Images:** For portfolio images and dynamic image optimization
- **Speed Observatory:** [to verify]

## Headers

`src/_headers` exists and reaches `_site/_headers`, via the passthrough to
`public/` recorded in DESIGN_SYSTEM.md under Deploy pipeline. It carries at
minimum:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Redirects

`src/_redirects` exists and reaches `_site/_redirects` by the same passthrough,
but carries no rules yet. This is a rebuild of an existing
indexed site (circulationstudio.com), not a greenfield build. Build the
old-URL-to-new-URL redirect map before the DNS cutover above, not after.

## Performance Budget

### Core Web Vitals Targets (75th percentile)

- **LCP (Largest Contentful Paint):** < 2.5s
- **INP (Interaction to Next Paint):** < 200ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Asset Budget

- **Hero images:** Target < 300KB each
- **Below-fold images:** Lazy-loaded, optimized for WebP/AVIF
- **Total page weight:** Target < 1MB for initial load
- **JavaScript:** Minimal, defer/async non-critical scripts

## DNS Configuration

Not yet configured. Dev/review happens on the Cloudflare preview URL first,
DNS cutover to circulationstudio.com happens after approval.

- **Domain registrar:** [To be confirmed]
- **Nameservers:** Point to Cloudflare
- **Email hosting consideration:** Confirm where Circulation Studio email
  (general@circulationstudio.com) is hosted before any DNS cutover, so MX
  records are not disrupted

## SSL/TLS

Cloudflare automatic SSL/TLS (Full or Full Strict mode)

## Deployment Process

1. Push to `main` branch triggers automatic deployment, confirmed working 2026-07-19
2. Cloudflare Pages builds and deploys
3. Preview deployments created automatically for feature branches
4. Verify deployment at Cloudflare preview URL before final checks

## Monitoring

- **Cloudflare Speed Observatory:** [to configure]
- **Google Search Console:** Monitor indexing and search performance through the redirect cutover especially
- **Google Analytics / GA4:** [To be configured]

## Rollback Procedure

Cloudflare Pages maintains deployment history. Rollback via dashboard if needed.
