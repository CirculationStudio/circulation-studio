# Site Architecture

**Project:** Circulation Studio
**Last updated:** 2026-07-13
**Phase:** Phase 2 - Strategy and Structure

## Purpose

This document is the handoff from strategy to development. It defines the sitemap, URL structure, target keywords, internal linking strategy, and conversion goals.

## Tier and Attributes

- **Tier:** Standard (full foundation for agency site)
- **Bilingual:** No. English only, decided 2026-07-27. See Language below.
- **Blog:** Yes (thought leadership and updates)
- **Booking:** No (contact forms only)
- **Answer Engine (AEO):** Yes (for AI discoverability)
- **PWA:** No

## Sitemap

[To be completed during Phase 2 after keyword research and search-intent mapping]

Standard agency sitemap structure:

```
/ (Home)
  /services (What we do)
    /services/[service-name] (Individual services)
  /work (Portfolio / Case studies)
    /work/[project-slug] (Individual projects)
  /about (Team & story)
  /blog (Thought leadership)
    /blog/[post-slug] (Individual posts)
  /contact (Get in touch)
```

## URL Structure

**Convention:** lowercase, hyphenated, no accents in slugs

[Map each page URL here]

| Page | URL | Target Keyword | Search Intent | Conversion Goal |
|------|-----|----------------|---------------|-----------------|
| Home | / | circulation studio | Navigational | View work / Contact |
| Services | /services | [keyword] | [intent] | [goal] |
| Work | /work | [keyword] | [intent] | [goal] |
| About | /about | [keyword] | [intent] | [goal] |
| Blog | /blog | [keyword] | [intent] | [goal] |
| Contact | /contact | [keyword] | [intent] | [goal] |

[Add all pages during Phase 2]

## Internal Linking Strategy

[Map which pages link to which, and identify priority pages]

Priority pages (highest internal link value):
1. Home
2. Work (Portfolio)
3. Services

## Entity Establishment

Consistent NAP (Name, Address, Phone) across all pages and platforms:

- **Business name:** Circulation Studio
- **Address:** San Miguel de Allende, Guanajuato, Mexico
- **Phone:** [To be confirmed]
- **Email:** [To be confirmed]

**sameAs links** (for entity recognition):
- [Link to LinkedIn]
- [Link to Instagram]
- [Link to other verified social profiles]

## Language

**This site is English only. Decided 2026-07-27. This is settled, not pending.**

Do not build a language switcher, Spanish mirror URLs, an `/es/` tree,
hreflang tags, or any dual-language content model. Do not reintroduce them as
"future" scaffolding either. If a task seems to call for bilingual structure,
the task is wrong, not this decision.

Why it was in here in the first place: bleed-over from Eluvia, the sister
agency, which is the bilingual one. Circulation Studio is US-focused.

**Do not confuse this with the team's bilingual capability, which is real and
stays.** That the team speaks English and Spanish is a client benefit and
belongs in Who We Are copy. It says something about the PEOPLE, not about the
SITE. Removing that copy would be the opposite mistake.

## Migration Considerations (if rebuild)

[Document old site URL inventory and redirect mapping if this is a rebuild]

## Content Provenance

- **Copy source:** Agency-AI (we write our own copy)
- **Image source:** Agency-produced (portfolio work, team photos)
- **Content deadline:** N/A (internal project)

## Notes

This document is the contract Marco builds against. All development work references this sitemap and keyword mapping.
