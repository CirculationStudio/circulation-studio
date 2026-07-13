# Audit Agent Playbook

**Project:** Circulation Studio
**Last updated:** 2026-07-13
**For:** Chad (autonomous quarterly audit agent)

## Purpose

This playbook guides Chad's quarterly automated audit of the site. It catches technical drift, performance regression, accessibility issues, and ensures ongoing compliance with project standards.

## Audit Frequency

Run quarterly (every 3 months) or on-demand when triggered.

## Audit Checklist

### 1. Documentation Drift Check

**Goal:** Ensure code matches documented architecture

```bash
# Check if actual file structure matches ARCHITECTURE.md
# Flag any new directories or files not documented
# Flag any missing documented files
```

- [ ] File structure matches ARCHITECTURE.md
- [ ] No undocumented directories or major files
- [ ] All documented files exist
- [ ] Update ARCHITECTURE.md if legitimate changes found

### 2. Dependency Audit

**Goal:** Keep dependencies current and secure

```bash
npm audit
npm outdated
```

- [ ] Run `npm audit` and address critical/high vulnerabilities
- [ ] Check for minor version bumps (safe to auto-PR)
- [ ] Flag major version updates (Eleventy, Tailwind) for Marco review (never automatic)
- [ ] Remove unused dependencies

### 3. Performance Regression Check

**Goal:** Ensure Core Web Vitals remain within targets

Use Cloudflare Speed Observatory and/or Lighthouse:

- [ ] LCP < 2.5s (75th percentile)
- [ ] INP < 200ms (75th percentile)
- [ ] CLS < 0.1 (75th percentile)
- [ ] Total page weight trend (flag if increasing significantly)
- [ ] Image optimization check (any images > 300KB except portfolio if quality needed?)

### 4. Accessibility Audit

**Goal:** Maintain WCAG 2.1 AA compliance

Automated checks:

```bash
# Run automated accessibility testing
# Check for common issues
```

- [ ] All images have alt text (meaningful) or empty alt (decorative)
- [ ] Heading hierarchy correct (one H1, then H2, H3, no skipping)
- [ ] Form fields have labels
- [ ] Color contrast meets 4.5:1 (normal) and 3:1 (large text)
- [ ] Focus states visible on interactive elements
- [ ] Keyboard navigation works
- [ ] `prefers-reduced-motion` respected

### 5. SEO and Structured Data Check

**Goal:** Prevent schema regression and maintain SEO health

```bash
# Validate all schema blocks
# Check for meta tag completeness
```

- [ ] All pages have unique title tags and meta descriptions
- [ ] All pages have canonical tags
- [ ] sitemap.xml is current and accessible
- [ ] robots.txt is correct
- [ ] All JSON-LD schema blocks validate at validator.schema.org
- [ ] Organization schema present and correct on homepage
- [ ] Open Graph tags present and correct
- [ ] hreflang tags correct for bilingual pages

### 6. Broken Links and Assets

**Goal:** Ensure all links and resources work

```bash
# Crawl site for broken links
# Check for missing images or assets
```

- [ ] No 404s on internal links
- [ ] No broken external links
- [ ] All images load correctly
- [ ] All scripts and stylesheets load
- [ ] Portfolio images display correctly

### 7. Security Headers Check

**Goal:** Ensure security headers remain configured

Check `src/_headers`:

- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy configured
- [ ] CSP if applicable

### 8. Brand Constraint Compliance

**Goal:** Prevent drift to generic defaults

Grep checks against Forbidden Patterns from DESIGN_SYSTEM.md:

```bash
# Check for banned fonts
grep -r "font-family.*Inter" src/

# Check for em dashes
grep -r "—" src/

# Check for banned filler phrases
grep -r "Unlock your potential\|Leverage our expertise\|Game-changing\|Transform your brand\|Next-level" src/
```

- [ ] No banned fonts (Inter, etc.)
- [ ] No em dashes in content or code
- [ ] No banned filler phrases
- [ ] Colors match DESIGN_SYSTEM.md tokens
- [ ] No unauthorized design changes
- [ ] No drift toward generic "agency" aesthetics

### 9. Content Freshness

**Goal:** Keep content current and accurate

- [ ] Check for outdated dates or year references
- [ ] Verify contact information is current
- [ ] Review portfolio work for accuracy
- [ ] Check for expired case studies or time-sensitive content
- [ ] Verify team information is up to date

### 10. Cloudflare Settings Audit

**Goal:** Ensure performance optimizations remain enabled

Via Cloudflare dashboard:

- [ ] Early Hints: ON
- [ ] HTTP/3: ON
- [ ] 0-RTT: ON
- [ ] Brotli: Automatic (default)
- [ ] Rocket Loader: OFF (breaks JS)
- [ ] Cache Rules configured correctly
- [ ] Tiered Cache enabled

### 11. Bilingual Integrity Check

**Goal:** Ensure both language versions are in sync

- [ ] All English pages have Spanish equivalents
- [ ] All Spanish pages have English equivalents
- [ ] hreflang tags correct on all pages
- [ ] Language switcher works correctly
- [ ] No broken links between language versions

## Audit Output Format

For each audit, Chad should generate a report:

```markdown
# Quarterly Audit Report - Circulation Studio
**Date:** [Date]
**Auditor:** Chad

## Summary
- Total checks: [X]
- Passed: [X]
- Failed: [X]
- Warnings: [X]

## Issues Found

### Critical
[List critical issues requiring immediate attention]

### Warnings
[List warnings and recommendations]

## Recommended Actions
1. [Action 1]
2. [Action 2]

## Changes Made (if auto-fix enabled)
[List any automated fixes applied]

## Pull Request
[Link to PR with proposed updates if changes need review]
```

## Auto-Fix vs. Flag for Review

**Auto-fix allowed:**
- Minor dependency updates (patch versions)
- Broken internal links (if new target is obvious)
- Missing alt text (add empty alt to decorative images)
- Formatting consistency issues

**Flag for human review (never auto-fix):**
- Major dependency updates
- Schema changes
- Content changes
- Design/brand changes
- Security header modifications
- Performance regressions requiring architecture changes
- Portfolio work descriptions
- Team information updates

## Escalation

If critical issues found:
1. Create GitHub issue with "Critical" label
2. Notify Marco via configured channel
3. Include reproduction steps and recommended fix

## Notes

- This playbook evolves. Chad should propose updates via PR if better checks are discovered.
- The quarterly audit catches technical changes, not paradigm changes. A yearly human review covers strategic shifts.
- For Circulation Studio, maintaining the "anti-slop" standard is a critical audit criterion.
