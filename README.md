# Circulation Studio

Creative agency website built following the Circulation Studio Web Build Master Roadmap.

## Project Status

**Current Phase:** Phase 1 - Discovery and Intake

This repository has been scaffolded with the standard file structure. The build will proceed through the following phases:

1. Discovery and Intake
2. Strategy and Structure
3. Brand and Design
4. Repo and Foundation
5. Build
6. Technical SEO and Structured Data
7. Performance and Assets
8. Testing and QA
9. Launch
10. Post-Launch and Ongoing

## Documentation

All project documentation is in the root directory:

- **ARCHITECTURE.md** - Technical structure and stack
- **DESIGN_SYSTEM.md** - Brand colors, typography, components, and forbidden patterns
- **DEPLOYMENT.md** - Cloudflare Pages configuration and deployment process
- **SITE_ARCHITECTURE.md** - Sitemap, URLs, keywords, and content strategy
- **SCHEMA.md** - Structured data specifications
- **voice-tone.md** - Brand voice guidelines

## Agent Instructions

The `.claude/` directory contains instructions for AI agents:

- **CLAUDE.md** - Rules for Claude Code and Chad
- **AUDIT_AGENT.md** - Quarterly audit playbook
- **README.md** - Guide to agent documentation

## Stack

- **Static Site Generator:** Eleventy v3
- **CSS:** Tailwind v4
- **Hosting:** Cloudflare Pages
- **CDN:** Bunny CDN

## Development

```bash
# Install dependencies
npm install

# Development server
npm start

# Production build
npm run build
```

## Build Standards

- No em dashes anywhere
- Accessibility built in from the start (WCAG 2.1 AA)
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Agent-readable: semantic HTML, clean structure, proper schema
- Brand-compliant: follows DESIGN_SYSTEM.md constraints
- Anti-slop standard: distinctive by design, never generic

## Project Structure

```
circulation-studio/
├── ARCHITECTURE.md
├── DESIGN_SYSTEM.md
├── DEPLOYMENT.md
├── SITE_ARCHITECTURE.md
├── SCHEMA.md
├── voice-tone.md
├── .claude/
│   ├── CLAUDE.md
│   ├── AUDIT_AGENT.md
│   └── README.md
└── src/
    ├── _headers
    ├── _redirects
    ├── site.webmanifest
    ├── css/
    │   ├── base/
    │   ├── components/
    │   └── pages/
    ├── js/
    │   └── pages/
    └── _includes/
        └── components/
```

## Notes

- Favicon files (favicon.ico, favicon.svg, apple-touch-icon.png) will be added in Phase 7
- Eleventy and Tailwind configuration will be set up in Phase 4
- All documentation files contain placeholders that will be filled during the appropriate phases
- The site is English only by decision (2026-07-27). No language switcher, no
  `/es/` tree, no hreflang. See SITE_ARCHITECTURE.md. This is separate from the
  team's bilingual capability, which is real and belongs in Who We Are copy.

## Philosophy

This site embodies the Circulation Studio "anti-slop" philosophy:
- Human taste and judgment guide AI tools
- Distinctive by design, never generic
- Grounded in place (San Miguel de Allende)
- Clear over clever in communication

## Reference

This build follows the conventions documented in the Web Build Master Roadmap maintained by Circulation Studio.
