#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Guesty API Configuration
const GUESTY_CLIENT_ID = process.env.GUESTY_CLIENT_ID;
const GUESTY_CLIENT_SECRET = process.env.GUESTY_CLIENT_SECRET;
const GUESTY_API_BASE = "https://open-api.guesty.com/v1";

if (!GUESTY_CLIENT_ID || !GUESTY_CLIENT_SECRET) {
  console.error("Error: GUESTY_CLIENT_ID and GUESTY_CLIENT_SECRET environment variables are required.");
  process.exit(1);
}

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://open-api.guesty.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "open-api",
      client_id: GUESTY_CLIENT_ID,
      client_secret: GUESTY_CLIENT_SECRET,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function guestyGet(path, params = {}, retries = 2) {
  const token = await getToken();
  const url = new URL(`${GUESTY_API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (res.status === 429 && retries > 0) {
    const wait = Math.min(parseInt(res.headers.get("retry-after") || "5", 10), 30) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return guestyGet(path, params, retries - 1);
  }

  if (!res.ok) throw new Error(`Guesty API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function guestyPost(path, body, retries = 2) {
  const token = await getToken();
  const res = await fetch(`${GUESTY_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && retries > 0) {
    const wait = Math.min(parseInt(res.headers.get("retry-after") || "5", 10), 30) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return guestyPost(path, body, retries - 1);
  }

  if (!res.ok) throw new Error(`Guesty API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function guestyPut(path, body, retries = 2) {
  const token = await getToken();
  const res = await fetch(`${GUESTY_API_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429 && retries > 0) {
    const wait = Math.min(parseInt(res.headers.get("retry-after") || "5", 10), 30) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return guestyPut(path, body, retries - 1);
  }

  if (!res.ok) throw new Error(`Guesty API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Create MCP Server
const server = new McpServer({
  name: "guesty-mcp-server",
  version: "0.1.0",
});

// Tool 1: Get Reservations
server.tool(
  "get_reservations",
  "Fetch reservations from Guesty. Filter by date range, listing, status, or guest name.",
  {
    limit: z.number().optional().default(10).describe("Max results (default 10)"),
    skip: z.number().optional().default(0).describe("Offset for pagination"),
    checkInFrom: z.string().optional().describe("Check-in date from (YYYY-MM-DD)"),
    checkInTo: z.string().optional().describe("Check-in date to (YYYY-MM-DD)"),
    checkOutFrom: z.string().optional().describe("Check-out date from (YYYY-MM-DD)"),
    checkOutTo: z.string().optional().describe("Check-out date to (YYYY-MM-DD)"),
    listingId: z.string().optional().describe("Filter by listing ID"),
    status: z.string().optional().describe("Filter by status: confirmed, canceled, inquiry, etc."),
  },
  async (params) => {
    const queryParams = {
      limit: params.limit,
      skip: params.skip,
      sort: "checkIn",
      order: "desc",
    };
    if (params.checkInFrom) queryParams["checkIn[$gte]"] = params.checkInFrom;
    if (params.checkInTo) queryParams["checkIn[$lte]"] = params.checkInTo;
    if (params.checkOutFrom) queryParams["checkOut[$gte]"] = params.checkOutFrom;
    if (params.checkOutTo) queryParams["checkOut[$lte]"] = params.checkOutTo;
    if (params.listingId) queryParams.listingId = params.listingId;
    if (params.status) queryParams.status = params.status;

    const data = await guestyGet("/reservations", queryParams);

    const results = data.results || [];
    const summary = results.map((r) => ({
      id: r._id,
      guest: r.guest?.fullName || "Unknown",
      guestEmail: r.guest?.email || "",
      guestPhone: r.guest?.phone || "",
      checkIn: r.checkIn?.slice(0, 10),
      checkOut: r.checkOut?.slice(0, 10),
      nights: r.nightsCount,
      status: r.status,
      source: r.source,
      listing: r.listing?.title || "Unknown",
      listingId: r.listingId,
      totalPaid: r.money?.totalPaid,
      currency: r.money?.currency,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ total: data.count, results: summary }, null, 2) }],
    };
  }
);

// Tool 2: Get Listing
server.tool(
  "get_listing",
  "Fetch details about a specific property listing or all listings.",
  {
    listingId: z.string().optional().describe("Specific listing ID. Omit to get all listings."),
    limit: z.number().optional().default(25).describe("Max results when fetching all"),
  },
  async (params) => {
    let data;
    if (params.listingId) {
      data = await guestyGet(`/listings/${params.listingId}`);
      const l = data;
      const summary = {
        id: l._id,
        title: l.title,
        nickname: l.nickname,
        address: l.address?.full,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        maxGuests: l.accommodates,
        propertyType: l.propertyType,
        prices: l.prices,
        status: l.active ? "active" : "inactive",
      };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    } else {
      data = await guestyGet("/listings", { limit: params.limit });
      const listings = (data.results || []).map((l) => ({
        id: l._id,
        title: l.title,
        nickname: l.nickname,
        address: l.address?.full,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        maxGuests: l.accommodates,
        active: l.active,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ total: data.count, listings }, null, 2) }] };
    }
  }
);

// Tool 3: Get Conversations
server.tool(
  "get_conversations",
  "Fetch guest conversations/messages from Guesty. Get message history for a reservation or listing.",
  {
    reservationId: z.string().optional().describe("Filter by reservation ID"),
    limit: z.number().optional().default(10).describe("Max conversations to return"),
  },
  async (params) => {
    const queryParams = { limit: params.limit };
    if (params.reservationId) queryParams["filters[reservationId]"] = params.reservationId;

    const data = await guestyGet("/communication/conversations", queryParams);
    const convos = (data.results || []).map((c) => ({
      id: c._id,
      guestName: c.guest?.fullName || "Unknown",
      listing: c.listing?.title || "Unknown",
      lastMessage: c.lastMessage?.body?.slice(0, 200) || "",
      lastMessageAt: c.lastMessage?.sentAt,
      unread: c.unreadCount,
      reservationId: c.reservationId,
    }));

    return { content: [{ type: "text", text: JSON.stringify({ total: data.count, conversations: convos }, null, 2) }] };
  }
);

// Tool 4: Send Guest Message
server.tool(
  "send_guest_message",
  "Send a message to a guest in a Guesty conversation.",
  {
    conversationId: z.string().describe("The conversation ID to reply in"),
    message: z.string().describe("The message text to send to the guest"),
  },
  async (params) => {
    const data = await guestyPost(`/communication/conversations/${params.conversationId}/send-message`, {
      body: params.message,
    });
    return { content: [{ type: "text", text: `Message sent successfully. ID: ${data._id || "OK"}` }] };
  }
);

// Tool 5: Get Financials
server.tool(
  "get_financials",
  "Fetch financial data including revenue, payouts, and reservation financials.",
  {
    listingId: z.string().optional().describe("Filter by listing ID"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().default(25).describe("Max results"),
  },
  async (params) => {
    // Pull reservations with financial data, sorted by most recent
    const queryParams = {
      limit: params.limit,
      fields: "money guest checkIn checkOut listing status nightsCount",
      sort: "checkIn",
      order: "desc",
    };
    if (params.listingId) queryParams.listingId = params.listingId;
    if (params.from) queryParams["checkIn[$gte]"] = params.from;
    if (params.to) queryParams["checkIn[$lte]"] = params.to;

    const data = await guestyGet("/reservations", queryParams);
    const financials = (data.results || []).map((r) => ({
      guest: r.guest?.fullName || "Unknown",
      listing: r.listing?.title || "Unknown",
      checkIn: r.checkIn?.slice(0, 10),
      checkOut: r.checkOut?.slice(0, 10),
      status: r.status,
      totalPaid: r.money?.totalPaid,
      hostPayout: r.money?.hostPayout,
      commission: r.money?.commission,
      currency: r.money?.currency,
    }));

    const totalRevenue = financials.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
    const totalPayout = financials.reduce((sum, r) => sum + (r.hostPayout || 0), 0);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: { totalRevenue, totalPayout, reservationCount: financials.length },
          reservations: financials,
        }, null, 2),
      }],
    };
  }
);

// Tool 6: Update Pricing
server.tool(
  "update_pricing",
  "Update the base price for a listing on specific dates or the default base price.",
  {
    listingId: z.string().describe("The listing ID to update pricing for"),
    basePrice: z.number().optional().describe("New default base price per night"),
    dateFrom: z.string().optional().describe("Start date for date-specific pricing (YYYY-MM-DD)"),
    dateTo: z.string().optional().describe("End date for date-specific pricing (YYYY-MM-DD)"),
    price: z.number().optional().describe("Price per night for the date range"),
  },
  async (params) => {
    if (params.basePrice) {
      const data = await guestyPut(`/listings/${params.listingId}`, {
        prices: { basePrice: params.basePrice },
      });
      return { content: [{ type: "text", text: `Base price updated to $${params.basePrice} for listing ${params.listingId}` }] };
    }

    if (params.dateFrom && params.dateTo && params.price) {
      const data = await guestyPut(`/listings/${params.listingId}/calendar`, {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        price: params.price,
      });
      return { content: [{ type: "text", text: `Price set to $${params.price}/night from ${params.dateFrom} to ${params.dateTo}` }] };
    }

    return { content: [{ type: "text", text: "Error: Provide either basePrice or dateFrom+dateTo+price" }] };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
