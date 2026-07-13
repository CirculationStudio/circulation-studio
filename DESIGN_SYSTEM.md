# Design System

**Project:** Circulation Studio
**Last updated:** 2026-07-13

## Brand Overview

[To be completed during Phase 3 - Brand and Design]

Circulation Studio is a creative agency based in San Miguel de Allende, Mexico. The design should reflect authenticity, craft, and modern sophistication.

## Color Tokens

[Define the locked color palette here after design direction is set]

```css
/* Example structure - replace with actual brand colors */
--color-primary: ;
--color-secondary: ;
--color-accent: ;
--color-neutral-dark: ;
--color-neutral-light: ;
--color-background: ;
--color-text: ;
```

## Typography

[Define fonts and weights after design direction is set]

- **Primary font:** [To be defined]
- **Secondary font:** [To be defined]
- **Weights allowed:** [To be defined]

```css
/* Example structure - replace with actual brand fonts */
--font-primary: ;
--font-secondary: ;
```

## Spacing

[Define spacing scale using Tailwind tokens]

## Components

[Document component patterns after mockups are approved]

### Heroes
[Specifications]

### Cards
[Specifications]

### CTAs
[Specifications]

### Forms
[Specifications]

## Forbidden Patterns (Anti-Slop Standard)

This section lists the banned defaults to prevent generic, machine-generated aesthetics. These rules are mirrored in `.claude/CLAUDE.md`.

### Banned defaults

- **NO** Inter font (choose a distinctive typeface)
- **NO** generic purple-to-blue AI gradients
- **NO** default stock icons without customization
- **NO** banned filler phrases:
  - "Unlock your potential"
  - "Leverage our expertise"
  - "Cutting-edge solutions"
  - "Seamless experience"
  - "Game-changing"
  - "We help businesses grow"
  - "Your success is our mission"
  - [Add brand-specific banned phrases]
- **NO** em dashes anywhere (use commas, periods, parentheses)
- **NO** AI-generated imagery posing as real photography where authenticity is claimed
- **NO** generic "agency" aesthetics

### Brand choices

[Document the actual design choices that replace the banned defaults]

- **Chosen fonts:** [To be defined]
- **Chosen color palette:** [To be defined]
- **Custom iconography approach:** [To be defined]
- **Brand voice principles:** [Reference voice-tone.md if applicable]

## Accessibility Standards

All designs must meet WCAG 2.1 AA minimum:

- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Color never the only way information is conveyed
- Visible focus states on all interactive elements
- Respect `prefers-reduced-motion` for animations

## Design Approval Gate

Before any code is written:

- [ ] Ana (Visual Media Manager) approves creative direction
- [ ] Steve (founder) approves design direction
- [ ] Design passes the Anti-Slop Gate (distinctiveness check)
