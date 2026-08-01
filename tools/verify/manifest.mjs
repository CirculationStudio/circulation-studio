/* Fixture manifest check.
 *
 * Asserts that the article fixture contains EXACTLY the blocks it declares.
 *
 * WHY THIS EXISTS. The fixture has silently lost a block three times. Two of
 * those were markdown edits that matched nothing and did nothing, and the
 * build stayed green, because a block that failed to be inserted is
 * indistinguishable from a block nobody asked for. The last one was caught
 * only because an unrelated schema count came out at two instead of three.
 *
 * The sweep's minimums cannot catch this. A minimum answers "did anything
 * render", which is the vacuous-pass guard. This answers "did exactly what we
 * declared render", which is a different question and the one that catches a
 * silent no-op edit.
 *
 * Counts are exact on purpose, so a duplicated block fails too.
 *
 * Usage: node tools/verify/manifest.mjs
 *
 * Needs a server. `npm run verify` starts one; on its own it expects one at
 * VERIFY_BASE, which defaults to the port run.mjs uses.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { assertReadyToMeasure } from "./readiness.mjs";

const BASE = process.env.VERIFY_BASE || "http://localhost:8899";
const manifest = JSON.parse(
  readFileSync(new URL("./fixture.manifest.json", import.meta.url), "utf8")
);

/* Counts do not change with the viewport, so they are taken once. Type does,
   which is why the typography pass runs at both. */
const WIDTHS = [1440, 390];

const browser = await chromium.launch();

const failures = [];
let declared = 0;
let asserted = 0;

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();

/* One entry per fixture page. The essay fixture and the whitepaper fixture
   declare different blocks, and a count that belongs to one would be a silent
   zero on the other, so each page carries its own. */
for (const fixture of manifest.pages) {
  await page.goto(BASE + fixture.url, { waitUntil: "domcontentloaded" });
  await assertReadyToMeasure(page, `${fixture.url} @${width}`);

  if (width === WIDTHS[0]) {
  const counts = await page.evaluate(
    (blocks) =>
      Object.fromEntries(
        Object.entries(blocks).map(([name, spec]) => [
          name,
          document.querySelectorAll(spec.selector).length
        ])
      ),
    fixture.blocks
  );

  console.log(`\n  ${fixture.url}`);
  for (const [name, spec] of Object.entries(fixture.blocks)) {
    declared += 1;
    const found = counts[name];
    const ok = found === spec.count;
    console.log(
      `  ${ok ? "  " : "!!"} ${name.padEnd(18)} ${String(found).padStart(3)} / ${String(spec.count).padEnd(3)} ${spec.selector}`
    );
    if (!ok) {
      failures.push(
        `${fixture.url} ${name}: declared ${spec.count}, found ${found} (${spec.selector}). ` +
          (found < spec.count
            ? "A block is missing. If a markdown edit was meant to add one, it matched nothing."
            : "There is an extra block. If that is intended, update the manifest in the same commit.")
      );
    }
  }
  }

  /* ---- signature type and layout ----

     Reads only the properties an entry declares, so a block that cares about
     its label's size and nothing else says so and is not held to values it
     never claimed. */
  const type = await page.evaluate(
    (entries) =>
      entries.map((entry) => {
        const el = document.querySelector(entry.selector);
        if (!el) return { name: entry.name, missing: true };
        /* `pseudo` lets an entry measure ::after, which is where the faq
           toggle lives. A mark drawn by a pseudo-element is still typography
           and still drifts. */
        const c = getComputedStyle(el, entry.pseudo ?? null);
        return {
          name: entry.name,
          values: {
            fontSize: c.fontSize,
            fontWeight: c.fontWeight,
            fontFamily: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
            letterSpacing: c.letterSpacing,
            fontStyle: c.fontStyle,
            textTransform: c.textTransform,
            color: c.color,
            /* Layout, for the blocks whose identity is a shape rather than a
               size: a bar that must span, a list whose markers must fit its
               padding, a grid that must have the columns it claims. */
            maxWidth: c.maxWidth,
            padding: c.padding,
            paddingLeft: c.paddingLeft,
            marginTop: c.marginTop,
            marginBottom: c.marginBottom,
            rowGap: c.rowGap,
            gridTemplateColumns: c.gridTemplateColumns,
            overflowX: c.overflowX,
            backgroundColor: c.backgroundColor,
            borderColor: c.borderTopColor
          }
        };
      }),
    fixture.signature ?? []
  );

  for (const [i, entry] of (fixture.signature ?? []).entries()) {
    const got = type[i];
    const want = { ...entry.expect, ...(entry.expectAt?.[String(width)] ?? {}) };

    if (got.missing) {
      failures.push(
        `${fixture.url} @${width} ${entry.name}: nothing matches "${entry.selector}", ` +
          `so its typography was not measured at all.`
      );
      console.log(`  !! ${entry.name.padEnd(20)} @${width} selector matched nothing`);
      continue;
    }

    const wrong = Object.entries(want).filter(([prop, value]) => got.values[prop] !== value);
    asserted += Object.keys(want).length;

    if (wrong.length) {
      for (const [prop, value] of wrong) {
        failures.push(
          `${fixture.url} @${width} ${entry.name}: ${prop} is ${got.values[prop]}, ` +
            `declared ${value} (${entry.selector}). Either the block's stylesheet is ` +
            `not shipping, or a broader selector is outranking its rule. ` +
            `Declared source: ${entry.source}.`
        );
      }
      console.log(
        `  !! ${entry.name.padEnd(20)} @${width} ` +
          wrong.map(([p, v]) => `${p} ${got.values[p]} not ${v}`).join(", ")
      );
    } else {
      console.log(`     ${entry.name.padEnd(20)} @${width} ${Object.keys(want).length} value(s) ok`);
    }
  }
}

  await context.close();
}

await browser.close();

/* A run that asserted no typography has measured nothing about type, which is
   the whole point of this pass and exactly the shape of the two defects it was
   written for. */
if (!asserted) {
  console.error("MANIFEST FAILED: no signature values were asserted at all.");
  console.error("  The declarations were dropped or the key was renamed, and the");
  console.error("  pass went green having measured nothing.");
  process.exit(1);
}

if (failures.length) {
  console.error(`\nMANIFEST FAILED, ${failures.length} mismatch(es):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `\nMANIFEST MATCHED. ${declared} block types at their declared counts, and ` +
    `${asserted} signature values across ${manifest.pages.length} fixture page(s) ` +
    `at ${WIDTHS.join(" and ")}.`
);
