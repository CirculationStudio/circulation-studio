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
 */
import { chromium } from "playwright";

const URL = process.argv[2] || "http://localhost:8899/articles/pipeline-test/";
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
  { label: "pane stat",     selector: ".cs-pane__inner > .cs-stat",        min: 2, column: true }
];

const browser = await chromium.launch();
const failures = [];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

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

  // 3. The document itself never scrolls sideways.
  if (docWidth.scrollWidth !== docWidth.clientWidth) {
    failures.push(`@${width}: horizontal scroll, scrollWidth ${docWidth.scrollWidth} vs clientWidth ${docWidth.clientWidth}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(`\nSWEEP FAILED, ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`\nSWEEP PASSED. ${EXPECTED.length} element types found and aligned at ${WIDTHS.join(", ")}.`);
