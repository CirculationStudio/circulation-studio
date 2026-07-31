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

const BASE = process.env.VERIFY_BASE || "http://localhost:8899";
const manifest = JSON.parse(
  readFileSync(new URL("./fixture.manifest.json", import.meta.url), "utf8")
);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE + manifest.url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const counts = await page.evaluate(
  (blocks) =>
    Object.fromEntries(
      Object.entries(blocks).map(([name, spec]) => [
        name,
        document.querySelectorAll(spec.selector).length
      ])
    ),
  manifest.blocks
);

await browser.close();

const failures = [];
for (const [name, spec] of Object.entries(manifest.blocks)) {
  const found = counts[name];
  const ok = found === spec.count;
  console.log(
    `  ${ok ? "  " : "!!"} ${name.padEnd(18)} ${String(found).padStart(3)} / ${String(spec.count).padEnd(3)} ${spec.selector}`
  );
  if (!ok) {
    failures.push(
      `${name}: declared ${spec.count}, found ${found} (${spec.selector}). ` +
        (found < spec.count
          ? "A block is missing. If a markdown edit was meant to add one, it matched nothing."
          : "There is an extra block. If that is intended, update the manifest in the same commit.")
    );
  }
}

if (failures.length) {
  console.error(`\nMANIFEST FAILED, ${failures.length} mismatch(es):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `\nMANIFEST MATCHED. ${Object.keys(manifest.blocks).length} block types at their declared counts.`
);
