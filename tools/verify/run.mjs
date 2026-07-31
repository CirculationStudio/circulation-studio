/* The verify runner: build, serve, check, tear down.
 *
 * WHY THIS EXISTS. All three checks drive a real browser against a real URL,
 * and nothing started the server they need. `npm run verify` died on the first
 * script with ERR_CONNECTION_REFUSED, which reads as a broken article system
 * rather than as a missing precondition. CLAUDE.md's build workflow says to run
 * it, so following the documented workflow failed on step one. The port lived
 * in three script files and in no document, so there was nothing to follow
 * either.
 *
 * WHY IT BUILDS RATHER THAN REUSING THE DEV SERVER. So that verify measures the
 * artifact that ships, and nothing else.
 *
 * It is NOT because the two render differently. They do not. All ten
 * fingerprint hashes used to differ against `eleventy --serve`, and that was a
 * measurement race rather than a rendering difference: fonts unregistered and
 * transitions mid flight at the moment of capture. readiness.mjs asserts both
 * preconditions, and the three checks now return identical results from either
 * server. That correction is load bearing, because every visual review on this
 * project has been done on the dev server, and it means those reviews were of
 * what ships.
 *
 * The server is deliberately this small. A static file server over _site is
 * what Cloudflare Pages is, so serving the build directory verbatim measures
 * closer to production than any dev pipeline can. No dependency, so verify does
 * not acquire one to start a server.
 *
 * Usage:
 *   npm run verify                 build, serve, run all three, tear down
 *   VERIFY_PORT=9001 npm run verify
 *
 * The three scripts remain runnable on their own against a server you are
 * already running, which is the loop for working on one check. They read
 * VERIFY_BASE, and this passes it in.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PORT = Number(process.env.VERIFY_PORT || 8899);
const BASE = `http://localhost:${PORT}`;
const ROOT = fileURLToPath(new URL("../../_site/", import.meta.url));
const CHECKS = ["manifest.mjs", "sweep.mjs", "fingerprint.mjs"];

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
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml"
};

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env }
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(args.at(-1) || command)} exited ${code}`))
    );
  });
}

/* Clean URLs resolve the way Eleventy writes them: /who-we-are/ is
   _site/who-we-are/index.html. The extensionless form is accepted too, so a
   link written without the trailing slash does not 404 here when it would
   resolve in production. */
function resolveFile(url) {
  const clean = decodeURIComponent((url || "/").split("?")[0].split("#")[0]);
  const target = path.join(ROOT, path.normalize(clean));
  if (!target.startsWith(ROOT.slice(0, -1))) return null;
  for (const candidate of [target, path.join(target, "index.html")]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(`404 ${req.url}`);
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream"
  });
  createReadStream(file).pipe(res);
});

function listen() {
  return new Promise((resolve, reject) => {
    server.once("error", (err) =>
      reject(
        err.code === "EADDRINUSE"
          ? new Error(
              `port ${PORT} is already in use. Something else is serving there, ` +
                `and measuring it would be measuring the wrong build. Stop it, or ` +
                `set VERIFY_PORT.`
            )
          : err
      )
    );
    server.listen(PORT, resolve);
  });
}

/* A build failure and a port collision are preconditions, not check results.
   They report the same way a failed check does rather than as an unhandled
   rejection with a stack trace through node internals, because the reader needs
   to know which of the two happened and nothing else. */
try {
  console.log(`[verify] building`);
  await run("npm", ["run", "build"]);
  await listen();
} catch (err) {
  console.error(`\n[verify] FAILED before any check ran: ${err.message}`);
  process.exit(1);
}
console.log(`[verify] serving _site at ${BASE}\n`);

let failure = null;
try {
  for (const check of CHECKS) {
    await run(process.execPath, [fileURLToPath(new URL(`./${check}`, import.meta.url))], {
      VERIFY_BASE: BASE
    });
  }
} catch (err) {
  failure = err;
}

/* closeAllConnections as well as close: a keep-alive socket left open by a
   browser that did not shut down cleanly would hold the process open forever,
   and a verify run that hangs is indistinguishable from one that is slow. */
await new Promise((resolve) => {
  server.close(resolve);
  server.closeAllConnections();
});

if (failure) {
  console.error(`\n[verify] FAILED: ${failure.message}`);
  process.exit(1);
}
console.log(`\n[verify] all three checks passed against the production build.`);
