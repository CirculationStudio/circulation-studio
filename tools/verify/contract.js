/* The contract check: SHORTCODES.md against eleventy.config.js, both ways.
 *
 * WHY THIS EXISTS. SHORTCODES.md calls itself the contract between two systems
 * that never talk to each other. The build is deterministic and fails loudly.
 * The authoring project is a language model writing markdown against this file,
 * and it fails SILENTLY: it writes `{% statcallout 68% %}` and nothing tells it
 * otherwise until a build it never sees rejects the file. The whole design
 * depends on the two sides agreeing, and until now nothing checked that they
 * did. They had already drifted: thirteen of roughly forty rows were real and
 * the file did not say which, `pane` and `fn` were live and documented only in
 * prose, and `related` described a cluster taxonomy that did not exist.
 *
 * IT READS THE BUILD RATHER THAN A DESCRIPTION OF IT. The shortcodes are
 * registered by running the real config against a recording stub, the arguments
 * are discovered by calling each shortcode with a Proxy that records every
 * property it reads, and required arguments are found by omitting each in turn
 * and seeing whether the build objects. The closed sets and the parent-and-child
 * pairs are imported from eleventy.config.js directly. Nothing here parses
 * JavaScript source, and nothing here restates a value that lives on the other
 * side, because a checker holding its own copy of the facts is a third thing to
 * keep in step rather than a check.
 *
 * NO CHECK MAY PASS ON AN EMPTY SET, the house rule. A parse that finds no rows
 * or no registrations fails before any comparison is made, because zero rows
 * compare equal to zero registrations and the run would go green having
 * measured nothing.
 *
 * Usage: node tools/verify/contract.js
 * Needs no server and no build. It is first in `npm run verify` because it is
 * the cheapest check and a spec mismatch should not wait for a browser.
 */
import { readFileSync, readdirSync } from "node:fs";

const SPEC_PATH = new URL("../../SHORTCODES.md", import.meta.url);
const CONFIG_PATH = new URL("../../eleventy.config.js", import.meta.url);

const failures = [];
const notes = [];
const fail = (what) => failures.push(what);

/* ============================================================
   1. The spec
   ============================================================ */

const spec = readFileSync(SPEC_PATH, "utf8");
const specLines = spec.split("\n");

/* Table rows, split on the pipe and trimmed, with the raw first cell kept
   because its indentation is what marks a child row. */
function tableRows(lines) {
  const tables = [];
  let current = null;

  for (const line of lines) {
    const isRow = /^\s*\|/.test(line);
    if (!isRow) {
      current = null;
      continue;
    }
    const raw = line.trim().split("|").slice(1, -1);
    const cells = raw.map((cell) => cell.trim());
    if (cells.every((cell) => /^-+$/.test(cell))) continue;

    if (!current) {
      current = { header: cells, rows: [] };
      tables.push(current);
      continue;
    }
    current.rows.push({ raw, cells });
  }
  return tables;
}

const tables = tableRows(specLines);

const vocabularyTables = tables.filter(
  (t) => t.header[0] === "Shortcode" && t.header[1] === "Status" && t.header[2] === "Args"
);
const closedSetTables = tables.filter(
  (t) => t.header[0] === "Shortcode" && t.header[1] === "Argument"
);

/* `**\`name\`**` is required, `\`name\`` is optional. */
function parseArgs(cell) {
  const out = [];
  for (const m of cell.matchAll(/\*\*`([^`]+)`\*\*|`([^`]+)`/g)) {
    out.push({ name: m[1] ?? m[2], required: Boolean(m[1]) });
  }
  return out;
}

const specShortcodes = new Map();
for (const table of vocabularyTables) {
  let parent = null;
  for (const { raw, cells } of table.rows) {
    const name = cells[0].replace(/`/g, "").trim();
    if (!name) continue;
    /* A child row is indented inside its first cell. One space is the ordinary
       padding every row has; two or more is the marker. */
    const indent = raw[0].match(/^ */)[0].length;
    const isChild = indent >= 2;
    if (!isChild) parent = name;

    specShortcodes.set(name, {
      name,
      status: cells[1],
      args: parseArgs(cells[2]),
      width: cells[3],
      paired: cells[4] === "P",
      parent: isChild ? parent : null
    });
  }
}

const specClosedSets = [];
for (const table of closedSetTables) {
  for (const { cells } of table.rows) {
    const shortcode = cells[0].replace(/`/g, "").trim();
    if (!shortcode) continue;
    specClosedSets.push({
      shortcode,
      argument: cells[1].replace(/`/g, "").trim(),
      status: cells[2],
      values: [...cells[3].matchAll(/`([^`]+)`/g)].map((m) => m[1]),
      default: (cells[4].match(/`([^`]+)`/) || [])[1] ?? null
    });
  }
}

if (!specShortcodes.size) {
  console.error("CONTRACT FAILED: parsed zero shortcode rows from SHORTCODES.md.");
  console.error("  The tables moved or the column layout changed, and every");
  console.error("  comparison below would have passed against an empty set.");
  process.exit(1);
}
if (!specClosedSets.length) {
  console.error("CONTRACT FAILED: parsed zero closed sets from SHORTCODES.md.");
  process.exit(1);
}

const liveSpec = [...specShortcodes.values()].filter((s) => s.status === "LIVE");
const unknownStatus = [...specShortcodes.values()].filter(
  (s) => s.status !== "LIVE" && s.status !== "PLANNED"
);
for (const s of unknownStatus) {
  fail(`${s.name}: status is "${s.status}", which is neither LIVE nor PLANNED.`);
}

/* ============================================================
   2. The build
   ============================================================ */

const {
  PANE_SURFACES,
  TABLE_KINDS,
  CALLOUT_LABELS,
  CHILD_PAIRS,
  IMAGE_WIDTHS,
  YELP_CLUSTERS,
  YELP_FRONTMATTER,
  ARTICLE_KINDS,
  default: configure
} = await import(CONFIG_PATH.href);

/* A stub that records the two registrations we care about and swallows the
   rest. A Proxy rather than a fixed object, so a config that starts calling a
   new Eleventy method does not crash the checker. */
const registered = new Map();
const recorders = {
  addShortcode: (name, fn) => registered.set(name, { name, paired: false, fn }),
  addPairedShortcode: (name, fn) => registered.set(name, { name, paired: true, fn })
};
configure(new Proxy({}, { get: (_t, prop) => recorders[prop] ?? (() => {}) }));

if (!registered.size) {
  console.error("CONTRACT FAILED: the config registered no shortcodes at all.");
  console.error("  Either the stub stopped matching Eleventy's API or the config");
  console.error("  threw. Every comparison below would have measured nothing.");
  process.exit(1);
}

/* Which exported set governs which argument. The only binding in this file
   between a spec row and a build value, and a LIVE row with no binding fails
   rather than being skipped, so adding a closed set cannot go unchecked. */
const CLOSED_SET_BINDING = {
  "pane.surface": () => [...PANE_SURFACES],
  "table.kind": () => [...TABLE_KINDS],
  "callout.label": () => [...CALLOUT_LABELS.keys()],
  "image.width": () => [...IMAGE_WIDTHS]
};

const defaultFor = (shortcode, argument) =>
  specClosedSets.find((s) => s.shortcode === shortcode && s.argument === argument)?.default ??
  null;
const valuesFor = (shortcode, argument) =>
  specClosedSets.find((s) => s.shortcode === shortcode && s.argument === argument)?.values ?? null;

/* Arguments whose value has to satisfy a FORMAT before the block will render at
   all, the same problem the closed sets have and the same fix. `src` is checked
   for the orientation token that gives an image block its aspect ratio, so a
   bare "probe" throws and every argument probe for that shortcode then reports
   a required-argument failure that is really a malformed-input failure.

   This is a test input rather than a fact about the contract, which is why it
   may live here when a value from the other side may not. Same standing as
   PROBE_CONTEXT's kind=guide below. */
const PROBE_VALUES = {
  src: "cs-img-probe-01-landscape.webp"
};

/* A value the implementation will accept, so a probe fails for the reason
   being probed and not because a closed set rejected a dummy string. */
function probeValue(shortcode, argument) {
  const values = valuesFor(shortcode, argument);
  if (values && values.length) return defaultFor(shortcode, argument) ?? values[0];
  return PROBE_VALUES[argument] ?? "probe";
}

function optionsProxy(shortcode, { omit = null, record = null } = {}) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === "symbol") return undefined;
        if (record && prop !== "__keywords") record.add(prop);
        if (prop === omit) return undefined;
        return probeValue(shortcode, prop);
      }
    }
  );
}

const PROBE_CONTEXT = {
  page: { inputPath: "tools/verify/contract.js probe" },
  /* kind=guide so `callout` accepts every label in its set. Any other kind
     makes "Watch out" throw, which would read as a required-argument failure. */
  ctx: { kind: "guide" }
};

/* Shortcodes warn on their own account, and a probe deliberately feeds them
   states they are entitled to complain about. */
function quietly(run) {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return { ok: true, value: run() };
  } catch (error) {
    return { ok: false, error };
  } finally {
    console.warn = warn;
  }
}

function callShortcode(entry, options) {
  return entry.paired
    ? entry.fn.call(PROBE_CONTEXT, "probe content", options)
    : entry.fn.call(PROBE_CONTEXT, options);
}

/* ============================================================
   3. Completeness, both directions
   ============================================================ */

for (const [name, entry] of registered) {
  const row = specShortcodes.get(name);
  if (!row) {
    fail(
      `${name}: registered in eleventy.config.js and absent from the vocabulary ` +
        `tables in SHORTCODES.md. The authoring project cannot use what is not written down.`
    );
    continue;
  }
  if (row.status !== "LIVE") {
    fail(
      `${name}: registered in eleventy.config.js but marked ${row.status} in ` +
        `SHORTCODES.md. It exists, so the row is LIVE.`
    );
  }
  if (row.paired !== entry.paired) {
    fail(
      `${name}: SHORTCODES.md says ${row.paired ? "paired (P)" : "not paired"} and the ` +
        `build registers it with ${entry.paired ? "addPairedShortcode" : "addShortcode"}. ` +
        `A mismatch means every use is a parse error, in one direction or the other.`
    );
  }
}

for (const row of liveSpec) {
  if (!registered.has(row.name)) {
    fail(
      `${row.name}: marked LIVE in SHORTCODES.md and not registered in ` +
        `eleventy.config.js. An article using it fails the build, because an ` +
        `unknown Nunjucks tag throws at parse time.`
    );
  }
}

/* ============================================================
   4. Arguments, by asking the implementation
   ============================================================ */

for (const row of liveSpec) {
  const entry = registered.get(row.name);
  if (!entry) continue;

  const read = new Set();
  const full = quietly(() => callShortcode(entry, optionsProxy(row.name, { record: read })));
  if (!full.ok) {
    fail(
      `${row.name}: threw with every documented argument supplied, so the row ` +
        `cannot describe it. ${full.error.message.split("\n")[0]}`
    );
    continue;
  }

  const specNames = row.args.map((a) => a.name);
  const buildNames = [...read].filter((name) => /^[a-z][a-zA-Z]*$/.test(name));

  for (const name of buildNames) {
    if (!specNames.includes(name)) {
      fail(
        `${row.name}: the implementation reads an argument "${name}" that ` +
          `SHORTCODES.md does not list. Documented: ${specNames.join(", ") || "(none)"}.`
      );
    }
  }
  for (const name of specNames) {
    if (!buildNames.includes(name)) {
      fail(
        `${row.name}: SHORTCODES.md lists an argument "${name}" that the ` +
          `implementation never reads. Read: ${buildNames.join(", ") || "(none)"}.`
      );
    }
  }

  /* Required means the build objects when it is missing. Asked by omitting one
     argument at a time, so a required flag cannot be right in the table and
     wrong in the code. */
  for (const arg of row.args) {
    if (!buildNames.includes(arg.name)) continue;
    const without = quietly(() =>
      callShortcode(entry, optionsProxy(row.name, { omit: arg.name }))
    );
    const buildRequires = !without.ok;
    if (buildRequires && !arg.required) {
      fail(
        `${row.name}.${arg.name}: the build fails without it, and SHORTCODES.md ` +
          `lists it as optional. Mark it required, in bold.`
      );
    }
    if (!buildRequires && arg.required) {
      fail(
        `${row.name}.${arg.name}: SHORTCODES.md marks it required, in bold, and ` +
          `the build renders without it. Either enforce it or unbold the row.`
      );
    }
  }
}

/* ============================================================
   5. Parent and child
   ============================================================ */

const specPairs = new Set(
  [...specShortcodes.values()]
    .filter((s) => s.parent && s.status === "LIVE")
    .map((s) => `${s.name} under ${s.parent}`)
);
const buildPairs = new Set(CHILD_PAIRS.map((p) => `${p.name} under ${p.parentName}`));

for (const pair of buildPairs) {
  if (!specPairs.has(pair)) {
    fail(
      `${pair}: the build enforces this pairing and SHORTCODES.md does not ` +
        `show it, as a LIVE row indented under its parent. Spec pairs: ` +
        `${[...specPairs].join("; ") || "(none)"}.`
    );
  }
}
for (const pair of specPairs) {
  if (!buildPairs.has(pair)) {
    fail(
      `${pair}: SHORTCODES.md indents this as a child and the build does not ` +
        `enforce it, so an orphan reaches the page. Add it to CHILD_PAIRS. ` +
        `Build pairs: ${[...buildPairs].join("; ") || "(none)"}.`
    );
  }
}

/* ============================================================
   6. Closed sets
   ============================================================ */

for (const set of specClosedSets) {
  const key = `${set.shortcode}.${set.argument}`;
  const row = specShortcodes.get(set.shortcode);

  if (!row) {
    fail(`${key}: a closed set for a shortcode with no vocabulary row.`);
    continue;
  }
  if (set.status !== row.status) {
    fail(
      `${key}: the closed set is marked ${set.status} and the shortcode row is ` +
        `marked ${row.status}. One of them moved without the other.`
    );
  }
  if (set.status !== "LIVE") {
    notes.push(`${key}: PLANNED, ${set.values.length} values recorded and nothing to compare yet.`);
    continue;
  }

  const binding = CLOSED_SET_BINDING[key];
  if (!binding) {
    fail(
      `${key}: LIVE closed set with no build-side binding in contract.js, so ` +
        `nothing is checking it. Add it to CLOSED_SET_BINDING.`
    );
    continue;
  }

  const build = binding();
  const missing = set.values.filter((v) => !build.includes(v));
  const extra = build.filter((v) => !set.values.includes(v));
  if (missing.length || extra.length) {
    fail(
      `${key}: the sets differ. SHORTCODES.md has ${set.values.map((v) => `"${v}"`).join(", ")}; ` +
        `the build has ${build.map((v) => `"${v}"`).join(", ")}.` +
        (missing.length ? ` Documented and not built: ${missing.join(", ")}.` : "") +
        (extra.length ? ` Built and not documented: ${extra.join(", ")}.` : "")
    );
  }

  /* The documented default, checked by rendering. Omitting the argument has to
     produce exactly what passing the default produces, which is what a default
     means and needs no knowledge of the markup. */
  if (set.default) {
    const entry = registered.get(set.shortcode);
    if (entry) {
      const omitted = quietly(() =>
        callShortcode(entry, optionsProxy(set.shortcode, { omit: set.argument }))
      );
      const explicit = quietly(() => callShortcode(entry, optionsProxy(set.shortcode)));
      if (!omitted.ok || !explicit.ok || omitted.value !== explicit.value) {
        fail(
          `${key}: SHORTCODES.md documents the default as "${set.default}", and ` +
            `omitting the argument does not render the same as passing it.`
        );
      }
    }
  }
}

/* ============================================================
   6b. Every component stylesheet is imported
   ============================================================

   A component CSS file that nothing imports is the quietest failure in this
   repo. The block still renders, the markup still carries its classes, the
   manifest still counts it and the sweep still finds it on the prose column,
   because an unstyled block inherits the column's left edge. It just looks
   wrong, and only to a human who happens to look.

   It has already happened twice in one sitting: methodology.css and
   references.css were both written, both correct, and both absent from
   main.css. Caught by measuring a colour that came back as the article's h2
   scale instead of the component's own.

   So the check is that the directory and the import list agree. Not a list of
   filenames here, which would rot the same way: it reads both sides. */
const CSS_DIR = new URL("../../src/css/components/", import.meta.url);
const MAIN_CSS = readFileSync(new URL("../../src/css/main.css", import.meta.url), "utf8");
const componentFiles = readdirSync(CSS_DIR).filter((f) => f.endsWith(".css"));

if (!componentFiles.length) {
  console.error("CONTRACT FAILED: no component stylesheets found at all.");
  process.exit(1);
}
for (const file of componentFiles) {
  if (!MAIN_CSS.includes(`components/${file}`)) {
    fail(
      `${file}: exists in src/css/components/ and main.css never imports it, so ` +
        `none of its rules ship. The block still renders and still counts, it ` +
        `just falls back to the article's own scale.`
    );
  }
}

/* ============================================================
   6c. Frontmatter, both directions
   ============================================================

   The shortcode half of this file has been checked for a while. The frontmatter
   half had not, which is how `cluster` and `nextreview` sat documented in
   SHORTCODES.md and read by nothing at all: `cluster` described a taxonomy that
   did not exist, and `nextreview` still has no reader. A key nobody consumes is
   a key the authoring project is being asked to fill in for no reason.

   DIRECTION A: every key documented in the frontmatter block appears somewhere
   in the build. Grepped rather than declared, because a declaration that a key
   is read is exactly the thing that was wrong before.

   DIRECTION B: every key any article actually sets is documented, AND is not
   marked PLANNED. The first half catches an author inventing a key. The second
   catches the opposite failure, and it is the one that already happened:
   `nextreview` sat filled in on the whitepaper while SHORTCODES.md said PLANNED
   keys "are read by nothing yet" and that the authoring project should not be
   filling them in. That rule was stated and unenforced, so the run reported the
   key as pending and passed. A PLANNED key with a value is worse than an empty
   one: it looks supported, it survives review, and the day the key is wired up
   nobody knows whether the value was authored against the real behaviour or
   guessed years earlier against none.

   And the cluster set is compared like any other closed set. */
const FRONTMATTER_EXEMPT = new Set(["title"]);

const frontmatterBlock = /\*\*Frontmatter\*\*[^`]*```yaml\n([\s\S]*?)```/.exec(spec);
if (!frontmatterBlock) {
  console.error("CONTRACT FAILED: no frontmatter block found in SHORTCODES.md.");
  process.exit(1);
}
const documentedKeys = [];
const plannedKeys = new Set();
for (const line of frontmatterBlock[1].split("\n")) {
  const m = /^([a-z][a-z0-9]*):(.*)$/.exec(line);
  if (!m) continue;
  documentedKeys.push(m[1]);
  if (/#\s*PLANNED/.test(m[2])) plannedKeys.add(m[1]);
}
if (!documentedKeys.length) {
  console.error("CONTRACT FAILED: the frontmatter block documents no keys.");
  process.exit(1);
}

/* Everything that could read a frontmatter key. */
const readerFiles = [];
const collectReaders = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
    if (entry.isDirectory()) collectReaders(full);
    else if (/\.(njk|js|mjs)$/.test(entry.name)) readerFiles.push(readFileSync(full, "utf8"));
  }
};
collectReaders(new URL("../../src/_includes/", import.meta.url));
collectReaders(new URL("../../src/_data/", import.meta.url));
collectReaders(new URL("../../tools/eleventy/", import.meta.url));
readerFiles.push(readFileSync(new URL("../../eleventy.config.js", import.meta.url), "utf8"));
for (const dir of ["../../src/yelp/", "../../src/library/"]) {
  for (const entry of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
    if (entry.name.endsWith(".11tydata.js")) {
      readerFiles.push(readFileSync(new URL(`${dir}${entry.name}`, import.meta.url), "utf8"));
    }
  }
}
const readers = readerFiles.join("\n");

for (const key of documentedKeys) {
  if (FRONTMATTER_EXEMPT.has(key)) continue;
  if (plannedKeys.has(key)) {
    notes.push(
      `frontmatter "${key}": PLANNED, read by nothing yet and not expected to be. ` +
        `Direction B fails if an article fills it in.`
    );
    continue;
  }
  /* Grepped, which can say a key is read when the word merely appears in a
     comment. It cannot say a key is read when it is not, which is the direction
     that matters here. */
  const used = new RegExp(`\\b${key}\\b`).test(readers);
  if (!used) {
    fail(
      `frontmatter "${key}": documented in SHORTCODES.md and read by nothing in ` +
        `the build. Either wire it up or stop asking the authoring project for it.`
    );
  }
}

/* Direction B, plus the cluster set. */
const articleDirs = ["../../src/yelp/", "../../src/library/"];
const authored = new Map();
for (const dir of articleDirs) {
  for (const entry of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
    if (!entry.name.endsWith(".md")) continue;
    const text = readFileSync(new URL(`${dir}${entry.name}`, import.meta.url), "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(text);
    if (!fm) continue;
    for (const m of fm[1].matchAll(/^([a-z][a-z0-9]*):/gm)) {
      authored.set(m[1], `${dir}${entry.name}`.replace("../../", ""));
    }
  }
}
for (const [key, where] of authored) {
  if (!documentedKeys.includes(key)) {
    fail(
      `frontmatter "${key}" is set in ${where} and is not in SHORTCODES.md's ` +
        `frontmatter block. The authoring project writes against that block.`
    );
  } else if (plannedKeys.has(key)) {
    fail(
      `frontmatter "${key}" is set in ${where} and is marked PLANNED in ` +
        `SHORTCODES.md, which means nothing in the build reads it. A PLANNED key ` +
        `with a value in it reads as supported and is not. Either wire it up and ` +
        `drop the PLANNED marker in the same commit, or take the key out of the ` +
        `file.`
    );
  }
}

/* The src/yelp/ required keys, imported rather than grepped.

   THE GREP IS NOT ENOUGH FOR THESE TWO, and `summary` is why. Direction A
   proves a key is read by looking for the word anywhere in the build, and
   `\bsummary\b` already matches `<summary class="cs-qa__q">` in the faq
   shortcode, the default title "Executive summary", and a comment. So the key
   could stop being read tomorrow and Direction A would still pass, having
   matched an HTML tag. That is a check passing on the wrong evidence, which is
   the house failure mode.

   These two are the keys a build actually fails without, so they get the
   treatment the closed sets get: imported from eleventy.config.js and compared,
   with no copy of the list on this side. */
for (const [key] of YELP_FRONTMATTER) {
  if (!documentedKeys.includes(key)) {
    fail(
      `frontmatter "${key}" is required in src/yelp/ by YELP_FRONTMATTER and is ` +
        `not in SHORTCODES.md's frontmatter block. The authoring project writes ` +
        `against that block and would never know to supply it.`
    );
  } else if (plannedKeys.has(key)) {
    fail(
      `frontmatter "${key}" is required in src/yelp/ by YELP_FRONTMATTER and is ` +
        `marked PLANNED in SHORTCODES.md. Those cannot both be true: the build ` +
        `fails without it and the spec says not to write it.`
    );
  }
}

/* The kind set, compared like the cluster set. The frontmatter block's inline
   comment carries the same list, so both are checked: a table row the build
   does not know about, and a comment that has drifted from either. */
const kindTable = tables.find((t) => t.header[0] === "Kind" && t.header[1] === "Label rendered");
if (!kindTable) {
  fail("no article kinds table in SHORTCODES.md, so the kind set is unchecked.");
} else {
  const specKinds = kindTable.rows.map((r) => r.cells[0].replace(/`/g, "").trim());
  const specLabels = kindTable.rows.map((r) => r.cells[1].trim());
  const buildKinds = [...ARTICLE_KINDS.keys()];
  if (JSON.stringify([...specKinds].sort()) !== JSON.stringify([...buildKinds].sort())) {
    fail(
      `the kind set differs. SHORTCODES.md has ${specKinds.join(", ")}; ` +
        `the build has ${buildKinds.join(", ")}.`
    );
  }
  /* The LABEL is what a reader sees, so a drifted label is a visible defect
     rather than a naming one. Compared per row. */
  for (const [i, kind] of specKinds.entries()) {
    const built = ARTICLE_KINDS.get(kind);
    if (built && built !== specLabels[i]) {
      fail(
        `kind "${kind}" renders "${built}" in the build and SHORTCODES.md says ` +
          `"${specLabels[i]}". That string is printed on every card of that type.`
      );
    }
  }
  /* And the frontmatter comment, which is the line the authoring project
     actually reads when it picks a kind. */
  const kindComment = /^kind:.*#\s*(.+)$/m.exec(frontmatterBlock[1]);
  if (!kindComment) {
    fail("the frontmatter block's kind line carries no comment listing the set.");
  } else {
    const commented = kindComment[1].split("|").map((s) => s.trim()).filter(Boolean);
    if (JSON.stringify([...commented].sort()) !== JSON.stringify([...buildKinds].sort())) {
      fail(
        `the kind comment in the frontmatter block lists ${commented.join(", ")}, ` +
          `and the build has ${buildKinds.join(", ")}. That comment is what the ` +
          `authoring project reads when it picks a kind.`
      );
    }
  }
}

const clusterTable = tables.find((t) => t.header[0] === "Cluster" && t.header[1] === "Slug");
if (!clusterTable) {
  fail("no cluster table in SHORTCODES.md, so the Yelp taxonomy is unchecked.");
} else {
  const specClusters = clusterTable.rows.map((r) => r.cells[1].replace(/`/g, "").trim());
  const buildClusters = [...YELP_CLUSTERS.keys()];
  const missing = specClusters.filter((c) => !buildClusters.includes(c));
  const extra = buildClusters.filter((c) => !specClusters.includes(c));
  if (missing.length || extra.length) {
    fail(
      `the cluster set differs. SHORTCODES.md has ${specClusters.join(", ")}; ` +
        `the build has ${buildClusters.join(", ")}.`
    );
  }
  if (JSON.stringify(specClusters) !== JSON.stringify(buildClusters)) {
    fail(
      `the cluster ORDER differs, and the order is what the coverage map renders. ` +
        `SHORTCODES.md: ${specClusters.join(", ")}. Build: ${buildClusters.join(", ")}.`
    );
  }
}

/* ============================================================
   7. Duplicated adjacent sentences
   ============================================================

   Narrow on purpose. This is the specific corruption that already happened
   here: a sentence repeated immediately after itself, which reads as emphasis
   on a skim and is invisible in a diff of a reflowed paragraph. */

const prose = [];
let inFence = false;
for (const line of specLines) {
  if (/^\s*```/.test(line)) {
    inFence = !inFence;
    continue;
  }
  if (inFence || /^\s*\|/.test(line) || /^\s*#/.test(line)) {
    prose.push("");
    continue;
  }
  prose.push(line);
}

for (const paragraph of prose.join("\n").split(/\n\s*\n/)) {
  const flat = paragraph.replace(/\s+/g, " ").trim();
  if (!flat) continue;
  const sentences = flat.split(/(?<=[.!?])\s+/).map((s) => s.trim());
  for (let i = 1; i < sentences.length; i++) {
    if (sentences[i].length >= 25 && sentences[i] === sentences[i - 1]) {
      fail(`duplicated adjacent sentence in SHORTCODES.md: "${sentences[i].slice(0, 80)}"`);
    }
  }
}

/* ============================================================
   8. Report
   ============================================================ */

const liveCount = liveSpec.length;
const plannedCount = [...specShortcodes.values()].filter((s) => s.status === "PLANNED").length;

console.log(
  `  spec   ${specShortcodes.size} shortcodes (${liveCount} LIVE, ${plannedCount} PLANNED), ` +
    `${specClosedSets.length} closed sets`
);
console.log(`  build  ${registered.size} shortcodes registered, ${CHILD_PAIRS.length} child pairs`);
for (const note of notes) console.log(`  pending  ${note}`);

if (failures.length) {
  console.error(`\nCONTRACT FAILED, ${failures.length} mismatch(es):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `\nCONTRACT MATCHED. ${liveCount} LIVE shortcodes agree with the build on ` +
    `arguments, required flags, pairing, parentage and closed sets.`
);
