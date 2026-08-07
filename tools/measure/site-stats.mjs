/* Measures the built site and writes src/_data/siteStats.json.
 *
 * ============================================================
 * WHY THIS EXISTS RATHER THAN A NUMBER TYPED INTO A TEMPLATE.
 * ============================================================
 *
 * /about-this-site/ publishes a scoreboard, and a scoreboard is only worth
 * reading if a reader with devtools open can check it. A hand-typed figure is
 * true on the day it is typed and quietly false after that, which is worse than
 * no figure: it reads as a measurement and is a memory.
 *
 * So every number here is measured off the real build, in a real browser, and
 * carries the date it was taken. Nothing on the page is typed except prose.
 *
 * WHAT IS MEASURED HERE AND WHAT IS NOT. Counts that Eleventy already knows
 * while rendering, how many pages and how many articles, are derived live in
 * the template from collections and are NOT in this file. They cannot go stale,
 * so recording them here would be strictly worse. This file holds only the
 * numbers that need a browser or a stopwatch: bytes, requests, timings.
 *
 * BYTES ARE REPORTED BOTH WAYS. The verify server sends everything
 * uncompressed; Cloudflare serves it gzipped. Reporting only one would be
 * misleading in one direction or the other, so both are recorded and the page
 * labels which is which. Gzip is computed here with zlib rather than guessed.
 *
 * THIRD PARTY MEANS ANY HOST THAT IS NOT THE ORIGIN SERVING THE PAGE. Our own
 * image CDN counts. Google Fonts counts. The point of the number is what a
 * reader's browser is made to contact, not who owns it.
 *
 * THE VITALS ARE LAB NUMBERS AND THE PAGE SAYS SO. Headless Chromium on
 * localhost, no throttling, no network latency worth the name. That is not
 * field data and must never be presented as it. It is still worth publishing:
 * CLS in particular is a layout property rather than a network one, so a lab
 * figure above zero is a real defect and a lab figure of zero is real evidence.
 * INP is absent because it needs a human interaction to exist at all, and a
 * measurement nobody performed is not a measurement.
 *
 * Usage:
 *   node tools/measure/site-stats.mjs          build, measure, write
 *   node tools/measure/site-stats.mjs --keep   measure the current _site
 *
 * Needs no running server. It starts one, the same static server the verify
 * runner uses and for the same reason: measuring the dev server would measure
 * a pipeline that never ships.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../../_site/", import.meta.url));
const OUT = fileURLToPath(new URL("../../src/_data/siteStats.json", import.meta.url));
const PORT = Number(process.env.MEASURE_PORT || 8901);
const KEEP = process.argv.includes("--keep");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml"
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))
    );
  });
}

/* Every built HTML page, as a URL path. Walked from disk rather than read from
   a collection, because this runs outside Eleventy and because the question is
   what actually shipped. */
function pages(dir = ROOT, prefix = "/") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...pages(full, `${prefix}${entry.name}/`));
    } else if (entry.name === "index.html") {
      out.push(prefix);
    }
  }
  return out;
}

function resolveFile(url) {
  const clean = decodeURIComponent((url || "/").split("?")[0].split("#")[0]);
  const target = path.join(ROOT, path.normalize(clean));
  if (!target.startsWith(ROOT.slice(0, -1))) return null;
  for (const candidate of [target, path.join(target, "index.html")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

/* ---- 1. the build, timed ---- */

let buildMs = null;
if (!KEEP) {
  const started = Date.now();
  await run("npx", ["eleventy"]);
  buildMs = Date.now() - started;
  console.log(`\n[measure] build ${buildMs} ms`);
} else {
  console.log("[measure] --keep, measuring the existing _site and not timing a build");
}

/* ---- 2. serve it ---- */

const server = createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("404");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream"
  });
  createReadStream(file).pipe(res);
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(PORT, resolve);
});

/* ---- 3. measure every page ---- */

const urls = pages().sort();
const origin = `http://localhost:${PORT}`;
const browser = await chromium.launch();
const measured = [];
const thirdPartyHosts = new Map();

for (const url of urls) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let firstPartyBytes = 0;
  let firstPartyGzip = 0;
  let scriptBytes = 0;
  let scriptGzip = 0;
  let thirdPartyBytes = 0;
  let thirdPartyRequests = 0;
  let firstPartyRequests = 0;

  page.on("response", async (response) => {
    const host = new URL(response.url()).host;
    const first = response.url().startsWith(origin);
    let body;
    try {
      body = await response.body();
    } catch {
      body = null;
    }
    const size = body ? body.length : 0;

    if (first) {
      firstPartyRequests += 1;
      firstPartyBytes += size;
      if (body) firstPartyGzip += gzipSync(body).length;
      if (response.request().resourceType() === "script") {
        scriptBytes += size;
        if (body) scriptGzip += gzipSync(body).length;
      }
    } else {
      thirdPartyRequests += 1;
      thirdPartyBytes += size;
      thirdPartyHosts.set(host, (thirdPartyHosts.get(host) || 0) + 1);
    }
  });

  await page.goto(origin + url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  /* LCP and CLS, buffered so entries recorded before the observer attached are
     not lost. Given a settle window, because CLS accumulates and a value read
     the instant load fires has had nothing to accumulate from. */
  const vitals = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let lcp = 0;
        let cls = 0;
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) cls += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          /* an unsupported entry type leaves the value at zero, and a zero we
             did not measure is a lie, so it is reported as null instead */
          resolve({ lcp: null, cls: null });
          return;
        }
        setTimeout(() => resolve({ lcp: Math.round(lcp), cls: Number(cls.toFixed(4)) }), 1500);
      })
  );

  measured.push({
    url,
    firstPartyBytes,
    firstPartyGzip,
    firstPartyRequests,
    scriptBytes,
    scriptGzip,
    thirdPartyBytes,
    thirdPartyRequests,
    lcp: vitals.lcp,
    cls: vitals.cls
  });

  await context.close();
  process.stdout.write(".");
}

await browser.close();
await new Promise((resolve) => server.close(resolve));

/* ---- 4. aggregate ---- */

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};
const kb = (bytes) => Number((bytes / 1024).toFixed(1));

const byWeight = [...measured].sort((a, b) => a.firstPartyBytes - b.firstPartyBytes);
const heaviest = byWeight.at(-1);
const lightest = byWeight[0];

/* JS is one shared bundle, so every page ships the same bytes. Asserted rather
   than averaged: if pages ever differ, this should be seen rather than smoothed
   into a mean that describes no page. */
const scriptSizes = new Set(measured.map((m) => m.scriptBytes));

const stats = {
  /* THE LOCAL CALENDAR DAY, NOT THE UTC ONE. toISOString is UTC, and this ran
     at 20:23 local on a machine at GMT-0600, which UTC calls the next day. A
     measurement stamped with tomorrow's date reads as fabricated to the one
     kind of reader this page is written for. Same class of bug the calendarDate
     filter exists to prevent, in the other direction. */
  measuredAt: new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date()),
  how:
    "Built with npx eleventy, served from _site by a static server with no " +
    "compression, and loaded in headless Chromium at 1440 by 900 with no " +
    "throttling. Bytes are what the browser received. The figures describe the " +
    "build they were taken from, which is the one before the build you are " +
    "reading, because writing them is what changed it.",
  build: {
    ms: buildMs,
    pagesWritten: urls.length
  },
  weight: {
    medianBytes: median(measured.map((m) => m.firstPartyBytes)),
    medianGzipBytes: median(measured.map((m) => m.firstPartyGzip)),
    medianKb: kb(median(measured.map((m) => m.firstPartyBytes))),
    medianGzipKb: kb(median(measured.map((m) => m.firstPartyGzip))),
    medianRequests: median(measured.map((m) => m.firstPartyRequests)),
    heaviest: { url: heaviest.url, kb: kb(heaviest.firstPartyBytes), gzipKb: kb(heaviest.firstPartyGzip) },
    lightest: { url: lightest.url, kb: kb(lightest.firstPartyBytes), gzipKb: kb(lightest.firstPartyGzip) }
  },
  js: {
    bytes: [...scriptSizes][0] ?? 0,
    gzipBytes: measured[0] ? measured[0].scriptGzip : 0,
    sameOnEveryPage: scriptSizes.size === 1
  },
  thirdParty: {
    medianRequestsPerPage: median(measured.map((m) => m.thirdPartyRequests)),
    maxRequestsOnAPage: Math.max(...measured.map((m) => m.thirdPartyRequests)),
    pagesWithNone: measured.filter((m) => m.thirdPartyRequests === 0).length,
    hosts: [...thirdPartyHosts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([host, requests]) => ({ host, requests }))
  },
  vitals: {
    lcpMedianMs: median(measured.filter((m) => m.lcp !== null).map((m) => m.lcp)),
    lcpWorstMs: Math.max(...measured.filter((m) => m.lcp !== null).map((m) => m.lcp)),
    clsWorst: Math.max(...measured.filter((m) => m.cls !== null).map((m) => m.cls)),
    pagesAtZeroCls: measured.filter((m) => m.cls === 0).length,
    note:
      "Lab figures from headless Chromium on localhost, not field data. INP is " +
      "not listed because it requires a real interaction to exist."
  },
  pagesMeasured: measured.length
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(stats, null, 2) + "\n");

console.log(`\n\n[measure] wrote ${path.relative(process.cwd(), OUT)}`);
console.log(JSON.stringify(stats, null, 2));
