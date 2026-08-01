/* Contrast, measured on the built pages and checked against the token matrix.
 *
 * WHY THIS EXISTS. Every ratio in this project was computed by hand at the
 * moment a value was introduced, written into a comment, and never checked
 * again. That is not sufficient and --text-faint proved it: it shipped at .45,
 * which is 2.86:1 on paper and 2.80:1 on mist, failing AA and failing even the
 * 3:1 large-text floor, on the byline and captions of five live pages. Nothing
 * caught it, because none of the other four scripts looks at colour. It was
 * found by reading a token file for an unrelated reason.
 *
 * TWO HALVES, AND THE SECOND IS THE ONE THAT CATCHES SURPRISES.
 *
 * 1. THE MATRIX asks: is every text token legible on every surface it is
 *    allowed to land on. Declared, because "allowed to land on" is a fact about
 *    the design and not something a page can tell you. A token with no declared
 *    surfaces fails rather than being skipped, so adding one forces the
 *    decision rather than deferring it.
 *
 * 2. THE LIVE SCAN asks: what is actually on the page. It walks every rendered
 *    element carrying text, takes its computed colour and the first opaque
 *    background above it, composites any alpha, and measures. This is the half
 *    that catches a token landing somewhere nobody predicted, which is exactly
 *    how the faint text got onto a white card as well as onto paper.
 *
 * BANNED PAIRS ARE ASSERTED ABSENT. madder on ink and ink on madder are both
 * 1.99:1 and SHORTCODES.md bans them outright. The live scan proves they do not
 * occur rather than trusting that nobody wrote them.
 *
 * THRESHOLDS are WCAG AA: 4.5:1 for normal text, 3:1 for large, where large is
 * 24px or 18.66px bold. The brief said 4.5 under 18px; this is stricter in the
 * 18 to 24 band and matches the standard rather than an approximation of it.
 *
 * Values come from src/css/main.css rather than being restated here. A checker
 * holding its own copy of a colour is a third place for it to drift.
 *
 * Usage: node tools/verify/contrast.mjs
 * Needs a server, like the other browser checks. `npm run verify` starts one.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { assertReadyToMeasure } from "./readiness.mjs";

const BASE = process.env.VERIFY_BASE || "http://localhost:8899";
const CSS = readFileSync(new URL("../../src/css/main.css", import.meta.url), "utf8");

const PAGES = [
  "/", "/who-we-are/", "/what-we-do/", "/results/", "/contact/",
  "/library/pipeline-test/", "/library/whitepaper-test/",
  "/yelp/state-of-yelp-advertising-2026/",
  /* The hub introduces three grounds in one page: the Start here band on ink,
     the rank 1 browse card on madder, and the rank tracking panel on mist with
     a white card inside it. Every one of those is a pairing the five marketing
     pages never produce, and the live scan is the half that catches a token
     landing somewhere the matrix did not predict. */
  "/yelp/"
];

/* Which surfaces a text token is allowed to land on. This is the contract: a
   token missing from here fails the run, because the alternative is a token
   that is never checked anywhere. */
const MATRIX = {
  "--text-body": ["--surface-page", "--surface-card", "--surface-panel"],
  "--text-muted": ["--surface-page", "--surface-card", "--surface-panel"],
  "--text-faint": ["--surface-page", "--surface-card", "--surface-panel"],
  "--text-on-deep": ["--surface-deep"],
  "--text-on-deep-muted": ["--surface-deep"],
  "--text-on-deep-faint": ["--surface-deep"],
  "--text-on-accent": ["--color-madder"],
  "--text-on-madder": ["--color-madder"],
  "--text-on-madder-muted": ["--color-madder"],
  "--color-madder": ["--surface-page", "--surface-card", "--surface-panel"],
  "--color-madder-lift": ["--surface-deep"],
  "--color-ink": ["--surface-page", "--surface-card", "--surface-panel"]
};

/* Both 1.99:1. SHORTCODES.md bans them; this proves they are absent rather
   than trusting the ban. */
const BANNED = [
  ["--color-madder", "--surface-deep", "madder on ink"],
  ["--color-ink", "--color-madder", "ink on madder"]
];

/* ---- colour ---- */
const token = (name, seen = new Set()) => {
  if (seen.has(name)) return null;
  seen.add(name);
  const m = new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, "m").exec(CSS);
  if (!m) return null;
  const value = m[1].trim();
  const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(value);
  return ref ? token(ref[1], seen) : value;
};

function parseColour(value) {
  if (!value) return null;
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const nums = v.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return null;
  /* Chromium serialises some computed colours as color(srgb r g b / a) with
     channels in 0 to 1 rather than 0 to 255. Read as bytes those are all
     near-black, which turned ten legible colophon lines into 1.15:1 failures on
     this script's first run. The units are part of the format, not a detail. */
  const srgb = /^color\(\s*srgb\b/i.test(v);
  const scale = srgb ? 255 : 1;
  return [+nums[0] * scale, +nums[1] * scale, +nums[2] * scale, nums.length > 3 ? +nums[3] : 1];
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const composite = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const required = (px, weight) =>
  px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5;

const failures = [];
let checked = 0;

/* ---- 1. the matrix ---- */
console.log("  matrix, every text token on every surface it may land on:");
for (const [text, surfaces] of Object.entries(MATRIX)) {
  const fg = parseColour(token(text));
  if (!fg) {
    failures.push(`${text}: declared in the matrix and not found in main.css.`);
    continue;
  }
  if (!surfaces.length) {
    failures.push(`${text}: no surfaces declared, so nothing checks it.`);
    continue;
  }
  for (const surface of surfaces) {
    const bg = parseColour(token(surface));
    if (!bg) {
      failures.push(`${surface}: surface token not found in main.css.`);
      continue;
    }
    const r = ratio(composite(fg, bg), bg);
    checked += 1;
    const ok = r >= 4.5;
    console.log(
      `  ${ok ? "  " : "!!"} ${text.padEnd(24)} on ${surface.padEnd(18)} ${r.toFixed(2)}:1`
    );
    if (!ok) {
      failures.push(
        `${text} on ${surface}: ${r.toFixed(2)}:1, below 4.5:1. This pairing is ` +
          `declared legal in the matrix, so either the value is wrong or the ` +
          `pairing should not be allowed.`
      );
    }
  }
}
if (!checked) {
  console.error("CONTRAST FAILED: the matrix checked nothing. Token names or main.css moved.");
  process.exit(1);
}

for (const [text, surface, label] of BANNED) {
  const fg = parseColour(token(text));
  const bg = parseColour(token(surface));
  if (!fg || !bg) continue;
  const r = ratio(composite(fg, bg), bg);
  console.log(`     banned pair ${label.padEnd(16)} ${r.toFixed(2)}:1, asserted absent from every page`);
}

/* ---- 2. the live scan ---- */
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const bannedSeen = [];
let elements = 0;

for (const path of PAGES) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await assertReadyToMeasure(page, path);

  const rows = await page.evaluate(() => {
    const out = [];
    const opaque = (c) => c && c !== "transparent" && !/,\s*0\s*\)$/.test(c);
    for (const el of document.querySelectorAll("body *")) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      /* Walk up collecting every painted layer until a fully opaque one, then
         composite them. A 9% madder wash over paper is not madder: taking the
         first painted layer as the ground reported the callout's own label as
         madder on madder at 1.00:1, which is a wash, not a contrast failure. */
      const layers = [];
      let ground = null;
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (!opaque(bg)) continue;
        const a = /rgba?\(([^)]+)\)/.exec(bg);
        const parts = a ? a[1].split(/[,\/\s]+/).filter(Boolean).map(Number) : null;
        layers.push(bg);
        if (!parts || parts.length < 4 || parts[3] >= 1) { ground = bg; break; }
      }
      if (!ground) { layers.push("rgb(255,255,255)"); ground = "rgb(255,255,255)"; }
      out.push({
        colour: cs.color, layers,
        size: parseFloat(cs.fontSize), weight: cs.fontWeight,
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "",
        text: (el.textContent || "").trim().slice(0, 30)
      });
    }
    return out;
  });

  const seen = new Set();
  for (const r of rows) {
    const fg = parseColour(r.colour);
    /* Flatten the painted stack from the bottom up, so a wash sits on what is
       under it rather than pretending to be solid. */
    const stack = r.layers.map(parseColour).filter(Boolean).reverse();
    if (!stack.length) continue;
    const bg = stack.reduce((under, layer) => [...composite(layer, under), 1]);
    if (!fg) continue;
    elements += 1;
    const value = ratio(composite(fg, bg), bg);
    const need = required(r.size, r.weight);
    const key = `${r.colour}|${r.layers.join("|")}|${r.size}`;
    if (value < need && !seen.has(key)) {
      seen.add(key);
      failures.push(
        `${path} ${r.tag}${r.cls ? "." + r.cls : ""} "${r.text}": ${value.toFixed(2)}:1 ` +
          `at ${r.size}px weight ${r.weight}, needs ${need}:1. ` +
          `${r.colour} on ${r.layers.join(" over ")}.`
      );
    }
    for (const [t, s, label] of BANNED) {
      const bfg = parseColour(token(t));
      const bbg = parseColour(token(s));
      if (!bfg || !bbg) continue;
      const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
      if (same(fg, bfg) && same(bg, bbg)) {
        bannedSeen.push(`${path} ${r.tag}${r.cls ? "." + r.cls : ""}: ${label}`);
      }
    }
  }
}
await browser.close();

if (!elements) {
  console.error("CONTRAST FAILED: the live scan found no text at all on any page.");
  process.exit(1);
}
console.log(`\n  live scan, ${elements} text-carrying elements across ${PAGES.length} pages`);

for (const hit of bannedSeen) {
  failures.push(`${hit}. This pairing is 1.99:1 and banned outright. See SHORTCODES.md.`);
}

if (failures.length) {
  console.error(`\nCONTRAST FAILED, ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `\nCONTRAST PASSED. ${checked} declared pairings and ${elements} rendered elements ` +
    `at AA, and both banned pairs absent.`
);
