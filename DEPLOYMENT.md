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
