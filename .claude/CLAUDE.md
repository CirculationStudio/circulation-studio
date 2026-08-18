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
   - **LAUNCH_HANDOFF.md first, and HANDOFF.md with it.** See below for why
   - ARCHITECTURE.md for technical structure
   - DESIGN_SYSTEM.md for brand constraints
   - SITE_ARCHITECTURE.md for content strategy
   - SCHEMA.md for structured data requirements
   - VOICE_ARTICLES.md for the register articles are written in
   - SHORTCODES.md and ARTICLE_SYSTEM.md before touching the article system

## The two handoff documents, and read them before anything else

Neither is derivable from the code, and both exist because a decision that
stays in a conversation is a decision a fresh session cannot see.

**LAUNCH_HANDOFF.md is the launch sequence and the state of everything outside
the repo.** Infrastructure that is configured and how (Resend, Cloudflare KV,
DNS, the four mail records), the cutover steps, what is still waiting on a
person and who, and every decision made in conversation: positioning, pricing,
the rebate disclosure, the network's structure, imagery provenance, and the
reasoning behind every redirect call in `src/_redirects`.

Read it before touching the redirect map, the contact form, or anything to do
with cutover. The map's rules carry short comments; the argument for each one is
in that document.

**HANDOFF.md is the hazards document.** Decisions and traps inside the repo:
`design.md` living in a third project, the `_site` clobbering hazard, the two
emitters of `cs-btn`, the derived header offset that must stay computed.

**Both are append-first.** A decision made in a session goes into the relevant
one before the session ends, or it is lost. This is the same failure the mirror
rule below exists for, in the other direction.

## The shared documents travel in both directions

**VOICE_ARTICLES.md, SEO_LAYER.md and SHORTCODES.md are edited in two places,
so a change to any of them in the article project gets committed to this repo
in the same session, and a change made here gets re-uploaded to the project in
the same session.**

Only the second half of that was ever practised, which is why the rule is
written down now. `VOICE_ARTICLES.md` went to 1.1 in the article project during
the Pass 1 review of `/why-does-yelp-filter-reviews/` and arrived in this
working tree unannounced, where it sat uncommitted across several unrelated
sessions and read as a stray edit nobody could account for. Drift from the
project towards the repo is the direction nothing was watching.

**SEO_LAYER.md is not in this repo at all.** It has never been committed, on
any branch, and the list above does not name it. It is not drift, it is absent,
and it is the one of the three carrying the most accumulated corrections. Until
it lands here it cannot be read before making changes, which is what step 1
above asks for.

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

## The /library/ coming soon flag

**The flag is `comingSoon` in `src/library.njk`.** It is `true` at launch.

While it is true, `/library/` carries a `noindex` meta tag and is absent from
`sitemap.xml`. Both facts come from one computed value, `pageNoindex`, defined in
`tools/eleventy/page-noindex.js` and read by `src/_includes/layouts/base.njk` and
`src/sitemap.njk`. Do not add a second switch. Two independent switches is how a
page ends up listed in a sitemap while still carrying noindex.

**`/library/` is NOT disallowed in `robots.txt`, and must not be.** Blocking it
there stops a crawler fetching the page, and a directive that is never fetched is
never read. Meta noindex needs the page crawlable. The same reasoning is written
out at length in `src/robots.njk`.

### The flip checklist, when articles start publishing there

1. Set `comingSoon` to `false` in `src/library.njk`.
2. Replace the placeholder copy and the placeholder hero image.
3. Confirm `/library/` is linked from nav or footer. It already is, in
   `src/_data/nav.js` under `footer`.
4. **Repoint `/blog` in `src/_redirects` from `/yelp/` to `/library/`.** It is a
   302 today specifically so this stays cheap.
5. Submit `https://www.circulationstudio.com/library/` in Search Console.

**The build will not let this go stale.** A file in `src/library/` without
`fixture: true` while `comingSoon` is still true fails the build, naming the flag
and the files. The check is in `eleventy.config.js`, in the `library` collection.

### The two fixtures

`src/library/pipeline-test.md` and `src/library/whitepaper-test.md` carry
`fixture: true`. They are noindexed and out of the sitemap by the same mechanism,
and they still build at real URLs because `tools/verify/` drives a browser
against those URLs. Do not delete them without also fixing `sweep.mjs`,
`contrast.mjs` and `fixture.manifest.json`. Never set `fixture` on real writing:
it ships the piece invisible to search and nothing else will say so.

## When Lora is self-hosted

Lora is served by Google Fonts today, and the privacy policy names Google Fonts
in its third parties list because that is accurate and it is the only request
that leaves our own infrastructure for a visitor who never submits the form.

**When Lora moves to self-hosted, remove Google Fonts from the third parties list
in `src/privacy-policy.njk` in the same commit.** A disclosure that outlives its
dependency is as wrong as one that was never made, and it is harder to notice.

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
