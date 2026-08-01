# Claude Instructions

**Project:** Circulation Studio
**Last updated:** 2026-07-13
**For:** Claude Code and Chad (autonomous agent)

## Purpose

This file contains the rules, standards, and brand constraints that all AI agents must follow when working on this project. This ensures consistency, maintains brand integrity, and prevents generic/machine-generated aesthetics.

## Hard Rules (Never Break These)

### Universal constraints

- **NO em dashes anywhere** (use commas, periods, parentheses)
- **NO banned filler phrases:**
  - "Unlock your potential"
  - "Leverage our expertise"
  - "Cutting-edge solutions"
  - "Seamless experience"
  - "Game-changing"
  - "We help businesses grow"
  - "Your success is our mission"
  - "Transform your brand"
  - "Next-level"
  - "Disruptive"
  - [Add brand-specific banned phrases from DESIGN_SYSTEM.md during Phase 3]
- **NO unauthorized changes** to content without approval
- **NO AI-generated imagery** posing as real photography where authenticity is claimed
- **NO accessibility overlays** (they raise legal risk, not lower it)
- **NO generic "agency" aesthetics** (this is Circulation Studio, distinctive by design)

### Code and development standards

- Always reference ARCHITECTURE.md for technical decisions
- Follow the file structure defined in the repo root
- Use semantic HTML for agent-readability
- Build for editability: separate content from layout using clean `_data` files
- Never hardcode markup that a component covers
- Accessibility is built in from the start (WCAG 2.1 AA minimum)
- Commits are surgical: never `git add -A`
- URLs: lowercase, hyphenated, no accents in slugs

### Brand constraints (from DESIGN_SYSTEM.md)

[This section will be populated during Phase 3 after DESIGN_SYSTEM.md is completed. It mirrors the Forbidden Patterns section.]

#### Typography

- **Approved fonts:** [To be defined in DESIGN_SYSTEM.md]
- **BANNED:** Inter font or other generic defaults

#### Colors

- **Approved palette:** [To be defined in DESIGN_SYSTEM.md]
- **BANNED:** Generic purple-to-blue AI gradients, default indigo/blue, "startup" color schemes

#### Iconography

- **Approved icon system:** [To be defined in DESIGN_SYSTEM.md]
- **BANNED:** Unmodified stock icons, default Lucide icons without customization

#### Voice (agency-AI provenance)

[Reference VOICE_ARTICLES.md for the register articles are written in]

Key principles:
- Authentic and grounded (not generic agency speak)
- Clear over clever
- Human expertise guiding technology

## Component Usage

[Document reusable components and their correct usage patterns after Phase 5]

### Heroes
[Guidelines]

### Cards
[Guidelines]

### Forms
[Guidelines]

### CTAs
[Guidelines]

## Content Guidelines

### For agency-AI content (our approach)

- Follow VOICE_ARTICLES.md for all article copy: it governs the register, and
  its seven rules and banned constructions are as binding as the house list above
- Never invent claims, credentials, or facts that cannot be verified
- All generated copy must be reviewed before deployment
- Lead with value and clarity, not marketing speak
- Use concrete examples over abstract claims

### All provenance types

- Legal, pricing, and claims content NEVER auto-generated or auto-edited
- Schema/structured data must match visible content exactly
- Alt text on every meaningful image, empty alt on decorative images
- Portfolio work must be accurately represented

## SEO and Structured Data

- Title tag and meta description must be unique per page, keyword-aligned from SITE_ARCHITECTURE.md
- Implement JSON-LD schema exactly as specified in SCHEMA.md
- Validate all schema blocks at validator.schema.org
- Schema must not regress (it's how the agency gets found in AI answers)
- Organization schema critical for entity establishment

## Performance Standards

### Core Web Vitals targets (75th percentile)

- **LCP:** < 2.5s
- **INP:** < 200ms
- **CLS:** < 0.1

### Asset optimization

- Hero images: `loading="eager"` + `fetchpriority="high"` + preload
- Below-fold images: `loading="lazy"`
- Portfolio images: optimized but maintain quality (this is work showcase)
- All images: explicit width/height attributes (prevents layout shift)
- Target < 300KB per image (portfolio may be slightly larger if needed for quality)
- Serve WebP/AVIF with fallback

### JavaScript discipline

- Keep scripts minimal
- Defer or async everything non-critical
- No long main-thread tasks
- No `transition: all` (causes INP issues)

## Build Workflow

1. Read all relevant documentation before making changes:
   - ARCHITECTURE.md for technical structure
   - DESIGN_SYSTEM.md for brand constraints
   - SITE_ARCHITECTURE.md for content strategy
   - SCHEMA.md for structured data requirements
   - VOICE_ARTICLES.md for the register articles are written in
   - SHORTCODES.md and ARTICLE_SYSTEM.md before touching the article system

2. Make changes following all constraints above

3. Verify accessibility, performance, and brand compliance

4. Test build: `npm run build`, then `npm run verify` if the article system was touched

5. Check preview deployment before considering complete

## What Claude Code and Chad Should NOT Do

- Never generate or modify legal disclaimers, privacy policies, or terms without explicit instruction
- Never modify portfolio work descriptions without verification
- Never claim credentials or expertise not verified
- Never use stock photography for portfolio work or team photos
- Never skip accessibility requirements to move faster
- Never compromise performance targets for visual effects
- Never drift toward generic "agency" aesthetics

## What Claude Code and Chad SHOULD Do

- Proactively flag potential accessibility issues
- Suggest performance improvements when noticed
- Point out inconsistencies with DESIGN_SYSTEM.md constraints
- Recommend structured data opportunities aligned with SCHEMA.md
- Ensure all work is agent-readable (semantic HTML, clean structure)
- Build with the assumption that both humans and AI agents will consume the content
- Maintain the "anti-slop" standard (distinctive, not generic)

## Business location and NAP

**The canonical NAP lives in `src/_data/site.js`, in the `nap` object.**
Confirmed 2026-07-27.

- Circulation Studio, 1278 Glenneyre St #267, Laguna Beach, CA 92651, US
- (949) 464-7246 / info@circulationstudio.com

- NEVER re-type the NAP into a template, a schema block, or a doc. Read it
  from `site.nap`. The footer already does
- The `nap` keys use schema.org `PostalAddress` field names, so JSON-LD maps
  across with no transcription step
- Visible NAP and encoded NAP must match byte for byte. Inconsistent NAP is an
  entity-resolution problem for search engines, and this file already requires
  schema to match visible content exactly
- **NEVER describe the studio as based in San Miguel de Allende or Mexico.**
  Earlier docs did, including a full Mexico address in SCHEMA.md's
  Organization template. It was stale bleed-over and it was wrong. If a task
  appears to call for it, the task is working from stale source material

## Language

**This site is English only. Decided 2026-07-27. Settled, not pending.**

- NEVER build a language switcher, an `/es/` tree, Spanish mirror URLs,
  hreflang tags, or any dual-language content model
- NEVER add these back as dormant "future" scaffolding
- This was Eluvia bleed-over (the bilingual sister agency). Circulation Studio
  is US-focused
- If a task appears to call for bilingual structure, the task is wrong. Flag
  it rather than building it

**Separate and unaffected:** the team's bilingual capability is real and stays.
That the team speaks English and Spanish is a client benefit and belongs in
Who We Are copy. It describes the PEOPLE, not the SITE. Do not strip that copy
while cleaning up site structure.

## References

- See `.claude/README.md` for how different agents should use this file
- See `.claude/AUDIT_AGENT.md` for the quarterly audit checklist
- See all root-level .md files for detailed specifications

---

**Remember:** Circulation Studio embodies the "anti-slop" philosophy. This site must be distinctive, accessible, performant, and agent-readable. Every choice should serve those goals and reflect human taste guiding technology.
