# Circulation Studio: launch handoff

Written 2026-08-16, end of Website Redesign #3. Revised 2026-08-19.
Read this, then the repo and `HANDOFF.md`. This document is the launch
sequence and the state of everything that lives outside the repo.

The site is built and the launch blockers are done. What remains is the
article migration and cutting over.

---

## What changed on 2026-08-19

**The launch blocker session finished**, all six tasks, and the
above-title was retired in a second session on top of it.

### The above-title is gone from the site

Twenty-six instances existed. Two came off Who We Are, twelve more came
off the other ten templates, and twelve stayed because they were never
above-titles: a figcaption, a deck sitting below its own h2, the booking
label, the labels that tell one card or pricing tier or report column
from the next, two reply-time commitments, and the "internal tool, not
for publication" warning on the map page. Each was classified against
one test, the one the Results discipline tag passed: a decorative label
introducing a block goes, real data or content stays.

**Nothing was a heading.** All twenty-six were `<p>`, `<span>` or
`<figcaption>`, so no document outline changed on any page about to be
indexed for the first time.

**Section rhythm moved 96px to 88px**, and it lived in three places, not
one: a `--space-96` token used 36 times, Tailwind `py-24` utilities in
six templates, and `section.njk`'s own default. `--rhythm-section` is a
new semantic token for the between-sections step only; `--space-96`
still means 96px and still serves component padding and grid gaps.

**Orientation moved into the masthead's left slot.** Past 96px of scroll
the slot answers which section you are in rather than where the studio
is, with an 18px madder tick as the only distinguishing mark. It rides
the existing scroll listener, so there is still exactly one on the site
and no observer that can disagree with it. On mobile the wordmark's text
is replaced while its link, isotype and accessible name stay identical.
Both slots are `aria-hidden`: the label duplicates the heading the
reader is already inside and its content changes on scroll.

Forty-six section names across nine pages, plus four on Who We Are.
Five are the retired labels word for word.

**Commit four of the original brief was dropped.** It asked for
everything still wearing the small-caps letterspaced treatment to be
retired alongside the above-title. That treatment is `h1, h2, h3`
themselves in `base/elements.css`, and 125 selectors including the
wordmark, every button, the nav and the colophon. It is the display
voice of the whole site, not a decoration sitting beside its
replacement. Retiring it is a redesign and wants `design.md` open.

### The `_site` clobbering hazard is fixed

`npm run verify` now builds and serves `_check`, `npm run measure:stats`
builds `_measure`, and `eleventy --serve` keeps `_site`. They no longer
share a directory, so a dev server running in another terminal cannot
overwrite the artifact a measurement is reading.

It cost real time before it was fixed, three more times in these two
sessions, and never once by failing: a clobbered build has no stylesheet
link and measures fine, returning numbers that look real. Verified by
running the full suite with a watcher alive, then again with `_site`
deliberately replaced by a one-line stub. Both passed.

`HANDOFF.md` keeps the original section as the record, marked fixed.

### Two things found by measuring that nobody had recorded

**The fingerprint hashes an element's first class name**, not only its
typography. Its own header does not say so. Renaming a class moves the
hash with nothing about the rendering having changed, which is what
`py-24` becoming `py-22` did on two pages that lost no element. Worth
knowing before reading a hash-moved-count-held result as a regression.
Documented in that file now.

**No page is at zero CLS, and it is not the orientation label.**
`/thank-you/` declares no sections, so that label never renders there,
and it has the worst shift on the site. The cause is `--cs-h-exp`: the
masthead and its spacer both read it with a `217px` fallback while the
measured value is `216.67px`, so the spacer shrinks by a third of a
pixel after first paint and everything below it moves. That arrived with
the Header Condense work on 2026-08-15 and had not been measured since.

Everything is inside budget, worst CLS 0.0143 against 0.1 and worst LCP
472ms against 2500, so this is a defect rather than a failure. The fix
is one value and it wants its own commit and its own measurement.

**JavaScript is up 71%**, 5528 to 9433 bytes, 2600 to 4089 gzipped, for
the contact handler and the orientation machinery. CLAUDE.md asks for
minimal scripts, so it is stated rather than buried. Still one file,
still identical on every page.

---

## What changed on 2026-08-18

The launch blockers moved from a list to a running Claude Code session.
Six tasks, six commits, in order, stopping after each. Everything in
section 3 of the previous version of this document is now that session's
scope and is tracked there rather than here.

The redirect map is decided in full and is no longer waiting on Connor.
Resend and Cloudflare KV are configured. Nine decisions made in
conversation are recorded below rather than left in a thread.

**Connor's cost-per-lead data is not a launch blocker.** It gates
bracketed figures in articles and the whitepaper, and brackets stop a
page reaching production, not the site reaching DNS. Treat it as
post-launch. The backlink export is the same: the redirect map is
written against the live sitemap and Search Console rows append into a
reserved stub later.

---

## What exists

**Marketing pages, all built:** Home, Who We Are, What We Do, Results,
Contact, plus `/network/` and `/about-this-site/` in the footer.

**Yelp:** the hub at `/yelp/`, `/yelp-partners/`,
`/yelp-rank-tracking-tool/`, and one published whitepaper.

**Internal:** `/yelp-map/`, the topical authority map, noindexed four
ways, derived from the build and from `src/_data/yelpMap.js`. This is the
page to open when you lose track of where anything is.

**Interaction systems, all shipped:** buttons carry the red bar on
hover, a plate press on active, registration marks on focus. Links have
their own family. The header condenses into a split nav with a derived
offset, and past the same threshold its left slot names the section you
are in. The contact form has four completeness prompts, client-side and
ungated, and posts to a real handler that records every submission
before it attempts delivery.

**Article system:** 20 LIVE shortcodes plus `image` and `screenshot`.
The audit strip renders on every article on the preview host, listing
bracketed values, observed markers, and placeholder image slots.

**Deploy:** `pages.dev` is noindexed and gated on `SITE_LIVE=1`. Flip it
at cutover.

---

## The launch sequence

### 1. The launch blocker session, DONE 2026-08-19

Six tasks, one commit each: sitemap generation, the `/library/` coming
soon flag, the redirect map, the contact form handler, the two policy
pages, and the credential audit. All six landed, plus the above-title
retirement in a session after them.

The `/thank-you` ordering gap closed as planned: it 404d between the
redirect commit and the contact commit and has been a real page since.

### 2. Still needs a person

| What | Owner | Gates |
|---|---|---|
| Cost-per-lead data, by client and trade | Connor | Whitepaper section 6, the `$307` stat, ~12 FAQ answers, all four cost-and-pricing spokes, seven brackets in article 4. Post-launch |
| Search Console backlink export | Connor | Additional redirect rows, appended to a reserved stub. Post-launch |
| Portfolio display dimensions, re-measured | Steve, browser | Article 2 |
| Four Portfolio behaviours re-observed | Steve, managed account | Article 2 |
| Does the dental filter-rate study exist? | Steve | Article 3's conclusion |
| Client permissions, in writing | Steve | The Results page. Yelp partner rules make this mandatory before any client metric is published |
| Yelp rep: partner count, rebate disclosure limits, standalone Portfolio pricing | Steve | Partners page copy |

Client permissions are the one on this list that touches cutover. Send
one email per client whose metric appears on Results. Anything
unreturned comes off the page.

### 3. `design.md` amendments

`design.md` lives in a third Claude Design project, "Circulation Studio
Design System". Not in the repo, not in the comps project. Ten numbered
sections.

**It contradicts the repo.** §5 is LOCKED at 140ms and 220ms as the only
durations, and the header shipped three more. §5 still describes the
tracking snap and the outline fill as the button's physics, both
retired.

Owed: the retired snap, the three new durations, the seventh button
variant, the refined link pair, the visited tint, bar/plate/marks, and
the condensed header geometry.

This is documentation debt, not a launch blocker. It costs when the next
comp is built and measured against a document that no longer describes
the site. If nothing is being comped before DNS, it can follow the six
tasks.

### 4. Finish the article migration

Four articles. Pipeline runs in the "Circulation Studio Article
Processing" project, three passes with a checkpoint after each.

| Article | State | Needs |
|---|---|---|
| `/difference-between-yelp-personal-business-account` | SHIPPED | Nothing |
| `/yelp-portfolios-optimization` | Pass 1 approved | Pass 2 with dimensions bracketed, then Pass 3 |
| `/why-does-yelp-filter-reviews` | Pass 2 revised | Pass 3 |
| `/is-yelp-advertising-worth-it` | Pass 2 done | Pass 3 |
| `/yelp-enhanced-profile` | HOLD | An audience decision, see below |

Nothing is blocked. Brackets ship to the dev site; they only stop a page
reaching production.

**Article 3 is the one to finish first.** The live page currently tells
readers to befriend reviewers, coach filtered reviewers into building
activity, and vote on reviews of their own business. All three make
filtering more likely and all three violate Yelp partner rules. It has
been live for years, which is a reason to cut over sooner rather than to
delay.

**Article 5 is not a naming problem.** Enhanced Profile moved up-market
to regional and national footprints; the Upgrade Package is the
single-location equivalent. So the page describes a product most clients
cannot buy. Decide whether it retargets to Upgrade Package with a
multi-location section, or splits in two. That is a keyword call.

**All four articles publish back to their root-level URLs.**
`ROOT_URL_SLUGS` in `tools/eleventy/article-directory-data.js` gains
`/yelp-portfolios-optimization` as a fifth member, and each of the four
carries a 302 to `/yelp/` in the meantime. The build assertion described
below is what makes those redirects safe.

### 5. New spokes

28 planned, in `src/_data/yelpMap.js`, visible on `/yelp-map/`.

`/how-do-yelp-ads-work/` is the best first one: cluster anchor, no
first-party data needed, no sibling overlap, entirely documented on
Yelp's own properties.

**The pillar, `/yelp-advertising-guide/`, does not exist.** Every spoke
carries an interim up-link to `/yelp/`. One pass retargets them all when
it ships. 28 spokes pointing at a service page is not a hub and spoke
structure.

**Three clusters have zero live FAQ link targets.** The 50-FAQ page
ships with 38 links stripped until spokes exist.

### 6. Cutover

Set `SITE_LIVE=1`. Point DNS at Pages. Confirm www, trailing slashes,
canonical tags, and the redirect map before, not after.

The DNS half is two records in Cloudflare, both currently DNS only:

- Root `A` at `34.237.47.210`
- `www` `CNAME` to `plum5562720.brizy.site`

Both become the Pages target and both want the orange cloud so
Cloudflare serves the site. Nothing else in the zone changes. The Zoho
`MX` records on the root and the four Resend records stay untouched.

---

## Decisions made in conversation, recorded here because they are
nowhere else

### Positioning, pricing, and the network

**Positioning.** The site is not a funnel. Two inquiries a quarter is
fine. It exists to be the proof that the studio does not need to
advertise, which means the Yelp cluster is the argument rather than a
marketing project. Restraint is demonstrated, never stated.

**Pricing.** Goes where a price answers the page's question: the
partners page, `/yelp-ads-management-pricing/` when it exists, and the
service pages. Not on informational spokes. Two tiers, split by scope
rather than by client size: narrow-scope services under $1,000 a month,
ongoing engagements from $2,000, phrased as "currently accepting".

**The rebate.** Disclose it. Yelp publishes the program itself, FTC
guidance requires disclosing material connections, and undisclosed media
rebates are what produced the ANA transparency crisis. Say three things
separately: Yelp pays partners a rebate, clients get partner-exclusive
pricing and credits, and Circulation Studio charges a fee. Do not
publish tier or rate until the agreement is checked.

**Billing.** Centralized is the default and it is what the partner
pricing pays for. Decentralized forfeits partner pricing, promotional
rates, and credits.

**The network.** Four practices, one market and one discipline each.
Never "sister agency", never "parent", never a corporate relationship
asserted. Schema uses `sameAs` and a shared Person entity, never
`parentOrganization`. Network properties are named in author bios but
never linked from article body copy.

**Imagery.** Three paths and they are not interchangeable. Illustration
can be generated, in the constructivist treatment recorded in
`DESIGN_SYSTEM.md`. Screenshots are unretouched captures, never
generated, never composited. Charts require a source. An article that
marks field observations with a provenance attribute cannot carry a
generated picture of a screen.

**Citations.** Cite the source's own date, in the sentence. Access date
only where the source publishes none, and say so. The link carries the
attribution; do not name the article title in prose.

### Services

**Accessibility remediation is not a service.** Dropped from the
offering entirely. The UserWay affiliate badge on `/network/` was the
only place it was sold, and it is removed. The overlay is banned in
`.claude/CLAUDE.md`, and selling remediation without an overlay means
audits, hand-coded fixes, screen reader testing, and retesting, which is
a discipline with specialists in it and a liability shape the rest of
the business does not have.

The version that works, if it ever comes back, is accessibility as an
audit finding rather than a service line. Dental practices are the
vertical that receives demand letters, and a site audit that flags real
barriers is a strong reason for a practice to fund a rebuild. That is
the same move queued for Ayres: surface the problem as a finding, sell
the work that fixes it, refer out anything beyond it. Parked, not
planned.

**Stale credentials removed.** UserWay Authorized Affiliate, Brizy
Partner, and Shopify Partner all come off `/network/`. Brizy claims the
build platform behind client sites and the site is Eleventy. Shopify
offers storefront builds that are not sold. Google Partner and Yelp
Advertising Partner stay. Documents 04 and 09 in Project Knowledge carry
the same three and need the same edit.

### The redirect map

**Google Business Profile redirects rather than being rebuilt.**
`/google-business-profile-management-optimization` averages position
47.8 with 103,657 impressions and 51 clicks. The impressions are query
breadth at a position that is not close, not evidence of proximity. A
single service page with no cluster around it will not move against
BrightLocal, Sterling Sky, Whitespark, and Birdeye. It goes to
`/what-we-do/`, where GBP gets a real paragraph.

Reversible. If GBP becomes a cluster later, build it at
`/gbp-management/` with a hub and spokes and repoint the old path. The
Objective 5 line in Document 08 targeting page one for that URL in six
months is wrong and should be struck.

**Full map: 41 live URLs, 32 rules.** Eight publish at the same path and
get no rule. Two were already live. Fourteen are the accessibility
cluster and retired service pages, all 301. Five are the Yelp cluster,
all 302. Eleven are former pages and verticals. One, `/ada-test`, gets
no rule and 404s deliberately.

**Every destination carries a trailing slash.** Live URLs carry none, so
every rule is a single hop. Cloudflare 308s a bare path to its slash
form, which is why destinations must all carry one.

**302 for anything temporary, 301 for anything permanent.** The four
`ROOT_URL_SLUGS` articles and `/yelp-faqs` are 302 because each returns
to that exact path when the article or the FAQ page publishes. `/blog` is
302 because it repoints to `/library/` when the library opens. A 301 is
cached in the browser where no build assertion can reach it.

**A build assertion guards the collisions.** Every build reads
`src/_redirects`, normalizes each source path, and fails if any matches
a URL the build published. `_redirects` is evaluated before static
files, so a rule whose source is a real page shadows it silently and
permanently. With the assertion in place, the day
`/is-yelp-advertising-worth-it` publishes, the build fails and names
both. Nobody has to remember to pull the five 302s.

### The contact form

**Resend, not a Cloudflare service.** Cloudflare does not send email.
Email Routing forwards inbound mail only, and Workers cannot open SMTP
sockets. Resend is called over its REST API with no npm dependency
added. Free tier covers this volume comfortably.

**Every submission is written to KV before the send is attempted**, with
a `delivered` boolean rewritten after. The user sees success in every
branch where their submission was recorded, because a delivery failure
is not theirs and there is nothing they could do about it. The only
failure they see is a validation failure.

**No Turnstile.** It is a third-party script, and
`src/about-this-site.njk` states in visible copy that the site loads
none. Nothing that shipped adds a request or a cookie. If spam ever
becomes real, the answer is a tighter rate limit rather than a script.

**What shipped is four controls, three of them server side:** a
same-origin check that refuses a POST whose `Origin` is not this host, a
honeypot field answered with success rather than an error so the author
learns nothing, a per-IP rate limit in KV at five an hour, and an
unsigned client timestamp read as a soft signal only when it is present.
The rate limit is the real control; the rest are cheap.

**The HMAC-signed render timestamp was planned and could not be built.**
Signing a render timestamp needs a render moment, and Pages serves
static HTML: every visitor gets byte-identical bytes for `/contact/`, so
a token baked into that page is the same for everyone and replayable.
Fetching a per-session token at runtime would work but excludes anyone
without JavaScript, who then needs a path that accepts no token, which a
bot claims by not sending one. The timestamp is therefore unsigned and
is never held against a submission that omits it, because omitting it is
the no-JavaScript case.

**`/thank-you/` is built as a real page carrying `noindex`.** Cloudflare
Pages serves static HTML, so `/contact/?sent=1` returns bytes identical
to `/contact/` and a visitor with JavaScript off would land on an empty
form with no confirmation. The path is already indexed on the live site,
so building it costs nothing and keeps it warm.

**Retention is scoped to what is enforced.** Submissions in the form
store are deleted after 24 months, set as the KV TTL rather than stated
in prose. Correspondence by email is retained separately as ordinary
business records, and the policy states no period for the inbox because
nothing enforces one.

**Recipient is `site.nap.email`,** read from `src/_data/site.js` rather
than typed into the Function, the same source the footer and contact
page render from. The `from` address is separate and sits on the
verified send subdomain.

### Fonts

**Lora gets self-hosted, not moved to Bunny Fonts.** Cache partitioning
killed cross-site font caching, so a shared CDN font is downloaded fresh
for this origin anyway and costs a DNS lookup and a TLS handshake to a
third origin. Dual is already self-hosted, and two typefaces on two
delivery paths is a second thing to keep in step. Same-origin also makes
the colophon claim airtight rather than requiring a reader to accept
that a font is not a script.

Its own commit after the six tasks. Read the OFL license first. Take the
variable font if the axes cover what is used, subset with `pyftsubset`,
woff2 only, preload the cut that renders above the fold. Check that
subsetting has not dropped the OpenType feature tables, since `ss10` and
`ss01` are scoped per-character.

Google Fonts is named in the privacy policy because it is accurate
today. Removing it is on the `.claude/CLAUDE.md` checklist so the
disclosure does not outlive the dependency.

---

## Infrastructure configured 2026-08-18

**Resend.** Account under studio@circulationstudio.com, domain
`circulationstudio.com` verified 2026-08-18, region us-east-1. Sending
happens from the `send.circulationstudio.com` subdomain.

API key named `circulation-studio-site`, sending access only, scoped to
`circulationstudio.com`. One key for the whole site rather than one per
form; forms are distinguished by subject line and reply-to, not by key.
Stored as `RESEND_API_KEY`, secret type, on Production and Preview.

**DNS records added, four:**

| Type | Name | Purpose |
|---|---|---|
| TXT | `resend._domainkey` | DKIM |
| MX | `send` | Bounce and complaint handling, priority 10 |
| TXT | `send` | SPF for the send subdomain |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@circulationstudio.com` |

The `send` MX is on the subdomain, so the three `mx.zoho.com` records on
the root are untouched and mail is unaffected. Resend inbound receiving
is off and should stay off.

DMARC is domain-wide, not per-sender, so this one record covers Zoho and
Resend together. `p=none` is monitoring only. `dmarc@circulationstudio.com`
needs to exist in Zoho or the reports bounce. Revisit after launch:
if a few weeks of reports show nothing sending as the domain besides
Zoho and Resend, `p=quarantine` and eventually `p=reject` are what
actually stop spoofing.

**Cloudflare KV.** Namespace `circulation-studio-submissions`, bound to
the Pages project as `SUBMISSIONS` on Production and Preview.

**Auto configure was declined** during Resend setup. It grants a third
party write access to the DNS of a domain about to cut over. Manual is
three paste operations.

---

## Open questions nobody has answered

**Ownership of the four practices.** The network page is written to
never need the answer, which works until someone asks directly.

**The Eluvia Yelp Partner badge.** Yelp's program requires US or Canada
registration. Eluvia is in San Miguel de Allende and displays the badge.
`/network/` makes the connection machine-readable. Raising it in writing
creates a record, so check who put it there first.

**Verticals.** The content plan says therapists, restaurants,
contractors, hotels. The client base says dentists, solar, garage door,
windshield, restaurants. Search equity and client evidence are both
valid arguments. Hotels is the weakest, with no client data and no
bridge page.

Note that `/therapists`, `/therapists-foundational-boost`, and
`/counseling-cornerstone` now all redirect to `/what-we-do/`. If
therapists stays in the content plan, that funnel needs rebuilding
rather than restoring.

**Branding on What We Do.** It is listed as a service, and `/network/`
says design and branding is La Ventana Gris. Brand DNA Development is
Circulation Studio work and that distinction is defensible. Branding as
identity design is not.

**The `ssh.circulationstudio.com` Cloudflare Tunnel.** Points at a
machine called mac-mini and is proxied. Steve confirms it is known and
intentional. Recorded here so nobody removes it during cutover.

**Two `google-site-verification` TXT records** sit on the root, one at
1 hour TTL and one at Auto. Probably one is stale from an old Search
Console property. Harmless, worth cleaning up sometime.

---

## How to work in this thread

Strong opinions, not hedged analysis. Push back. Catch errors. Flag
risks early.

No em dashes, no en dashes. Banned: synergy, leverage as a verb, robust,
seamless, deep dive, unlock, world-class, cutting-edge. Clients not
customers. Service businesses not small businesses. No emoji.

**Verify, do not assert.** Every time something was asserted about the
repo rather than checked, it was wrong: `observed` being a paired block,
`SEO_LAYER.md` being in the repo, `module.exports` in an ESM project,
the bar width as a fixed proportion of image width. Each cost a round
trip and one broke the build.

Three more from 2026-08-18, all caught by Claude Code reading the repo
rather than trusting the brief. There is no root `CLAUDE.md`, it is
`.claude/CLAUDE.md`. The privacy policy already existed and needed
rewriting rather than creating. `/library/` publishes three URLs, not
one, because two fixtures build under it.

**A planning document is not the repo.** `/30`, `/ada-test`, and
`/thank-you` were recorded as noindexed on the live site and all three
are indexable, in the sitemap, with self-referencing canonicals. Live
`robots.txt` has an empty `Disallow`, which allows everything. Treat
that document's noindex claims as unreliable until re-checked.

**Verify against rendered output, not reasoning about the framework.**
The `pageNoindex` predicate is registered at two cascade levels rather
than one, because whether a global `eleventyComputed` merges with a
directory-level one or is shadowed by it rests on an Eleventy default
nobody has confirmed, and the failure is silent. The check that proves
it is a grep of the built HTML, not an argument about the cascade.

**Do not stack tools.** Claude Design and Claude Code, one at a time.
Label prompts with the target tool.

**Decisions made in chat must reach a file.** The two recurring
failures: an amendment pasted into one project and never committed to
the repo, and a decision stated here that a fresh session cannot see.
`.claude/CLAUDE.md` now carries the mirror rule for reference files.
This document is the equivalent for everything else.

**Approving a Claude Code plan means accepting the dialog.** Typing
approval text into the reject box registers as a rejection with the
approval attached as the reason, and the session stays in plan mode. It
happened three times on 2026-08-18. Accept the dialog, type nothing, and
send any additional notes as an ordinary message afterward.

**Do not raise launch blockers every message.** They are a running
session now. The sitemap, the redirect map, and the policy pages are
being handled there.
