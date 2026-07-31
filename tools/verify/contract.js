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
 * prose, and `related` described a cluster taxonomy that does not exist.
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
import { readFileSync } from "node:fs";

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

const { PANE_SURFACES, TABLE_KINDS, CALLOUT_LABELS, CHILD_PAIRS, default: configure } =
  await import(CONFIG_PATH.href);

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
  "callout.label": () => [...CALLOUT_LABELS.keys()]
};

const defaultFor = (shortcode, argument) =>
  specClosedSets.find((s) => s.shortcode === shortcode && s.argument === argument)?.default ??
  null;
const valuesFor = (shortcode, argument) =>
  specClosedSets.find((s) => s.shortcode === shortcode && s.argument === argument)?.values ?? null;

/* A value the implementation will accept, so a probe fails for the reason
   being probed and not because a closed set rejected a dummy string. */
function probeValue(shortcode, argument) {
  const values = valuesFor(shortcode, argument);
  if (values && values.length) return defaultFor(shortcode, argument) ?? values[0];
  return "probe";
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
