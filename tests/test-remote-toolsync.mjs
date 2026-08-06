#!/usr/bin/env node
/**
 * test-remote-toolsync.mjs
 *
 * WHY THIS TEST EXISTS (measured 2026-08-06, not hypothetical):
 *
 * src/http-server.js is the file Vercel serves at https://guesty-mcp-server.vercel.app/mcp,
 * which is the `remotes` entry published on the MCP registry for io.github.DLJRealty/guesty.
 * Its tool list was HAND-TYPED. Against the 43 real registrations it had drifted to an
 * overlap of TWELVE. Thirty-one advertised names did not exist in the product, and
 * thirty-one real tools were not advertised at all -- including get_calendar and
 * get_calendar_blocks, the two tools the 0.9.6 release was cut to fix.
 *
 * THE COUNT WAS KEPT IN SYNC AND THE CONTENTS WERE NOT. Both lists totalled 43, so every
 * count-based check anyone ever ran on this file passed. A count is not a set.
 *
 * The remote could not report the drift either: before 0.9.7, tools/call never validated
 * the requested name, so ZZ_NO_SUCH_TOOL returned BYTE-IDENTICAL output to get_listing.
 * The 31 phantom names were indistinguishable from real ones by probing.
 *
 * WHY THE LIST IS STILL STATIC. Deriving it at runtime would mean importing src/server.js,
 * which calls initDB() and connects a StdioServerTransport at module load -- reproducing
 * the Vercel 500 that commit 4ee479a fixed. So the list stays data and THIS TEST IS THE
 * ACTUAL FIX.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const require = createRequire(import.meta.url);
const PKG = require(join(ROOT, "package.json"));

let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL: " + msg); };
const ok = (msg) => console.log("ok   " + msg);

// ---------------------------------------------------------------------------
// 1. Derive the REAL tool set by parsing the registration sites as TEXT.
//    Text, not import: importing server.js has module-load side effects.
// ---------------------------------------------------------------------------
const SOURCES = ["src/server.js", "src/iot-tools.js", "src/enterprise-tools.js"];
const REG = /(?:server|s|mcp)\.tool\(\s*\n?\s*["']([a-z0-9_]+)["']/g;

const real = [];
for (const f of SOURCES) {
  const text = readFileSync(join(ROOT, f), "utf8");
  for (const m of text.matchAll(REG)) real.push(m[1]);
}
const realSet = new Set(real);

// --- POSITIVE CONTROL on the extractor itself -------------------------------
// A zero is only evidence if this same code can produce a nonzero. An extractor
// whose regex silently stops matching would report an EMPTY real set, and an
// empty set would make the comparison below fail LOUDLY rather than silently --
// but only if we also prove the extractor is capable of finding anything at all.
if (real.length === 0) fail("EXTRACTOR PRODUCED ZERO REGISTRATIONS -- the regex, not the product, is what changed");
else ok(`extractor found ${real.length} registrations across ${SOURCES.length} files`);
if (real.length !== realSet.size) fail(`duplicate registration names: ${real.length} raw vs ${realSet.size} unique`);
for (const must of ["get_calendar", "get_calendar_blocks", "get_reservations"]) {
  if (!realSet.has(must)) fail(`sanity: ${must} is a known real registration and the extractor missed it`);
}
if (realSet.has("list_reservations")) {
  fail("sanity: list_reservations is a PHANTOM name and the extractor claims it is real");
}

// ---------------------------------------------------------------------------
// 2. Read the ADVERTISED set from the real runtime object, not from source text.
//    VERCEL=1 must be set BEFORE the import or app.listen() binds a port here.
// ---------------------------------------------------------------------------
process.env.VERCEL = "1";
const { TOOLS, SERVER_INFO } = await import("../src/http-server.js");
const advertised = new Set(TOOLS);

// ---------------------------------------------------------------------------
// 3. The comparator must be able to FAIL. Exercise it on a deliberate mutation
//    before trusting its verdict on the real data.
// ---------------------------------------------------------------------------
const diff = (a, b) => [...a].filter(x => !b.has(x)).sort();
{
  const mutated = new Set(advertised);
  mutated.delete([...advertised][0]);
  mutated.add("__CONTROL_TOOL_THAT_MUST_NOT_EXIST__");
  const extra = diff(mutated, realSet);
  const missing = diff(realSet, mutated);
  if (!extra.includes("__CONTROL_TOOL_THAT_MUST_NOT_EXIST__") || missing.length === 0) {
    fail("CONTROL DID NOT FAIL -- the comparator cannot detect divergence, so its PASS below is uninterpretable");
  } else {
    ok("control: comparator detects an injected divergence in both directions");
  }
}

// ---------------------------------------------------------------------------
// 4. The actual assertions.
// ---------------------------------------------------------------------------
const phantom = diff(advertised, realSet);   // advertised but not registered
const unadvertised = diff(realSet, advertised); // registered but not advertised

if (phantom.length) {
  fail(`${phantom.length} PHANTOM tool(s) advertised by the remote endpoint but not registered anywhere:\n       ${phantom.join(", ")}`);
} else ok("no phantom tools: every advertised name is a real registration");

if (unadvertised.length) {
  fail(`${unadvertised.length} real tool(s) NOT advertised by the remote endpoint:\n       ${unadvertised.join(", ")}`);
} else ok("no unadvertised tools: every real registration is advertised");

// A count is not a set -- but a wrong count is still a defect, and this is the
// check that used to pass while the contents were 31 names wrong.
if (advertised.size !== realSet.size) {
  fail(`count mismatch: advertised ${advertised.size} vs real ${realSet.size}`);
} else ok(`counts agree at ${realSet.size}`);

// The version the remote reports on `initialize`. It sat at the literal "0.8.2"
// through four releases and was served to every client that called initialize.
if (SERVER_INFO.version !== PKG.version) {
  fail(`SERVER_INFO.version "${SERVER_INFO.version}" != package.json "${PKG.version}"`);
} else ok(`initialize reports version ${SERVER_INFO.version}, matching package.json`);

// The human-readable description carries its own hardcoded tool count. Same
// failure shape as TOOLS: a number typed by hand next to a list that moves.
//
// 2026-08-06 (CTO): THIS ASSERTION DID EXACTLY WHAT ITS AUTHOR BUILT IT TO DO.
// I reworded the description from "43 production tools" to "43 registered
// tools", and instead of silently passing on a pattern that no longer matched,
// it failed with "this assertion has gone blind". A check that detects its own
// blindness is worth more than a check that is merely correct. Do not weaken it.
//
// The wording changed because "production tools" was an availability claim: 43
// are REGISTERED, but 19 sit behind tiers nobody can buy. So the description now
// carries BOTH ledgers, and this assertion now checks BOTH -- the registered
// figure against the live registration census, and the free figure against
// license.js's GUESTY_FREE_TOOL_COUNT rather than against a number typed here.
const m = /(\d+)\s+registered tools/.exec(SERVER_INFO.description || "");
if (!m) fail("SERVER_INFO.description no longer states a registered-tool count -- this assertion has gone blind, fix or delete it");
else if (Number(m[1]) !== realSet.size) fail(`description says "${m[1]} registered tools", real count is ${realSet.size}`);
else ok(`description registered-tool count ${m[1]} matches`);

const { GUESTY_FREE_TOOL_COUNT, FREE_TOOLS } = await import("../src/license.js");
const mf = /(\d+)\s+free read-only Guesty tools/.exec(SERVER_INFO.description || "");
if (!mf) fail("SERVER_INFO.description no longer states a free-tool count -- this assertion has gone blind, fix or delete it");
else if (Number(mf[1]) !== GUESTY_FREE_TOOL_COUNT) fail(`description says "${mf[1]} free read-only Guesty tools", GUESTY_FREE_TOOL_COUNT is ${GUESTY_FREE_TOOL_COUNT}`);
else ok(`description free-tool count ${mf[1]} matches GUESTY_FREE_TOOL_COUNT`);

// The published figure must never silently become the access figure. If someone
// collapses the two ledgers back into one, this is the line that says so.
if (GUESTY_FREE_TOOL_COUNT >= FREE_TOOLS.length) {
  fail(`published free count ${GUESTY_FREE_TOOL_COUNT} is not below the gate's access count ${FREE_TOOLS.length} -- the two ledgers have been collapsed`);
} else ok(`ledgers still distinct: published ${GUESTY_FREE_TOOL_COUNT} < access ${FREE_TOOLS.length}`);

console.log(failures === 0
  ? `\nPASS remote tool sync: ${realSet.size} tools, advertised set == registered set`
  : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
