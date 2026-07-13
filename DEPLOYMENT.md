# Deployment

**Project:** Circulation Studio
**Last updated:** 2026-07-13

## Hosting

- **Platform:** Cloudflare Pages
- **Repository:** github.com/marcopradog/circulation-studio
- **Production URL:** [To be configured]
- **Build command:** `npm run build`
- **Output directory:** `_site`

## Cloudflare Pages Settings

### Build Configuration

```
Build command: npm run build
Build output directory: _site
Root directory: /
Node version: 18 or later
```

### Environment Variables

[Add environment variables here if needed]

```
# Example:
# API_KEY=<value>
```

## Cloudflare Performance Settings

### Enabled Features

- **Early Hints:** ON
- **HTTP/3:** ON
- **0-RTT:** ON
- **Brotli:** Automatic
- **Rocket Loader:** OFF (breaks JS)

### Cache Configuration

- **Tiered Cache:** Enabled
- **Cache Rules:** [To be configured based on content types]

### Speed Optimization

- **Auto Minify:** OFF (minification handled at build time)
- **Cloudflare Images:** For portfolio images and dynamic image optimization
- **Speed Observatory:** Enabled for daily performance monitoring

## Headers

See `src/_headers` for security and caching headers configuration.

Key headers:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

[Add additional headers as needed during Phase 7]

## Redirects

See `src/_redirects` for URL redirects configuration.

[Configure redirects during Phase 9 if this is a rebuild/migration]

## Performance Budget

### Core Web Vitals Targets (75th percentile)

- **LCP (Largest Contentful Paint):** < 2.5s
- **INP (Interaction to Next Paint):** < 200ms
- **CLS (Cumulative Layout Shift):** < 0.1

These are the official Google thresholds as of July 2026.

### Asset Budget

- **Hero images:** Target < 300KB each
- **Below-fold images:** Lazy-loaded, optimized for WebP/AVIF
- **Total page weight:** Target < 1MB for initial load
- **JavaScript:** Minimal, defer/async non-critical scripts

## DNS Configuration

[To be configured during launch]

- **Domain registrar:** [To be confirmed]
- **Nameservers:** Point to Cloudflare
- **Email hosting consideration:** [Confirm where email is hosted before DNS cutover]

## SSL/TLS

Cloudflare automatic SSL/TLS (Full or Full Strict mode)

## Deployment Process

1. Push to `main` branch triggers automatic deployment
2. Cloudflare Pages builds and deploys
3. Preview deployments created automatically for feature branches
4. Verify deployment at Cloudflare preview URL before final checks

## Monitoring

- **Cloudflare Speed Observatory:** Daily scheduled performance tests
- **Google Search Console:** Monitor indexing and search performance
- **Google Analytics:** [To be configured]

## Rollback Procedure

Cloudflare Pages maintains deployment history. Rollback via dashboard if needed.
