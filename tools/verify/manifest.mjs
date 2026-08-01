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
let containmentAsserted = 0;

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

  /* CONTAINMENT. Geometry between TWO elements, which no computed value can
     express: every property above describes one box in isolation, and a child
     spilling out of its parent is a relationship.

     Two things are checked and they are not the same thing.

     `over`/`under` is CONTAINMENT: the child must not pass the parent's
     content box. That is the assertion for a card bursting its panel.

     `minInset` is BREATHING ROOM, and it is the one that would have caught
     the defect this was written for. The rank card looked like it burst its
     panel and every box measurement said it fitted, because it did fit: the
     card filled its 400px track exactly and containment alone reports 0 and
     passes. The real fault was one level in. `padding: 24px` on a table with
     border-collapse:collapse is DROPPED by the engine, so the rows ran flush
     to the card's own edge and the right-aligned movement column read as
     clipped. Containment could never have seen that. An inset floor between
     the table and the card can, because a dropped padding measures as zero. */
  for (const rule of fixture.containment ?? []) {
    const geom = await page.evaluate(({ child, parent }) => {
      const c = document.querySelector(child);
      const p = document.querySelector(parent);
      if (!c || !p) return { missing: !c ? child : parent };
      const cb = c.getBoundingClientRect();
      const pb = p.getBoundingClientRect();
      const ps = getComputedStyle(p);
      const R = (n) => Math.round(n * 10) / 10;
      return {
        childLeft: R(cb.left),
        childRight: R(cb.right),
        /* Content box, for containment. */
        innerLeft: R(pb.left + parseFloat(ps.paddingLeft) + parseFloat(ps.borderLeftWidth)),
        innerRight: R(pb.right - parseFloat(ps.paddingRight) - parseFloat(ps.borderRightWidth)),
        /* BORDER box, for the inset. Measuring the inset against the content
           box would be circular: a correctly padded child is flush with its
           parent's content box by definition, so the padding being checked is
           the very thing subtracted before measuring. Against the border box a
           dropped padding reads as zero and a real one reads as its width. */
        outerLeft: R(pb.left),
        outerRight: R(pb.right)
      };
    }, { child: rule.child, parent: rule.parent });

    containmentAsserted += 1;

    if (geom.missing) {
      failures.push(
        `${fixture.url} @${width} ${rule.name}: nothing matches "${geom.missing}", ` +
          `so containment was not checked. ${rule.why ?? ""}`
      );
      console.log(`  !! ${rule.name.padEnd(20)} @${width} selector matched nothing`);
      continue;
    }

    const over = Math.round((geom.childRight - geom.innerRight) * 10) / 10;
    const under = Math.round((geom.innerLeft - geom.childLeft) * 10) / 10;
    const want = rule.minInsetAt?.[String(width)] ?? rule.minInset ?? 0;
    const inset = Math.round(
      Math.min(geom.childLeft - geom.outerLeft, geom.outerRight - geom.childRight) * 10
    ) / 10;

    if (over > 0.5 || under > 0.5) {
      failures.push(
        `${fixture.url} @${width} ${rule.name}: "${rule.child}" is not inside ` +
          `"${rule.parent}". Child spans ${geom.childLeft} to ${geom.childRight}, ` +
          `the parent's content box is ${geom.innerLeft} to ${geom.innerRight} ` +
          `(over right by ${over}, past left by ${under}). ${rule.why ?? ""}`
      );
      console.log(`  !! ${rule.name.padEnd(20)} @${width} escapes by ${Math.max(over, under)}px`);
    } else if (inset + 0.5 < want) {
      failures.push(
        `${fixture.url} @${width} ${rule.name}: "${rule.child}" is inset ${inset}px ` +
          `from "${rule.parent}" and needs at least ${want}px. It is contained but ` +
          `flush, which is what a dropped padding looks like. ${rule.why ?? ""}`
      );
      console.log(`  !! ${rule.name.padEnd(20)} @${width} inset ${inset} < ${want}`);
    } else {
      console.log(
        `     ${rule.name.padEnd(20)} @${width} contained, inset ${inset}px` +
          (want ? ` (min ${want})` : "")
      );
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
