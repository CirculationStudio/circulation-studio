# .claude/ Directory

**Project:** Circulation Studio
**Last updated:** 2026-07-13

## Purpose

This directory contains instructions and playbooks for AI agents working on this project. Different agents read different files based on their role.

## Files in This Directory

### CLAUDE.md

**Who reads it:** Claude Code (interactive development agent) and Chad (autonomous overnight agent)

**What it contains:**
- Hard rules and constraints (forbidden patterns, code standards)
- Brand constraints mirrored from DESIGN_SYSTEM.md
- Component usage guidelines
- Content and copy rules
- SEO and structured data requirements
- Performance standards
- Build workflow
- Bilingual considerations

**When to read it:**
- Claude Code: Before starting any work on this project
- Chad: Before any autonomous build or optimization task

### AUDIT_AGENT.md

**Who reads it:** Chad (autonomous quarterly audit agent)

**What it contains:**
- Quarterly audit checklist
- Automated checks for performance, accessibility, security
- Grep patterns for brand constraint compliance
- Dependency update guidelines
- Auto-fix vs. flag-for-review rules
- Audit report format
- Bilingual integrity checks

**When to read it:**
- Chad: Every quarter for scheduled audits
- Chad: On-demand when triggered for spot checks

### This File (README.md)

**Who reads it:** All agents (Velu, Claude Code, Chad)

**What it contains:**
- Guide to this directory structure
- Which agent reads which file
- How to use these files effectively

## How Each Agent Should Use These Files

### Claude Code (Interactive Development)

1. **Before starting work:**
   - Read CLAUDE.md completely
   - Read all referenced root-level documentation (ARCHITECTURE.md, DESIGN_SYSTEM.md, etc.)
   - Understand constraints before proposing solutions
   - Pay special attention to the "anti-slop" standard

2. **During work:**
   - Reference CLAUDE.md for brand constraints and forbidden patterns
   - Follow code standards and component guidelines
   - Check performance and accessibility requirements
   - Ensure bilingual integrity

3. **Before completing:**
   - Verify work against CLAUDE.md checklist
   - Ensure no hard rules were violated
   - Confirm distinctiveness (not generic agency aesthetics)

### Chad (Autonomous Overnight Agent)

**For build/optimization tasks:**
1. Read CLAUDE.md for all constraints
2. Read task-specific documentation (e.g., SITE_ARCHITECTURE.md for new pages)
3. Execute work within defined constraints
4. Verify against CLAUDE.md before completing

**For quarterly audits:**
1. Read AUDIT_AGENT.md
2. Execute all checklist items
3. Generate report
4. Apply auto-fixes where allowed
5. Create PR for items requiring review

### Velu (Project Management AI)

**For project setup:**
1. Read this README to understand agent structure
2. Reference SITE_ARCHITECTURE.md for project scope and phases
3. Create tasks aligned with documented phases

**For task assignment:**
1. Ensure assigned agent has access to relevant documentation
2. Include references to specific sections of CLAUDE.md if constraints apply

## Documentation Hierarchy

```
Root documentation (human-authored, agent-referenced)
├── ARCHITECTURE.md - Technical structure
├── DESIGN_SYSTEM.md - Brand and visual constraints
├── DEPLOYMENT.md - Hosting and deployment config
├── SITE_ARCHITECTURE.md - Content strategy and sitemap
├── SCHEMA.md - Structured data specifications
└── voice-tone.md - Writing guidelines

.claude/ (agent-specific instructions)
├── CLAUDE.md - Build and optimization rules
├── AUDIT_AGENT.md - Quarterly audit playbook
└── README.md - This file (how to use agent docs)
```

## Keeping These Files Current

### When to update CLAUDE.md
- After Phase 3 (Design) completion: Mirror Forbidden Patterns from DESIGN_SYSTEM.md
- When component patterns are established in Phase 5
- When new constraints or standards are discovered
- When brand guidelines change
- When bilingual structure evolves

### When to update AUDIT_AGENT.md
- When new automated checks are available
- When audit process improves
- When new tools are added to the workflow
- Quarterly review by Chad (propose improvements via PR)

### When to update this README.md
- When new agent types are introduced
- When workflows change
- When file structure in .claude/ changes

## References

All agents should reference the Web Build Master Roadmap (in Velu or project documentation) for the full build process, phases, and deliverables. These .claude/ files are tactical implementation guides, not strategic blueprints.

## Circulation Studio Specifics

This is the flagship agency site. It embodies the "anti-slop" philosophy:
- Human taste and judgment guide AI tools
- Distinctive by design, never generic
- Grounded in place (San Miguel de Allende)
- Clear over clever in communication

All agents working on this project must maintain these principles.

---

**Remember:** These files exist to ensure consistency, maintain brand integrity, and prevent generic AI outputs. They are the guardrails that keep human taste and intention at the center of AI-assisted work.
