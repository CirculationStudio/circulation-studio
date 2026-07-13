# Architecture

**Project:** Circulation Studio
**Last updated:** 2026-07-13

## Purpose

This document is the technical map for the Circulation Studio website. It references other documentation files and never duplicates them.

## Stack

- **Static site generator:** Eleventy v3
- **CSS:** Tailwind v4 (@theme tokens, no tailwind.config.js)
- **Hosting:** Cloudflare Pages
- **CDN:** Bunny CDN
- **Build tool:** Vite

## File structure

See the repo root for the complete directory tree. Key locations:

- `/src/` - Source files (HTML templates, CSS, JS)
- `/src/css/` - Organized as base/, components/, pages/
- `/src/js/pages/` - Page-specific scripts
- `/src/_includes/components/` - Reusable component macros
- `/.claude/` - Agent instruction files

## Documentation references

- **Design system:** See DESIGN_SYSTEM.md for brand colors, typography, spacing, components, and forbidden patterns
- **Deployment:** See DEPLOYMENT.md for Cloudflare configuration, headers, redirects, environment variables, and performance budget
- **Site structure:** See SITE_ARCHITECTURE.md for sitemap, URLs, keyword mapping, and internal linking strategy
- **Structured data:** See SCHEMA.md for JSON-LD schema types per page template
- **Brand voice:** See voice-tone.md for writing guidelines (if applicable)

## Build commands

```bash
npm install          # Install dependencies
npm run build        # Production build
npm start            # Development server
```

## Deployment

Frontend deploys automatically via Cloudflare Pages on push to main.

For detailed deployment configuration, see DEPLOYMENT.md.

## Conventions

- URLs: lowercase, hyphenated, no accents in slugs
- Commits: surgical, never `git add -A`
- No em dashes anywhere in code, comments, or content
- Accessibility built in from the start (see Phase 5 checklist in Web Build Master Roadmap)

## Agent files

Claude Code and Chad (the autonomous agent) read `.claude/CLAUDE.md` for standards, brand limits, and constraints. The quarterly audit playbook is in `.claude/AUDIT_AGENT.md`.
