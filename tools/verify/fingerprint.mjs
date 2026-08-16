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
  home: 143,
  who: 157,
  /* what carries both: 153 -> 159 for the two services added the same day, then
     159 -> 161 for its one button. */
  what: 161,
  results: 155,
  contact: 123,
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
  yelphub: 236
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
