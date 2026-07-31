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
 * THE BASELINE IS A PRODUCTION ARTIFACT. It was taken from a built _site served
 * statically, and `eleventy --serve` does not reproduce it: against the dev
 * server all ten hashes differ while every element count lands exactly on its
 * floor, so the DOM is identical and only computed typography moved. Re-take it
 * the same way it is checked, through `npm run verify`, never off the dev
 * server, or the baseline stops describing what ships.
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

const BASE = process.env.VERIFY_BASE || "http://localhost:8899";
const BASELINE = new URL("./fingerprint.baseline.json", import.meta.url);
const WRITE = process.argv.includes("--write");

const PAGES = [
  ["home", "/"],
  ["who", "/who-we-are/"],
  ["what", "/what-we-do/"],
  ["results", "/results/"],
  ["contact", "/contact/"]
];
const WIDTHS = [1440, 390];

/* Element counts at the time the baseline was taken. Anything below these
   means the page did not render, not that it changed. */
const MIN_ELEMENTS = { home: 133, who: 151, what: 149, results: 149, contact: 117 };

const browser = await chromium.launch();
const result = {};
const failures = [];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
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
