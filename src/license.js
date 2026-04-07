/**
 * Guesty MCP Server — License Key System (v2)
 * 
 * 3-Layer Monetization Model (Danny-approved 2026-04-06):
 * - Layer 1: MCP Server = operations/data tool (FREE, lead gen)
 * - Layer 2: Guesty Copilot = SaaS platform (PAID)
 * - Layer 3: DLJ Managed AI = premium service (our real IP)
 * 
 * FREE tier: Read-only operations data — reservations, listings, calendar,
 *   financials, tasks, guest lookup, pricing, occupancy, channels, photos.
 * PRO+ tier: Guest communication — messaging, review responses, webhook
 *   creation, reservation writes, listing updates.
 * 
 * Reads GUESTY_MCP_LICENSE_KEY from env.
 * No key or invalid key = free tier (operations data only).
 */

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

// PRO+ gated tools: guest communication, writes, and real-time events
// send_guest_message, respond_to_review, create_webhook, delete_webhook,
// create_reservation, update_reservation, create_reservation_note,
// update_pricing, update_calendar, update_listing, update_photos,
// update_listing_pricing, create_expense, create_task,
// get_conversations (contains message content)

// Simple key-to-tier mapping
// Production: Stripe webhook or DB lookup
// For now: keys prefixed gmcp_pro_*, gmcp_biz_*, gmcp_ent_*
function resolveTier(licenseKey) {
  if (!licenseKey) return "free";
  const key = licenseKey.trim();
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
  if (tier !== "free") return true;
  return FREE_TOOLS.includes(toolName);
}

function getTierInfo() {
  const tier = getTier();
  const totalTools = 38;
  return {
    tier,
    hasKey: !!process.env.GUESTY_MCP_LICENSE_KEY,
    freeToolCount: FREE_TOOLS.length,
    gatedToolCount: totalTools - FREE_TOOLS.length,
    unlocked: tier !== "free",
  };
}

function gatedHandler(toolName, handler) {
  return async (params) => {
    if (!isToolAllowed(toolName)) {
      const msg = "This tool (" + toolName + ") requires a Pro or higher license. " +
                  "Free tier includes " + FREE_TOOLS.length + " operations and data tools. " +
                  "Guest messaging, review responses, and write operations require Pro+. " +
                  "Upgrade at https://guestycopilot.com/pricing -- " +
                  "Set GUESTY_MCP_LICENSE_KEY env var to unlock all 38 tools.";
      return {
        content: [{ type: "text", text: msg }],
        isError: true,
      };
    }
    return handler(params);
  };
}

export { getTier, isToolAllowed, getTierInfo, gatedHandler, FREE_TOOLS };
