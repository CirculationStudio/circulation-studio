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

**Two conditions, both required: the branch is `main` AND `SITE_LIVE=1`.**
Everything else, preview branches and local builds alike, carries a `noindex`
meta tag on every page. Both `robots.txt` and the meta tag read one value,
`deploy.indexable`, so they cannot disagree about which deploy this is. The
logic and the reasoning are in `src/_data/deploy.js`.

**`SITE_LIVE` is unset today, so nothing is indexable, including `main`.** Set
it to `1` in the Cloudflare Pages dashboard, production environment, at DNS
cutover. That is the one manual step, and it is deliberate: the branch answers
"is this the production build", not "is there a production host yet", and until
cutover those have different answers. Measured 2026-08-16, before the flag
existed: `www.circulationstudio.com` still served the old Brizy site, while
`circulation-studio.pages.dev` served this build fully crawlable with no
`noindex` at all. A value that is neither `1` nor `0` fails the build rather
than being coerced, because `SITE_LIVE=true` quietly reading as false at cutover
is an invisible failure.

**Before flipping it, the pre-cutover checklist has to be clear**, because
`SITE_LIVE=1` is the moment this site becomes indexable: the migration map in
`src/_redirects` is still marked NOT YET COLLECTED, there is no `sitemap.xml`,
and every unknown path currently returns 200 with the home page rather than a
404.

**The meta tag does the work, and `robots.txt` allows crawling everywhere,
including on the preview.** That is deliberate and it is the stronger of the two
options. `Disallow` prevents crawling, which prevents a crawler ever reading the
`noindex`, and that is only correct if the host has never been indexed. If it
has, `Disallow` locks those URLs in the index, because Google cannot recrawl to
discover the directive, and they persist as bare URLs with no snippet. Allow
plus `noindex` prevents indexing just as effectively and also clears an existing
listing, so it is correct in both states. Whether the preview host is currently
indexed has not been confirmed, which is exactly why the option that works
either way is the one in place. Recorded in `src/robots.njk`.

**Once `SITE_LIVE=1`, nothing is restricted on the production host.** No robots
meta tag is emitted at all and `robots.txt` allows everything. A production build
where the branch is unreadable fails the deploy rather than falling through to
noindex, because a failed deploy is visible and a live site quietly carrying
noindex is not.

**The article audit strip follows `deploy.indexable` too**, so it now renders on
`circulation-studio.pages.dev` until cutover. That is consistent rather than a
side effect: until `SITE_LIVE=1` that host is a preview, which is what the strip
is for. It disappears the moment the flag is set.

Every build prints which mode it chose, so the Cloudflare build log is the
record. **After cutover, confirm on the live domain**: view source on
circulationstudio.com and there should be no `robots` meta tag. Since
`robots.txt` reads `Allow: /` on every deploy, it is the meta tag, not
robots.txt, that tells you which mode a host is in.

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
