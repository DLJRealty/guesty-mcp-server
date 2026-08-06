/**
 * Guesty MCP Server — License Key System (v2)
 *
 * PAID_TIERS_LIVE=false. Paid-tier prefix keys
 *   (gmcp_pro_*, gmcp_biz_*, gmcp_ent_*, test_pro/biz/ent) are recognized
 *   but tool access is REFUSED with PAID_TIERS_NOT_WIRED_MSG (defined below —
 *   do not restate its text here, or this comment goes stale the moment the
 *   copy changes). Free tier (23 read-only tools) is fully functional and
 *   unchanged. Closes the prefix-match self-mint exploit window for
 *   pre-launch OSS readers.
 *
 * 3-Layer Monetization Model (Danny-approved 2026-04-06):
 * - Layer 1: MCP Server = operations/data tool (FREE, lead gen)
 * - Layer 2: Guesty Copilot = SaaS platform (PAID — not yet available)
 * - Layer 3: DLJ Managed AI = premium service (our real IP)
 *
 * FREE tier: Read-only operations data — reservations, listings, calendar,
 *   financials, tasks, guest lookup, pricing, occupancy, channels, photos.
 * PRO+ tier (not yet available): Guest communication — messaging, review
 *   responses, webhook creation, reservation writes, listing updates.
 *
 * Reads GUESTY_MCP_LICENSE_KEY from env.
 * No key or invalid key = free tier (operations data only).
 * Paid-prefix key with PAID_TIERS_LIVE=false = free tools + refusal message
 *   on any paid-tier tool call.
 */

// Paid-tier kill-switch.
// Flip to true ONLY when the payment webhook + signed-key validation ship.
// While false: paid-prefix keys are accepted as "paid_not_yet_wired" tier,
// which has the same tool access as free + emits a refusal message on any
// paid-tier tool call. Prevents prefix-match self-mint exploit.
const PAID_TIERS_LIVE = false;

// NOTE: PAID_TIERS_NOT_WIRED_MSG is declared BELOW FREE_TOOLS, not here.
// It quotes the free-tool count, and that count is now DERIVED from
// FREE_TOOLS.length rather than typed. `const` is not hoisted for use, so
// building the string above the array would throw a TDZ ReferenceError at
// module load. The ordering is load-bearing — data first, then the copy
// derived from it. Do not move the message back above the array.

// Free tier: read-only operations and data tools
const FREE_TOOLS = [
  // Reservations (read-only)
  "get_reservations",
  "search_reservations",
  "get_reservation_financials",
  // Listings (read-only)
  "get_listing",
  "get_listing_occupancy",
  "get_listing_pricing",
  "get_photos",
  // Guests (read-only)
  "get_guests",
  "get_guest_by_id",
  // Calendar (read-only)
  "get_calendar",
  "get_calendar_blocks",
  // Financials (read-only)
  "get_financials",
  "get_owner_statements",
  "get_expenses",
  "get_revenue_summary",
  // Operations (read-only)
  "get_tasks",
  "get_channels",
  "get_automation_rules",
  "get_custom_fields",
  "get_account_info",
  "get_supported_languages",
  // Reviews (read-only)
  "get_reviews",
  // Webhooks (read-only)
  "get_webhooks",
  // Server-local (read-only, makes no Guesty API call).
  //
  // ADDED 2026-08-06 (CTO), and this is a CORRECTION OF THE LEDGER, NOT A GRANT
  // OF NEW ACCESS. get_license_info was registered in server.js with a PLAIN
  // handler instead of gatedHandler, so isToolAllowed() was never consulted for
  // it and every caller on earth could already call it. The effective free
  // surface was 24; this list said 23; and 23 is the number we printed in the
  // README, package.json, server.json, the website and the runtime refusal
  // string. THE CODE WAS NOT OVER-RESTRICTING — OUR PUBLISHED NUMBER WAS
  // UNDER-COUNTING WHAT WE ALREADY SHIP. Adding it here changes NO user's
  // access (it stays callable for free, paid_not_yet_wired and every paid
  // tier); it makes the gate's model of the surface match the surface, so
  // every derived count self-corrects instead of being hand-patched.
  "get_license_info",
];

// TOOLS THAT ARE FREE BUT ARE NOT GUESTY CAPABILITY.
//
// 2026-08-06 (CTO). THE GATE LEDGER AND THE CUSTOMER-FACING CLAIM ARE TWO
// DIFFERENT NUMBERS AND THEY MUST NOT BE COLLAPSED INTO ONE.
//
// FREE_TOOLS answers "what will isToolAllowed() permit at the free tier" — that
// is 24, and every ACCESS decision must use it.
//
// A customer asking "how many tools do I get" is asking what this server can do
// WITH THEIR GUESTY ACCOUNT. get_license_info makes no Guesty API call; it
// reports our own licensing state back to the caller. Counting it in a
// published figure would inflate the capability claim by one, using a tool that
// does nothing for the customer's properties — the exact species of claim we
// spent 2026-08-06 stripping out of the website and the registry. WE DO NOT GET
// TO CORRECT AN HONESTY DEFECT BY COMMITTING A SMALLER ONE IN THE OPPOSITE
// DIRECTION.
//
// So: GUESTY_FREE_TOOL_COUNT (23) is the PUBLISHED capability figure;
// FREE_TOOLS.length (24) is the ACCESS figure. BOTH ARE DERIVED, NEITHER IS
// TYPED. Adding a Guesty tool to FREE_TOOLS moves both. Adding another local
// meta-tool moves only the access figure — which is the correct behaviour, and
// is precisely what went wrong when get_license_info was added outside the gate.
const LOCAL_TOOLS = ["get_license_info"];
const GUESTY_FREE_TOOL_COUNT = FREE_TOOLS.filter(
  (t) => !LOCAL_TOOLS.includes(t)
).length;

// Verbatim refusal message — matches HN launch body and README callout.
// Keep wording stable; HN/Marketing reference this exact string.
//
// REWRITTEN 2026-08-06 (v0.9.8), CEO-approved verbatim. THE DEFECT IN THE OLD
// TEXT WAS NOT THAT IT WAS WRONG WHEN WRITTEN — IT WAS THAT IT CARRIED DATED
// PROMISES ("v0.9.2", "v1.0 next week", "Stripe-backed") THAT DECAYED INTO A
// LIE WHILE SITTING PERFECTLY STILL. Written 2026-05-21; by 2026-08-06 the
// package was at 0.9.7 and "next week" was ~11 weeks stale, in front of
// customers. This replacement names NO version, NO date, NO payment vendor
// and NO key format, so it cannot go stale on its own. If you edit it, keep
// that property — the shelf life of the copy is the feature, not the wording.
//
// 2026-08-06 (CTO): the tool count is now INTERPOLATED FROM FREE_TOOLS.length
// rather than typed as "23". A hand-typed count is a promise to update it by
// hand forever, and this one had already gone wrong — same defect class as the
// serverInfo.version literal that sat frozen at 0.9.1 for eight releases.
const PAID_TIERS_NOT_WIRED_MSG =
  "Free tier is live and fully functional — " + GUESTY_FREE_TOOL_COUNT +
  " read-only tools, no license " +
  "key required and nothing to configure.\n\n" +
  "Paid tiers (Pro, Business, Enterprise) are not yet available, so there is " +
  "no key to enter yet.\n\n" +
  "Availability will be announced in the release notes.";

// Enterprise tier: IoT + property aggregator tools (4 total)
// These ship in active validation per data-integrity gate; require Enterprise license.
const ENT_TOOLS = [
  "get_readiness_score",
  "get_property_health",
  "submit_checkout_photos",
  "get_maintenance_alerts",
];

// Total registered tool surface: 38 Guesty API tools + get_license_info (local,
// makes no API call) + 1 IoT (get_readiness_score) + 3 Enterprise aggregators
// (get_property_health, submit_checkout_photos, get_maintenance_alerts) = 43.
// Established 2026-04-17 for the Enterprise Tier MVP merge (Owner msg 6406) and
// RE-DERIVED BY EXERCISE 2026-08-06: 15 gatedHandler + 24 plain + 4 enterprise
// registrations = 43, matching the length of a live tools/list response.
// Hoisted to module scope 2026-08-06 — it was a local inside getTierInfo() while
// gatedHandler carried its own hand-typed "43" in a customer-facing string. Two
// copies of one constant is how they drift.
const TOTAL_TOOLS = 43;

// Business tier: operational/SLA features the binary advertises (consumed by getTierInfo).
// No per-call tool gating — Business unlocks the same 39 base tools as Pro plus the
// multi-account license terms and priority support promised by guestycopilot.com pricing.
const BIZ_FEATURES = {
  multiAccountLicense: true,
  prioritySupport: true,
};

// PRO+ gated tools: guest communication, writes, and real-time events
// send_guest_message, respond_to_review, create_webhook, delete_webhook,
// create_reservation, update_reservation, create_reservation_note,
// update_pricing, update_calendar, update_listing, update_photos,
// update_listing_pricing, create_expense, create_task,
// get_conversations (contains message content)

// Simple key-to-tier mapping
// v0.9.2: when PAID_TIERS_LIVE=false, any paid-prefix key resolves to
//   "paid_not_yet_wired" — free tool access + refusal on paid tool calls.
// Planned: payment webhook + signed-key DB lookup replaces prefix match.
function resolveTier(licenseKey) {
  if (!licenseKey) return "free";
  const key = licenseKey.trim();
  const isPaidPrefix =
    key.startsWith("gmcp_ent_") ||
    key.startsWith("gmcp_biz_") ||
    key.startsWith("gmcp_pro_") ||
    key === "test_pro" ||
    key === "test_biz" ||
    key === "test_ent";
  // v0.9.2 kill-switch: paid keys recognized but refused.
  if (isPaidPrefix && !PAID_TIERS_LIVE) return "paid_not_yet_wired";
  if (key.startsWith("gmcp_ent_")) return "enterprise";
  if (key.startsWith("gmcp_biz_")) return "business";
  if (key.startsWith("gmcp_pro_")) return "pro";
  if (key === "test_pro") return "pro";
  if (key === "test_biz") return "business";
  if (key === "test_ent") return "enterprise";
  return "free";
}

function getTier() {
  return resolveTier(process.env.GUESTY_MCP_LICENSE_KEY);
}

function isToolAllowed(toolName) {
  const tier = getTier();
  // v0.9.2: "paid_not_yet_wired" has same tool surface as free.
  if (tier === "free" || tier === "paid_not_yet_wired") {
    return FREE_TOOLS.includes(toolName);
  }
  // Enterprise-tier tools require enterprise license
  if (ENT_TOOLS.includes(toolName)) {
    return tier === "enterprise";
  }
  // All other paid tools (Pro+) allowed for pro / business / enterprise
  return true;
}

function getTierInfo() {
  const tier = getTier();
  const totalTools = TOTAL_TOOLS;  // see the module-scope declaration for the breakdown
  const entToolCount = ENT_TOOLS.length;
  const baseToolCount = totalTools - entToolCount;  // 39
  // v0.9.2: paid_not_yet_wired gets same accessible surface as free.
  const accessibleCount =
    tier === "free" || tier === "paid_not_yet_wired" ? FREE_TOOLS.length :
    tier === "enterprise" ? totalTools :
    baseToolCount;  // pro / business
  return {
    tier,
    hasKey: !!process.env.GUESTY_MCP_LICENSE_KEY,
    // 2026-08-06 (CTO): freeToolCount is the PUBLISHED capability figure (23) —
    // what this server can do WITH THE CUSTOMER'S GUESTY ACCOUNT. It excludes
    // get_license_info, which makes no Guesty API call and reports our own
    // licensing state back to the caller. accessibleToolCount stays the GATE
    // figure (24 at free) — what isToolAllowed() will actually permit.
    // The two reconcile visibly: freeToolCount + localToolCount === 24.
    // Do not collapse these into one number; that collapse is exactly how the
    // off-ledger 24th tool made every published count wrong by one.
    freeToolCount: GUESTY_FREE_TOOL_COUNT,
    localToolCount: LOCAL_TOOLS.length,
    baseToolCount,
    entToolCount,
    accessibleToolCount: accessibleCount,
    gatedToolCount: totalTools - accessibleCount,
    unlocked: tier !== "free" && tier !== "paid_not_yet_wired",
    paidTiersLive: PAID_TIERS_LIVE,
    paidKeyDetected: tier === "paid_not_yet_wired",
    bizFeatures: tier === "business" || tier === "enterprise" ? BIZ_FEATURES : null,
  };
}

function gatedHandler(toolName, handler) {
  return async (params) => {
    if (!isToolAllowed(toolName)) {
      const tier = getTier();
      let msg;
      // v0.9.2: paid-key supplied but tiers not wired yet — refusal-with-context.
      if (tier === "paid_not_yet_wired") {
        msg = PAID_TIERS_NOT_WIRED_MSG;
      } else if (tier === "free") {
        // 2026-08-06 (CTO): THE OLD TEXT ENDED "Set GUESTY_MCP_LICENSE_KEY env
        // var to unlock all 43 tools." THAT INSTRUCTION CANNOT SUCCEED WHILE
        // PAID_TIERS_LIVE IS false. Any key with a paid prefix resolves to
        // "paid_not_yet_wired" in resolveTier() BEFORE the pro/business/
        // enterprise branches are reached, so the user who follows the
        // instruction lands on the not-wired refusal instead of the tools.
        // We told every free caller to go do a thing we had already made
        // impossible.
        //
        // THIS IS THE SIBLING #372 MISSED. That ticket fixed exactly this
        // defect in the ENTERPRISE branch of THIS function, ten lines below,
        // and shipped without sweeping the other arms of its own if/else.
        // Worse, the branch it fixed is UNREACHABLE today (tier can only be
        // "free" or "paid_not_yet_wired" while the kill-switch is off), while
        // the branch it skipped is the ONLY one a real customer can reach.
        // The fix landed on the dead arm and the live arm kept lying.
        //
        // The upgrade line is now CONDITIONAL ON THE SWITCH, not on copy
        // discipline, so it cannot go stale in either direction: when paid
        // tiers actually ship, flipping PAID_TIERS_LIVE turns the instruction
        // back on by itself.
        msg = "This tool (" + toolName + ") requires a Pro or higher license. " +
              "Free tier includes " + GUESTY_FREE_TOOL_COUNT + " operations and data tools. " +
              "Guest messaging, review responses, and write operations require Pro+. " +
              (PAID_TIERS_LIVE
                ? "Set GUESTY_MCP_LICENSE_KEY env var to unlock all " + TOTAL_TOOLS + " tools. " +
                  "Upgrade at https://guestycopilot.com/pricing"
                : "Paid tiers are not yet available, so there is no key to enter yet. " +
                  "Availability will be announced in the release notes.");
      } else if (ENT_TOOLS.includes(toolName)) {
        // 2026-08-06 (CTO): was hand-typed "the 39 base Guesty tools" — wrong
        // twice over. 39 is the BASE ACCESS count (43 registered − 4 Enterprise),
        // and it includes get_license_info, which is not a Guesty tool at all.
        // Same off-by-one, same cause, as the 23-vs-24 free-tier defect: one
        // number was doing the work of two different ledgers. Now derived, and
        // the Guesty figure excludes the local tool.
        msg = "This tool (" + toolName + ") requires an Enterprise license. " +
              "Your current tier (" + tier + ") includes " +
              (TOTAL_TOOLS - ENT_TOOLS.length - LOCAL_TOOLS.length) +
              " Guesty tools. " +
              "Enterprise adds IoT readiness, property health, checkout photo intake, " +
              "and maintenance alerts (4 additional tools). " +
              "Talk to us at https://guestycopilot.com/pricing";
      } else {
        msg = "This tool (" + toolName + ") is not available in your current tier (" + tier + ").";
      }
      return {
        content: [{ type: "text", text: msg }],
        isError: true,
      };
    }
    return handler(params);
  };
}

export {
  getTier,
  isToolAllowed,
  getTierInfo,
  gatedHandler,
  FREE_TOOLS,
  GUESTY_FREE_TOOL_COUNT,
  LOCAL_TOOLS,
  ENT_TOOLS,
  BIZ_FEATURES,
  PAID_TIERS_LIVE,
  PAID_TIERS_NOT_WIRED_MSG,
};
