/* The measurement gate, shared by all three checks.
 *
 * Two preconditions have to hold before a typographic measurement means
 * anything. Both are asserted here by name, and a page that cannot satisfy one
 * fails loudly saying which.
 *
 * ============================================================
 * 1. document.fonts.ready IS A SIGNAL THAT SUCCEEDS ON AN EMPTY SET.
 * ============================================================
 *
 * It resolves when every face the document currently KNOWS ABOUT has settled.
 * A document that knows about no faces has nothing outstanding, so it resolves
 * at once and reports "loaded". Measured at the same instant in the same page's
 * life: production had 27 faces registered and the dev server had 6, with none
 * of the 21 Lora faces present, and `document.fonts.status` read "loaded" in
 * both.
 *
 * That is the vacuous pass this directory exists to stamp out, in the one place
 * it had crept back in. Same shape as a selector that stops matching and then
 * reports alignment across an empty set. It survived longer because it looks
 * like a wait rather than like an assertion.
 *
 * So the faces are checked BY NAME. Once they are known to be registered,
 * document.fonts.ready means something again and is awaited to settle any face
 * still in flight. Order matters: prove the set is non-empty, then trust the
 * signal about it.
 *
 * ============================================================
 * 2. A TRANSITION IN FLIGHT IS A HALF MEASUREMENT.
 * ============================================================
 *
 * The dev server injects CSS from a JS module after the elements exist, so
 * applying it CHANGES their computed values, and a changed animatable property
 * with a transition on it animates. Measured on the second and later
 * navigations in one context: 28 running CSSTransitions covering color,
 * opacity, transform, visibility, background-color and four border colours,
 * against zero in production. The skip link's colour was caught mid
 * interpolation, reading rgb(0, 0, 238), then rgb(27, 17, 74), then
 * rgb(32, 21, 40), landing on rgb(33, 21, 35) about 150ms later, with the
 * stylesheet identical throughout at 22 rules and 61289 characters.
 *
 * Production never shows this because the stylesheet is a real <link>, so the
 * first computed style an element has is already the author's. There is no
 * earlier value to animate away from.
 *
 * Zero running animations is a genuine end state rather than an empty set that
 * proves nothing: production sits at zero from the start, which is the point.
 *
 * ============================================================
 * WHY NEITHER OF THESE IS A networkidle WAIT
 * ============================================================
 *
 * networkidle would also have made the numbers agree, and it is the wrong
 * instrument. Playwright's own documentation discourages it, and it asserts
 * that the network went quiet, which is not what is being relied on. What is
 * relied on is that the faces are registered and nothing is still moving. Those
 * are observable directly, so they are what is observed, and the failure says
 * which one was not met instead of "it was still busy".
 */

/* The faces this site renders in. Dual is self-hosted; Lora arrives through the
   @import in main.css, which is why Lora is the half that goes missing. Weights
   are what @font-face declares, not what one page happens to use: a weight
   vanishing from the registered set is a broken pipeline whether or not the
   page under test needed it. */
export const EXPECTED_FONTS = [
  { family: "Dual", weights: ["100", "200", "300", "400", "500", "600"] },
  { family: "Lora", weights: ["400", "500", "600"] }
];

const TIMEOUT_MS = 15000;
const POLL_MS = 50;

/* Registered faces grouped by family. Quotes are stripped because a family
   reaches FontFace quoted or bare depending on how the @font-face was written,
   and "Lora" and Lora are one family. */
const inspectFonts = () => {
  const byFamily = {};
  for (const face of document.fonts) {
    const family = face.family.replace(/^["']|["']$/g, "");
    const entry = (byFamily[family] ||= { family, count: 0, weights: [], loaded: 0 });
    entry.count += 1;
    if (!entry.weights.includes(face.weight)) entry.weights.push(face.weight);
    if (face.status === "loaded") entry.loaded += 1;
  }
  return Object.values(byFamily);
};

/* Anything still moving, named by what it animates, so the error can say so.
   Infinite animations are reported separately: they never finish, so they are a
   reason to stop rather than something to wait out. */
const inspectAnimations = () =>
  document
    .getAnimations()
    .filter((animation) => animation.playState === "running")
    .map((animation) => ({
      what:
        animation.transitionProperty ||
        animation.animationName ||
        animation.constructor.name,
      target: (() => {
        const el = animation.effect && animation.effect.target;
        if (!el) return "?";
        const cls =
          typeof el.className === "string" && el.className.trim()
            ? `.${el.className.trim().split(/\s+/)[0]}`
            : "";
        return `${el.tagName.toLowerCase()}${cls}`;
      })(),
      endless: animation.effect?.getTiming?.().iterations === Infinity
    }));

/* Three distinct font failures, kept apart because their causes differ: a
   family absent entirely is a stylesheet not applied, a missing weight is an
   @font-face lost from the pipeline, and registered but none loaded is a font
   file that did not fetch. */
function fontProblems(report) {
  const found = new Map(report.map((entry) => [entry.family, entry]));
  const out = [];

  for (const { family, weights } of EXPECTED_FONTS) {
    const entry = found.get(family);
    if (!entry || !entry.count) {
      out.push(`${family}: no faces registered at all`);
      continue;
    }
    const missing = weights.filter((weight) => !entry.weights.includes(weight));
    if (missing.length) {
      out.push(
        `${family}: weight(s) ${missing.join(", ")} not registered ` +
          `(registered: ${[...entry.weights].sort().join(", ")})`
      );
    }
    if (!entry.loaded) {
      out.push(`${family}: ${entry.count} face(s) registered, none loaded`);
    }
  }
  return out;
}

async function pollUntil(page, read, describe, where) {
  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    const state = await page.evaluate(read);
    const problem = describe(state);
    if (!problem) return;
    if (Date.now() > deadline) {
      throw new Error(`[readiness] ${where}, after ${TIMEOUT_MS / 1000}s:\n${problem}`);
    }
    await page.waitForTimeout(POLL_MS);
  }
}

/* Gate a page before measuring it. Fonts first, because applying the stylesheet
   is what registers them AND what starts the transitions, so the animation
   check would otherwise pass on a page that had not been styled yet. */
export async function assertReadyToMeasure(page, where) {
  await pollUntil(page, inspectFonts, (report) => {
    const problems = fontProblems(report);
    if (!problems.length) return null;
    const seen = report.length
      ? report.map((e) => `${e.family} x${e.count} (${e.loaded} loaded)`).join(", ")
      : "none at all";
    return (
      `  the faces this site renders in never registered.\n` +
      problems.map((p) => `    ${p}`).join("\n") +
      `\n  Registered: ${seen}.\n` +
      `  Measuring now measures fallback metrics and every ch-based width is ` +
      `wrong. document.fonts.ready does not catch this: it reports "loaded" ` +
      `when nothing is registered. See tools/verify/readiness.mjs.`
    );
  }, where);

  /* Now that the set is known to be non-empty, this means what it says. */
  await page.evaluate(() => document.fonts.ready);

  await pollUntil(page, inspectAnimations, (running) => {
    if (!running.length) return null;
    const endless = running.filter((a) => a.endless);
    const listed = running
      .slice(0, 6)
      .map((a) => `    ${a.what} on ${a.target}${a.endless ? " (never finishes)" : ""}`)
      .join("\n");
    return (
      `  ${running.length} animation(s) still running.\n${listed}` +
      (running.length > 6 ? `\n    ... and ${running.length - 6} more` : "") +
      (endless.length
        ? `\n  ${endless.length} of them never finish, so this will not settle ` +
          `on its own. An endless animation on a measured page has to be ` +
          `excluded deliberately.`
        : `\n  A property caught mid interpolation is a half measurement. See ` +
          `tools/verify/readiness.mjs.`)
    );
  }, where);
}
