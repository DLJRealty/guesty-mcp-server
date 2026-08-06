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
const PAID_TIERS_NOT_WIRED_MSG =
  "Free tier is live and fully functional — 23 read-only tools, no license " +
  "key required and nothing to configure.\n\n" +
  "Paid tiers (Pro, Business, Enterprise) are not yet available, so there is " +
  "no key to enter yet.\n\n" +
  "Availability will be announced in the release notes.";

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
];

// Enterprise tier: IoT + property aggregator tools (4 total)
// These ship in active validation per data-integrity gate; require Enterprise license.
const ENT_TOOLS = [
  "get_readiness_score",
  "get_property_health",
  "submit_checkout_photos",
  "get_maintenance_alerts",
];

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
  // 39 Guesty core tools + 1 IoT (get_readiness_score) + 3 Enterprise aggregators
  // (get_property_health, submit_checkout_photos, get_maintenance_alerts) = 43.
  // Updated 2026-04-17 for Enterprise Tier MVP merge (Owner msg 6406).
  const totalTools = 43;
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
    freeToolCount: FREE_TOOLS.length,
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
        msg = "This tool (" + toolName + ") requires a Pro or higher license. " +
              "Free tier includes " + FREE_TOOLS.length + " operations and data tools. " +
              "Guest messaging, review responses, and write operations require Pro+. " +
              "Upgrade at https://guestycopilot.com/pricing -- " +
              "Set GUESTY_MCP_LICENSE_KEY env var to unlock all 43 tools.";
      } else if (ENT_TOOLS.includes(toolName)) {
        msg = "This tool (" + toolName + ") requires an Enterprise license. " +
              "Your current tier (" + tier + ") includes the 39 base Guesty tools. " +
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
  ENT_TOOLS,
  BIZ_FEATURES,
  PAID_TIERS_LIVE,
  PAID_TIERS_NOT_WIRED_MSG,
};
