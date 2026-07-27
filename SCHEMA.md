# Schema (Structured Data)

**Project:** Circulation Studio
**Last updated:** 2026-07-13
**Phase:** Phase 6 - Technical SEO and Structured Data

## Purpose

This document specifies which structured data (JSON-LD schema) each page template receives. This is critical for AI answer engines and search visibility.

## Schema Validation

All schema blocks must be validated at https://validator.schema.org/ before deployment.

## Schema by Page Template

[To be completed during Phase 6 after strategy handoff]

### NAP: read it from the data file, never re-type it

**The canonical NAP lives in `src/_data/site.js`, in the `nap` object.** It is
the single source of truth for the business name, address and phone.

Its keys deliberately use schema.org `PostalAddress` field names, so a JSON-LD
block maps straight across with no transcription step and no chance of a typo
drifting the entity apart:

```njk
"address": {
  "@type": "PostalAddress",
  "streetAddress": "{{ site.nap.streetAddress }}",
  "addressLocality": "{{ site.nap.addressLocality }}",
  "addressRegion": "{{ site.nap.addressRegion }}",
  "postalCode": "{{ site.nap.postalCode }}",
  "addressCountry": "{{ site.nap.addressCountry }}"
},
"telephone": "{{ site.nap.telephone }}",
"email": "{{ site.nap.email }}"
```

The footer colophon already renders from this object. The Contact page and
every schema block must do the same, so the visible NAP and the encoded NAP
cannot disagree. CLAUDE.md requires schema to match visible content exactly,
and inconsistent NAP is an entity-resolution problem for search engines.

**The address is Laguna Beach, California.** Docs previously carried a San
Miguel de Allende, Mexico address, including in the schema template below.
That was stale bleed-over and is wrong. Confirmed 2026-07-27. Do not
reintroduce it.

### Home Page

**Schema type:** Organization

Values below are shown resolved for reference. When implementing, reference
`site.nap` rather than pasting these literals.

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Circulation Studio",
  "description": "Creative agency based in Laguna Beach, California",
  "url": "[Website URL]",
  "logo": "[Website URL]/images/logo.svg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1278 Glenneyre St #267",
    "addressLocality": "Laguna Beach",
    "addressRegion": "CA",
    "postalCode": "92651",
    "addressCountry": "US"
  },
  "telephone": "(949) 464-7246",
  "email": "info@circulationstudio.com",
  "sameAs": [
    "[LinkedIn URL]",
    "[Instagram URL]",
    "[Other verified profiles]"
  ],
  "foundingDate": "[Date]",
  "foundingLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Laguna Beach",
      "addressRegion": "CA",
      "addressCountry": "US"
    }
  }
}
```

[Refine with actual data during implementation]

### Services Page

**Schema type:** Service

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "[Service name]",
  "provider": {
    "@type": "Organization",
    "name": "Circulation Studio"
  },
  "description": "[Service description]"
}
```

[Define individual service schemas during Phase 6]

### Work/Portfolio Page

**Schema type:** ItemList or CreativeWork

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "CreativeWork",
      "name": "[Project name]",
      "description": "[Project description]",
      "creator": {
        "@type": "Organization",
        "name": "Circulation Studio"
      }
    }
  ]
}
```

[Define during Phase 6]

### About Page

**Schema type:** AboutPage

[Define during Phase 6]

### Contact Page

**Schema type:** ContactPage

[Define during Phase 6]

### Blog Posts

**Schema type:** Article or BlogPosting

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Post title]",
  "author": {
    "@type": "Person",
    "name": "[Author name]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Circulation Studio",
    "logo": {
      "@type": "ImageObject",
      "url": "[Logo URL]"
    }
  },
  "datePublished": "[ISO date]",
  "dateModified": "[ISO date]",
  "description": "[Meta description]"
}
```

### Team Members (on About page)

**Schema type:** Person

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[Name]",
  "jobTitle": "[Role]",
  "worksFor": {
    "@type": "Organization",
    "name": "Circulation Studio"
  }
}
```

## Answer Engine Module

For AI agent discoverability:

- [ ] Create `llms.txt` in root with agency overview, services, and notable work
- [ ] Create `agents.md` in `.well-known/` if transactional capabilities added
- [ ] Define what the agency offers and key pages for agents

## UCP Manifest (if agent commerce applies)

If applicable for agent discovery:

- [ ] Create `/.well-known/ucp/manifest.json` (UCP spec version 2026-01)
- [ ] Ensure manifest points to real working endpoint

## Notes

Schema is how the agency gets found in AI answers. It must not regress. Every schema block must be validated and tested before deployment.
