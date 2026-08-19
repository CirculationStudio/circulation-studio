/* Typography fingerprint for the five marketing pages.
 *
 * Records font-size, line-height, letter-spacing, text-transform, weight,
 * family, colour, max-width and text-wrap for every element on every page at
 * two widths, hashes the result, and compares against a stored baseline. It
 * exists so article work can be proved not to have moved the marketing pages,
 * which pixel comparison could not do reliably: Results has lazy CDN images and
 * two captures of the SAME build differed.
 *
 * WHY THE FLOOR EXISTS. A hash comparison passes when both sides are empty. If
 * a selector change, a build failure or a bad URL returned zero elements, every
 * page would hash identically to itself and the run would go green having
 * measured nothing. MIN_ELEMENTS is the guard: a page that comes back short
 * fails the run before any hash is compared.
 *
 * The floor is the count at the time the baseline was taken. A legitimate
 * content removal will trip it, and the correct response is to re-take the
 * baseline deliberately rather than to lower the floor quietly.
 *
 * THE BASELINE IS SERVER INDEPENDENT, and it took a diagnosis to make that
 * true. All ten hashes used to differ against `eleventy --serve` while every
 * element count landed exactly on its floor, which said the DOM was identical
 * and only computed typography had moved. It was neither a build difference nor
 * a rendering difference: the page was being measured too early, once for fonts
 * that had not registered and once mid transition. readiness.mjs asserts both
 * preconditions, and the same ten hashes now come back from a production build
 * and from the dev server.
 *
 * Re-take the baseline through `npm run verify` all the same. Not because the
 * dev server lies, but because the baseline should describe the artifact that
 * ships.
 *
 * Usage:
 *   node tools/verify/fingerprint.mjs            compare against the baseline
 *   node tools/verify/fingerprint.mjs --write    re-take the baseline
 *
 * Needs a server. `npm run verify` starts one; on its own it expects one at
 * VERIFY_BASE, which defaults to the port run.mjs uses.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { assertReadyToMeasure } from "./readiness.mjs";

const BASE = process.env.VERIFY_BASE || "http://localhost:8899";
const BASELINE = new URL("./fingerprint.baseline.json", import.meta.url);
const WRITE = process.argv.includes("--write");

/* THE HUB HAS ITS OWN ENTRY AND DOES NOT JOIN THE MARKETING BASELINE.

   This baseline exists to prove that article-system work does not move the
   five marketing pages. Folding a sixth page into it would change what a
   passing run means: "the marketing pages are unchanged" would quietly become
   "the marketing pages and the hub are unchanged", and a hub edit would then
   read as a marketing regression to whoever saw the failure.

   It is in the same file because the file is a map keyed by page and width,
   not a set, so adding a key adds a row rather than redefining the rest. */
const PAGES = [
  ["home", "/"],
  ["who", "/who-we-are/"],
  ["what", "/what-we-do/"],
  ["results", "/results/"],
  ["contact", "/contact/"],
  ["yelphub", "/yelp/"]
];
const WIDTHS = [1440, 390];

/* Element counts at the time the baseline was taken. Anything below these
   means the page did not render, not that it changed. */
const MIN_ELEMENTS = {
  /* Every floor rose by exactly 2 on 2026-08-02: nav.footer gained The
     Circulation Network, and a footer link is an li plus an a on every page of
     the site. The fingerprint caught all twelve combinations at once, which is
     what a frame change is supposed to look like here.

     AND AGAIN BY 2 ON 2026-08-06, when nav.footer gained About This Site. Same
     cause, same shape, all twelve hashes moved at once and every floor rose by
     exactly two. A frame change that moved SOME of them would be the
     interesting result. */
  /* EVERY FLOOR ROSE BY TWO PER BUTTON ON 2026-08-15, and the arithmetic is the
     check: the Button States comp made .cs-btn two layers, a plate holding a
     .cs-btn__face holding a .cs-btn__label, because a press has to move the bar
     and the label as one printed surface. Each button on a page adds exactly
     two elements and nothing else does.

     home rose 6 for its three buttons; who, what, results, contact and yelphub
     rose 2 each for their one. A page that rose by an odd number, or by two
     without gaining a button, would be the interesting result.

     All twelve hashes moved together, which is correct here and is the opposite
     of the split this file usually watches for: a component every page renders
     changed, not one page's content. */
  /* AND AGAIN BY 2 ON 2026-08-15, all six, when the Header Condense comp
     replaced a static rail plus a fixed sticky bar plus a sentinel with one
     header that condenses into itself. Net +2 per page: the mark gained two
     nesting spans for its two-speed descent, a spacer replaced the sentinel,
     and the rail element stayed.

     IT WAS BRIEFLY +4. The first cut of that header rebuilt the expanded state
     from the comp's absolute coordinates and needed a nav wrapper and a
     separate rule element to do it. That version also regressed the expanded
     composition, pulling the flanking labels 45.7px up onto the top edge and
     collapsing the nav band from 59.6px of air to a bare 1px rule. Restoring
     the original rail removed both extra elements, so this floor came back
     down by two. Lowered deliberately, with the count re-taken in the same
     commit, which is what this file asks for.

     Uniform across all six is the signature of a frame change, the same shape
     as the two footer-link rises above. A page that moved by a different amount
     would be the interesting result. */
  /* EVERY FLOOR ROSE BY EXACTLY 2 ON 2026-08-19, and uniform is the signature.
     The masthead gained the orientation slot and the mobile bar gained its
     counterpart, so every page carries two more elements and no page carries a
     different number. A frame change that moved SOME of them would be the
     interesting result, the same test the footer-link and button rises above
     were read against.

     The section names themselves cost nothing: data-orient is emitted onto the
     container and section elements that already existed, through an argument on
     those two macros, rather than onto marker divs. A page that names five
     sections and a page that names none have the same element count. */
  /* THREE FELL ON 2026-08-19, AND THREE DID NOT, which is the whole reading.
     The above-title came off the remaining pages, so only pages that carried
     one moved: results -2, contact -1, yelphub -2. home, who and what held
     exactly, home and what because they never had one and who because its two
     came off in an earlier commit.

     RESULTS FELL BY TWO FROM ONE TEMPLATE LINE, and that is the arithmetic
     worth keeping. "Work sample" sits inside the loop over cases, guarded by
     `if case.sample`, and two of the three cases carry a sample. One line
     removed, two elements gone. A page that fell by one there would have meant
     the guard had changed rather than the label.

     TWO PAGES MOVED THEIR HASH WITHOUT MOVING THEIR COUNT, and that is not the
     alarming case it looks like. home and what carried no above-title and lost
     no element, but both hashes moved anyway.

     THE RECORD INCLUDES THE ELEMENT'S FIRST CLASS NAME, which the header of
     this file does not say and which is worth knowing before reading a result
     like that. The row is tag, first class, then the type and colour fields, so
     renaming a class moves the hash with nothing about the rendering having
     changed. The section rhythm went from py-24 to py-22, that class is first
     on the <section> the macro emits, and exactly one element per page carries
     it. Padding itself is still not recorded: 96px to 88px on its own would
     have moved nothing.

     A hash moving with a count that holds is either this, a real typography
     change, or an element swapped for another. It is worth telling those apart
     by diffing the built HTML rather than assuming, which is how this one was
     resolved. */
  home: 147,
  /* who FELL 159 -> 157 ON 2026-08-19, and falling alone is the point. The
     above-title was retired and this page carried exactly two: "In a client's
     words" over the testimonial and "Why the name" over the origin list. One
     <p> each, so -2 and nothing else.

     Lowered deliberately, with the baseline re-taken in the same commit, which
     is what this file asks for. The check is that NO OTHER FLOOR MOVED: the
     rhythm went from 96px to 88px on this page at the same time, and padding is
     not something this file records, so a second page moving here would have
     meant the section() macro's default had been changed rather than passed as
     an argument. It was passed. */
  who: 159,
  /* what carries both: 153 -> 159 for the two services added the same day, then
     159 -> 161 for its one button. */
  what: 165,
  results: 157,
  /* CONTACT ALONE ROSE 127 -> 150 ON 2026-08-15, and alone is the point: the
     prompt group is one page's content, not the frame, so the other five did
     not move. +23 is the group's wrapper, its line and its list, plus five
     elements for each of four rows. The listing field replaced Company /
     business one for one and contributed nothing. */
  /* AND 148 -> 153 ON 2026-08-18, when the form was wired to a real handler.
     Five elements, and the arithmetic is the check: the honeypot paragraph, its
     label and its input, the hidden render stamp, and the status region that
     carries the reply. Nothing else on the page moved.

     CORRECTED LATE, ON 2026-08-19, AND THAT IS THE POINT OF THIS NOTE. The
     baseline was re-taken in that commit and this floor was not raised with it,
     so for a day the guard sat five below the real count. A floor under the
     count still catches a page that fails to render, but it stops catching a
     partial render that loses fewer than five elements, which is the case it
     exists for. Re-take the baseline and raise the floor in the same commit, or
     the check quietly weakens instead of failing. */
  contact: 154,
  /* The hub is DATA-DRIVEN and this floor will rise. Every article added to
     src/yelp/ adds elements to the coverage map, so a run that drops below the
     floor means the page stopped rendering rather than that content was
     removed. Re-take the baseline when the shelf or the map changes, in the
     same commit that changes it.

     207 until the rank card was rebuilt as a wrapper div around its table,
     which added two elements. 211 until the personal-vs-business article
     landed on 2026-08-02: a cluster moved from in-preparation to populated,
     which trades one pending line for a full entry. 216 until hubentry landed
     on 2026-08-03, the largest single jump so far: the Start here band
     rendered for the first time since it was built, and two more clusters
     traded a pending line for a full entry. Each time the five marketing
     hashes did not move, which is the split this file exists for. */
  yelphub: 238
};

const browser = await chromium.launch();
const result = {};
const failures = [];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await assertReadyToMeasure(page, `${name}@${width}`);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll("body *")].map((el) => {
        const c = getComputedStyle(el);
        const cls = el.className && typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
        return [
          el.tagName, cls, c.fontSize, c.lineHeight, c.letterSpacing, c.textTransform,
          c.fontWeight, c.fontFamily.split(",")[0], c.color, c.maxWidth, c.textWrap || ""
        ].join("|");
      })
    );

    const key = `${name}@${width}`;
    if (rows.length < MIN_ELEMENTS[name]) {
      failures.push(`${key}: ${rows.length} elements, floor is ${MIN_ELEMENTS[name]}. The page did not render.`);
    }
    result[key] = { count: rows.length, hash: createHash("sha256").update(rows.join("\n")).digest("hex").slice(0, 16) };
  }
  await context.close();
}
await browser.close();

// A short page is a broken run. Report it before any hash is trusted.
if (failures.length) {
  console.error(`FINGERPRINT FAILED, ${failures.length} page(s) came back short:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

for (const [key, v] of Object.entries(result)) {
  console.log(`  ${key.padEnd(14)} ${v.hash}  elements=${v.count}`);
}

if (WRITE) {
  writeFileSync(BASELINE, JSON.stringify(result, null, 2) + "\n");
  console.log(`\nBaseline written to ${BASELINE.pathname}`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error(`\nNo baseline at ${BASELINE.pathname}. Take one with --write.`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const moved = Object.keys(result).filter((k) => !baseline[k] || baseline[k].hash !== result[k].hash);
const missing = Object.keys(baseline).filter((k) => !result[k]);

if (moved.length || missing.length) {
  console.error(`\nFINGERPRINT CHANGED:`);
  for (const k of moved) console.error(`  ${k}: ${baseline[k]?.hash || "(absent from baseline)"} -> ${result[k].hash}`);
  for (const k of missing) console.error(`  ${k}: in the baseline but not measured`);
  process.exit(1);
}

console.log(`\nFINGERPRINT UNCHANGED. ${Object.keys(result).length} page/width combinations match the baseline.`);
