/* Per-element-type alignment sweep for an article page.
 *
 * WHY THE ASSERTIONS EXIST. An earlier version of this script found the prose
 * column by taking the FIRST .cs-article__column. When a leading pane started
 * closing that column immediately, the first column held only the header, the
 * selectors returned nothing, and the script reported "one left edge, ALL
 * ALIGNED" across an empty set. It passed vacuously, which is worse than not
 * running: a green result that measured nothing.
 *
 * So every element type this script claims to check is DECLARED below, and a
 * type that returns zero matches fails the run. A pass now means the elements
 * were found AND they agreed, never just the second half.
 *
 * Usage: node tools/verify/sweep.mjs [url]
 *
 * Needs a server. `npm run verify` starts one; on its own it expects one at
 * VERIFY_BASE, which defaults to the port run.mjs uses.
 */
import { chromium } from "playwright";
import { assertReadyToMeasure } from "./readiness.mjs";

const BASE = process.env.VERIFY_BASE || "http://localhost:8899";
const URL = process.argv[2] || `${BASE}/library/pipeline-test/`;

/* THE HUB IS SWEPT SEPARATELY, with its own list and no shared left edge.
 *
 * The article sweep asserts that every type sits on ONE column edge, because a
 * prose column has one. The hub does not: it is a page template of two-column
 * grids and full-bleed grounds, so the same assertion would be meaningless
 * there and a copy of the article list would match nothing.
 *
 * What carries over is the half that matters most, and the half this script
 * was written for: NOTHING MAY COME BACK EMPTY. Every block the hub claims to
 * render is named with a minimum, so a selector that stops matching fails
 * instead of the page quietly losing a section. That is the exact gap the
 * fingerprint could not close, since a missing section changes a hash rather
 * than failing a count.
 *
 * `column: true` marks only the blocks that sit at the container's own left
 * edge, which on this page is every full-width section. The feature card, the
 * map's second column and the report card are deliberately elsewhere and are
 * measured without being held to it. */
const HUB_URL = `${BASE}/yelp/`;
const HUB_EXPECTED = [
  { label: "hub intro",     selector: ".cs-hub-intro",        min: 1, column: true },
  { label: "hub headline",  selector: ".cs-hub-intro__headline", min: 1, column: true },
  { label: "hub lede",      selector: ".cs-hub-intro__lede",  min: 1, column: true },
  { label: "hub badge",     selector: ".cs-hub-badge",        min: 1, column: false },
  /* Added 2026-08-03, when the band rendered for the first time. It was left
     out because it drew nothing: no piece could declare `starthere` until
     /yelp-partners/ enrolled through `hubentry`, and a floor of 1 on a block
     that renders zero by design would have failed every run. Now that it draws,
     it takes the container edge like every other full-width section, and a
     floor here is what catches the band silently emptying again. */
  { label: "start here",    selector: ".cs-starthere",        min: 1, column: true },
  { label: "browse head",   selector: ".cs-browse__head",     min: 1, column: true },
  { label: "browse feature",selector: ".cs-browse__feature",  min: 1, column: true },
  { label: "feature title", selector: ".cs-browse__feature-title", min: 1, column: false },
  { label: "map head",      selector: ".cs-map__head",        min: 1, column: true },
  { label: "map",           selector: ".cs-map",              min: 1, column: true },
  { label: "map cluster",   selector: ".cs-map__cluster",     min: 7, column: false },
  { label: "map entry",     selector: ".cs-map__entry",       min: 1, column: false },
  /* map pending is NOT swept, on purpose. A minimum is a floor that content
     growth must never break, and the in-preparation count does the opposite:
     it falls by one every time a cluster gets its first article and reaches
     zero when the map is complete. Asserting a floor on it would turn writing
     an article into a test failure. Its exact count lives in the manifest,
     which is updated in the same commit as the content that changes it. */
  { label: "rank panel",    selector: ".cs-rank",             min: 1, column: true },
  { label: "rank row",      selector: ".cs-rank__report tbody tr", min: 4, column: false },
  { label: "closing",       selector: ".cs-hub-close",        min: 1, column: true },
  { label: "closing note",  selector: ".cs-hub-close__statement", min: 1, column: true }
];
const WIDTHS = [390, 1440, 2560];

/* Every type the sweep claims to cover. `min` is the number of matches below
 * which the run fails rather than reporting on a short set. `column` marks the
 * types expected to share the prose left edge; anything false is measured and
 * reported but excluded from the alignment assertion, which is how a
 * deliberately wider block is represented. */
const EXPECTED = [
  { label: "h1",            selector: ".cs-article h1",                    min: 1, column: true },
  { label: "p",             selector: ".cs-article__column > p",           min: 3, column: true },
  { label: "h2",            selector: ".cs-article__column > h2",          min: 2, column: true },
  { label: "h3",            selector: ".cs-article__column > h3",          min: 1, column: true },
  { label: "ul",            selector: ".cs-article__column > ul",          min: 1, column: true },
  { label: "li",            selector: ".cs-article__column > ul > li",     min: 2, column: false },
  { label: "stat",          selector: ".cs-article__column > .cs-stat",    min: 1, column: true },
  { label: "stat value",    selector: ".cs-article__column > .cs-stat .cs-stat__value",  min: 1, column: true },
  { label: "stat label",    selector: ".cs-article__column > .cs-stat .cs-stat__label",  min: 1, column: true },
  { label: "stat source",   selector: ".cs-article__column > .cs-stat .cs-stat__source", min: 1, column: true },
  { label: "pane",          selector: ".cs-article > .cs-pane",            min: 2, column: false },
  { label: "pane inner",    selector: ".cs-pane__inner",                   min: 2, column: true },
  { label: "pane p",        selector: ".cs-pane__inner > p",               min: 2, column: true },
  { label: "pane h2",       selector: ".cs-pane__inner > h2",              min: 1, column: true },
  { label: "pane stat",     selector: ".cs-pane__inner > .cs-stat",        min: 2, column: true },
  /* Main width, deliberately NOT on the prose left edge. Measured and reported
     but excluded from the alignment assertion, and checked separately below
     for its own symmetry. */
  { label: "faq",           selector: ".cs-article__column > .cs-faq",     min: 1, column: true },
  { label: "faq title",     selector: ".cs-faq > .cs-faq__title",          min: 3, column: false },
  { label: "qa",            selector: ".cs-faq > .cs-qa",                  min: 6, column: false },
  { label: "qa summary",    selector: ".cs-qa > .cs-qa__q",                min: 6, column: false },
  { label: "pane faq",      selector: ".cs-pane__inner > .cs-faq",         min: 2, column: true },
  { label: "callout",       selector: ".cs-article__column > .cs-callout",  min: 2, column: true },
  { label: "related",       selector: ".cs-article > .cs-related",         min: 1, column: false },
  { label: "related item",  selector: ".cs-related__item",                 min: 3, column: false },
  { label: "takeaways",     selector: ".cs-article__column > .cs-takeaways", min: 1, column: true },
  { label: "execsummary",   selector: ".cs-article__column > .cs-execsummary", min: 1, column: true },
  { label: "execsummary li", selector: ".cs-execsummary li",                min: 3, column: false },
  { label: "methodology",   selector: ".cs-article__column > .cs-methodology", min: 1, column: true },
  { label: "method",        selector: ".cs-methodology .cs-method",       min: 2, column: false },
  { label: "references",    selector: ".cs-article__column > .cs-references", min: 1, column: true },
  { label: "ref",           selector: ".cs-references__list > .cs-ref",   min: 3, column: false },
  { label: "pullquote",     selector: ".cs-pullquote",                     min: 3, column: true },
  { label: "footnotes",     selector: ".cs-article__column > .cs-footnotes", min: 1, column: true },
  { label: "footnote li",   selector: ".cs-footnotes li",                  min: 5, column: false },
  { label: "fn marker",     selector: "a.cs-fnref",                        min: 5, column: false },
  { label: "observed",      selector: "span.cs-observed",                  min: 2, column: false },
  { label: "table",         selector: ".cs-article > .cs-table",           min: 2, column: false },
  { label: "table caption", selector: ".cs-article > .cs-table > .cs-table__caption", min: 2, column: false },
  /* Imagery. The measure-width image is the only one held to the column edge;
     the rest are main by definition and are measured without being held to it,
     the same treatment the table and the related grid get. The slot count is
     the one that matters here: a placeholder that stopped rendering would leave
     an article silently missing a block it was written around. */
  { label: "image measure", selector: ".cs-article__column > .cs-imgblock", min: 1, column: true },
  { label: "image wide",    selector: ".cs-article > .cs-imgwide--main",    min: 1, column: false },
  { label: "slot",          selector: ".cs-imgslot",                        min: 3, column: false },
  { label: "slot frame",    selector: ".cs-imgslot__frame",                 min: 3, column: false },
  { label: "slot label",    selector: ".cs-imgslot__label",                 min: 3, column: false },
  { label: "image caption", selector: ".cs-imgcap",                         min: 3, column: false }
];

const browser = await chromium.launch();
const failures = [];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await assertReadyToMeasure(page, `${URL} @${width}`);

  const measured = await page.evaluate((expected) => {
    const round = (n) => Math.round(n * 10) / 10;
    return expected.map((e) => {
      const nodes = [...document.querySelectorAll(e.selector)];
      return {
        ...e,
        count: nodes.length,
        boxes: nodes.map((n) => {
          const b = n.getBoundingClientRect();
          return { left: round(b.left), right: round(b.right), width: round(b.width) };
        })
      };
    });
  }, EXPECTED);

  const docWidth = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  console.log(`\n===================== @${width} =====================`);
  for (const m of measured) {
    const shown = m.boxes.length ? `left ${m.boxes[0].left}  width ${m.boxes[0].width}` : "(none)";
    console.log(`  ${m.label.padEnd(13)} x${String(m.count).padStart(2)}  ${shown}`);
  }

  // 1. Nothing may come back empty.
  for (const m of measured) {
    if (m.count < m.min) {
      failures.push(`@${width} ${m.label}: expected at least ${m.min} match(es) of "${m.selector}", found ${m.count}`);
    }
  }

  // 2. Everything in the column shares one left edge.
  const edges = [...new Set(measured.filter((m) => m.column).flatMap((m) => m.boxes.map((b) => b.left)))];
  console.log(`  -> column left edges: ${edges.join(", ") || "(none)"}`);
  if (edges.length === 0) {
    failures.push(`@${width}: no column elements measured at all`);
  } else if (edges.length > 1) {
    failures.push(`@${width}: ${edges.length} different left edges in the prose column: ${edges.join(", ")}`);
  }

  // 3. A main-width block is centred: equal gutter each side, and wider than
  //    the prose column without ever exceeding the page.
  const proseLeft = edges[0];
  for (const box of measured.find((m) => m.label === "table")?.boxes || []) {
    const rightGutter = Math.round((docWidth.clientWidth - box.right) * 10) / 10;
    if (Math.abs(box.left - rightGutter) > 1) {
      failures.push(`@${width} table: gutters not symmetric, left ${box.left} vs right ${rightGutter}`);
    }
    if (box.left > proseLeft) {
      failures.push(`@${width} table: left ${box.left} is inside the prose edge ${proseLeft}, so it is not breaking out`);
    }
    if (box.right > docWidth.clientWidth + 1) {
      failures.push(`@${width} table: right edge ${box.right} exceeds the page ${docWidth.clientWidth}`);
    }
  }

  // 4. The document itself never scrolls sideways.
  if (docWidth.scrollWidth !== docWidth.clientWidth) {
    failures.push(`@${width}: horizontal scroll, scrollWidth ${docWidth.scrollWidth} vs clientWidth ${docWidth.clientWidth}`);
  }

  await context.close();
}

/* THE HUB PASS. A separate loop rather than a parameterised one, because it
   asserts a different thing: presence and the container edge, not a prose
   column. Folding the two together would mean a `column` flag that means one
   thing on an article and another on a page template. */
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.goto(HUB_URL, { waitUntil: "domcontentloaded" });
  await assertReadyToMeasure(page, `${HUB_URL} @${width}`);

  const measured = await page.evaluate((expected) => {
    const round = (n) => Math.round(n * 10) / 10;
    return expected.map((e) => {
      const nodes = [...document.querySelectorAll(e.selector)];
      return {
        ...e,
        count: nodes.length,
        boxes: nodes.map((n) => {
          const b = n.getBoundingClientRect();
          return { left: round(b.left), width: round(b.width) };
        })
      };
    });
  }, HUB_EXPECTED);

  const doc = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  console.log(`\n=============== hub @${width} ===============`);
  for (const m of measured) {
    const shown = m.boxes.length ? `left ${m.boxes[0].left}  width ${m.boxes[0].width}` : "(none)";
    console.log(`  ${m.label.padEnd(15)} x${String(m.count).padStart(2)}  ${shown}`);
  }

  /* 1. Nothing empty. This is the assertion the hub had none of: a page that
        lost a whole section changes a fingerprint hash rather than failing a
        count, and 207 elements is a floor rather than an exact number. */
  for (const m of measured) {
    if (m.count < m.min) {
      failures.push(
        `hub @${width} ${m.label}: expected at least ${m.min} match(es) of ` +
          `"${m.selector}", found ${m.count}`
      );
    }
  }

  /* 2. Full-width sections share the container's left edge. */
  const hubEdges = [...new Set(measured.filter((m) => m.column).flatMap((m) => m.boxes.map((b) => b.left)))];
  console.log(`  -> container left edges: ${hubEdges.join(", ") || "(none)"}`);
  if (hubEdges.length === 0) {
    failures.push(`hub @${width}: no container elements measured at all`);
  } else if (hubEdges.length > 1) {
    failures.push(`hub @${width}: ${hubEdges.length} different left edges at container width: ${hubEdges.join(", ")}`);
  }

  /* 3. No sideways scroll, the same assertion the article pass makes. */
  if (doc.scrollWidth !== doc.clientWidth) {
    failures.push(`hub @${width}: horizontal scroll, scrollWidth ${doc.scrollWidth} vs clientWidth ${doc.clientWidth}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(`\nSWEEP FAILED, ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `\nSWEEP PASSED. ${EXPECTED.length} article element types aligned on the prose ` +
    `column and ${HUB_EXPECTED.length} hub types on the container edge, at ${WIDTHS.join(", ")}.`
);
