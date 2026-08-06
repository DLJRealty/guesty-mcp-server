#!/usr/bin/env node
/**
 * Smoke tests for Enterprise Tier MVP aggregators (post-merge v0.8.0).
 *
 * enterprise-tools.js transitively imports server.js which validates
 * GUESTY_CLIENT_ID + GUESTY_CLIENT_SECRET at module load (throws without
 * them). ES imports hoist above any env-set statement — so we must set
 * dummy creds in the ENV before the process starts, OR use dynamic import
 * after env-set. We use dynamic import below so the test is self-contained
 * and runnable via `node tests/test-enterprise.js` without prior env setup.
 *
 * Real aggregator behavior (live Guesty + IoT DB) is integration-only and
 * not exercised here. This file only validates: exports present, free-tier
 * gate blocks with Enterprise-license message, enterprise-tier lifts gate.
 */
if (!process.env.GUESTY_CLIENT_ID) process.env.GUESTY_CLIENT_ID = "dummy-test-id";
if (!process.env.GUESTY_CLIENT_SECRET) process.env.GUESTY_CLIENT_SECRET = "dummy-test-secret";

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${msg}`);
  } else {
    failed++;
    console.log(`  \u2717 FAIL: ${msg}`);
  }
}

async function run() {
  console.log("=== Enterprise Tier MVP Smoke Tests (v0.8.0 merge) ===\n");

  // Dynamic import so env-set above takes effect before module load.
  const { __handlers } = await import('../src/enterprise-tools.js');

  // Test 1: exports exist
  console.log("1. __handlers export contract");
  assert(typeof __handlers === "object" && __handlers !== null, "__handlers is an object");
  assert(typeof __handlers.get_property_health === "function", "get_property_health is a function");
  assert(typeof __handlers.submit_checkout_photos === "function", "submit_checkout_photos is a function");
  assert(typeof __handlers.get_maintenance_alerts === "function", "get_maintenance_alerts is a function");

  // Test 2: free-tier gate on get_property_health
  console.log("\n2. Free-tier gate \u2014 get_property_health");
  delete process.env.GUESTY_MCP_LICENSE_KEY;
  const r2 = await __handlers.get_property_health({ listingId: "listing-abc" });
  assert(r2.isError === true, "free tier blocked with isError=true");
  const t2 = r2?.content?.[0]?.text || "";
  assert(t2.includes("Enterprise license"), "gate message references Enterprise license");

  // Test 3: free-tier gate on submit_checkout_photos
  console.log("\n3. Free-tier gate \u2014 submit_checkout_photos");
  const r3 = await __handlers.submit_checkout_photos({
    listingId: "listing-abc",
    reservationId: "res-123",
    photos: ["https://example.com/a.jpg"],
  });
  assert(r3.isError === true, "free tier blocked with isError=true");
  const t3 = r3?.content?.[0]?.text || "";
  assert(t3.includes("Enterprise license"), "gate message references Enterprise license");

  // Test 4: free-tier gate on get_maintenance_alerts
  console.log("\n4. Free-tier gate \u2014 get_maintenance_alerts");
  const r4 = await __handlers.get_maintenance_alerts({
    severity: "all",
    active_only: true,
  });
  assert(r4.isError === true, "free tier blocked with isError=true");
  const t4 = r4?.content?.[0]?.text || "";
  assert(t4.includes("Enterprise license"), "gate message references Enterprise license");

  // Test 5: what an Enterprise-prefix key actually does RIGHT NOW.
  //
  // THIS TEST WAS RED FROM v0.9.2 UNTIL 2026-08-06 AND IT WAS RIGHT THE WHOLE
  // TIME. It was written at v0.8.1, when a paid prefix really did lift the gate.
  // v0.9.2 then added the PAID_TIERS_LIVE kill-switch, which routes EVERY
  // paid-prefix key -- gmcp_ent_* included -- to tier "paid_not_yet_wired".
  // So the gate legitimately no longer lifts, and the old assertion legitimately
  // failed. Nobody read it, because the suite was red and a red suite is
  // indistinguishable from noise. What the red actually exposed was a real
  // customer-facing defect: iot-tools.js carried its OWN copy of the gate that
  // had never heard of the kill-switch, and told the customer to set a
  // gmcp_ent_* key -- advice that lands them right back on this same message.
  //
  // The expectation is now KEYED OFF THE SWITCH rather than pinned to either
  // behavior, so it follows automatically when paid tiers go live at v1.0
  // instead of going stale again.
  console.log("\n5. Enterprise-prefix key — behavior keyed off PAID_TIERS_LIVE");
  const { PAID_TIERS_LIVE, PAID_TIERS_NOT_WIRED_MSG } = await import('../src/license.js');
  process.env.GUESTY_MCP_LICENSE_KEY = "test_ent";
  let uncaught = false;
  let r5;
  try {
    r5 = await __handlers.get_maintenance_alerts({ severity: "all", active_only: true });
  } catch (e) {
    uncaught = true;
    r5 = { content: [{ type: "text", text: `UNCAUGHT: ${e.message}` }], isError: true };
  }
  assert(!uncaught, "aggregator did not throw uncaught");
  const t5 = r5?.content?.[0]?.text || "";
  if (PAID_TIERS_LIVE) {
    assert(!t5.includes("requires an Enterprise license"), "paid tiers live: enterprise key lifts the gate");
  } else {
    assert(t5 === PAID_TIERS_NOT_WIRED_MSG,
      "kill-switch on: enterprise key gets license.js's NOT-YET-WIRED message verbatim");
    // The specific regression this guards. A remedy the switch disables is worse
    // than no remedy: the customer follows it and arrives back here.
    assert(!/gmcp_ent_\*/.test(t5),
      "gate does not tell the customer to set a gmcp_ent_* key it will then refuse");
    assert(!t5.includes("paid_not_yet_wired"),
      "internal tier token is not leaked to the customer");
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
