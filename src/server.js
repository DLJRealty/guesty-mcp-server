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

// ============ V2 TOOLS ============

// Tool 7: Create Reservation (Direct Booking)
server.tool(
  "create_reservation",
  "Create a new reservation/booking in Guesty. Use for direct bookings from your website.",
  {
    listingId: z.string().describe("The listing ID to book"),
    checkIn: z.string().describe("Check-in date (YYYY-MM-DD)"),
    checkOut: z.string().describe("Check-out date (YYYY-MM-DD)"),
    guestName: z.string().describe("Guest full name"),
    guestEmail: z.string().optional().describe("Guest email address"),
    guestPhone: z.string().optional().describe("Guest phone number"),
    numberOfGuests: z.number().optional().default(1).describe("Number of guests"),
    source: z.string().optional().default("direct").describe("Booking source (direct, website, etc.)"),
  },
  async (params) => {
    const body = {
      listingId: params.listingId,
      checkInDateLocalized: params.checkIn,
      checkOutDateLocalized: params.checkOut,
      status: "confirmed",
      guest: {
        fullName: params.guestName,
        email: params.guestEmail,
        phone: params.guestPhone,
      },
      guestsCount: params.numberOfGuests,
      source: params.source,
    };

    const data = await guestyPost("/reservations", body);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          reservationId: data._id,
          confirmationCode: data.confirmationCode,
          guest: params.guestName,
          listing: params.listingId,
          dates: `${params.checkIn} → ${params.checkOut}`,
        }, null, 2),
      }],
    };
  }
);

// Tool 8: Get Reviews
server.tool(
  "get_reviews",
  "Fetch guest reviews for your properties from all channels.",
  {
    listingId: z.string().optional().describe("Filter by listing ID"),
    limit: z.number().optional().default(10).describe("Max results"),
  },
  async (params) => {
    const queryParams = { limit: params.limit };
    if (params.listingId) queryParams.listingId = params.listingId;

    const data = await guestyGet("/reviews", queryParams);
    const reviews = (data.results || []).map((r) => ({
      id: r._id,
      listing: r.listing?.title || "Unknown",
      guestName: r.guest?.fullName || "Unknown",
      rating: r.rating,
      comment: r.comment?.slice(0, 300),
      response: r.response?.slice(0, 200),
      channel: r.source,
      date: r.createdAt?.slice(0, 10),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ total: data.count, reviews }, null, 2) }],
    };
  }
);

// Tool 9: Get Calendar
server.tool(
  "get_calendar",
  "Fetch calendar availability and pricing for a listing over a date range.",
  {
    listingId: z.string().describe("The listing ID"),
    from: z.string().describe("Start date (YYYY-MM-DD)"),
    to: z.string().describe("End date (YYYY-MM-DD)"),
  },
  async (params) => {
    const data = await guestyGet(`/listings/${params.listingId}/calendar`, {
      from: params.from,
      to: params.to,
    });

    const days = (data.days || data || []).map ? (data.days || []).map((d) => ({
      date: d.date,
      available: d.status === "available",
      price: d.price,
      minNights: d.minNights,
      blockReason: d.blockReason,
    })) : [];

    return {
      content: [{ type: "text", text: JSON.stringify({ listing: params.listingId, days }, null, 2) }],
    };
  }
);

// Tool 10: Update Calendar
server.tool(
  "update_calendar",
  "Block or unblock dates, set minimum nights, or update availability for a listing.",
  {
    listingId: z.string().describe("The listing ID"),
    dateFrom: z.string().describe("Start date (YYYY-MM-DD)"),
    dateTo: z.string().describe("End date (YYYY-MM-DD)"),
    status: z.string().optional().describe("Set to 'available' or 'unavailable'"),
    minNights: z.number().optional().describe("Minimum night stay"),
    blockReason: z.string().optional().describe("Reason for blocking: owner, maintenance, other"),
  },
  async (params) => {
    const body = {};
    if (params.status) body.status = params.status;
    if (params.minNights) body.minNights = params.minNights;
    if (params.blockReason) body.note = params.blockReason;

    const data = await guestyPut(`/listings/${params.listingId}/calendar`, {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      ...body,
    });

    return {
      content: [{ type: "text", text: `Calendar updated for ${params.listingId}: ${params.dateFrom} to ${params.dateTo}` }],
    };
  }
);

// Tool 11: Respond to Review
server.tool(
  "respond_to_review",
  "Post a response to a guest review.",
  {
    reviewId: z.string().describe("The review ID to respond to"),
    response: z.string().describe("Your response text"),
  },
  async (params) => {
    const data = await guestyPut(`/reviews/${params.reviewId}`, {
      response: params.response,
    });
    return { content: [{ type: "text", text: `Review response posted successfully for review ${params.reviewId}` }] };
  }
);

// Tool 12: Get Owner Statements
server.tool(
  "get_owner_statements",
  "Fetch owner revenue statements/reports for properties.",
  {
    listingId: z.string().optional().describe("Filter by listing ID"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().default(10).describe("Max results"),
  },
  async (params) => {
    const queryParams = { limit: params.limit };
    if (params.listingId) queryParams.listingId = params.listingId;
    if (params.from) queryParams["from"] = params.from;
    if (params.to) queryParams["to"] = params.to;

    const data = await guestyGet("/owner-statements", queryParams);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// Tool 13: Get Expenses
server.tool(
  "get_expenses",
  "Fetch operational expenses tracked in Guesty.",
  {
    listingId: z.string().optional().describe("Filter by listing ID"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().default(25).describe("Max results"),
  },
  async (params) => {
    const queryParams = { limit: params.limit };
    if (params.listingId) queryParams.listingId = params.listingId;
    if (params.from) queryParams["from"] = params.from;
    if (params.to) queryParams["to"] = params.to;

    const data = await guestyGet("/expenses", queryParams);
    const expenses = (data.results || []).map((e) => ({
      id: e._id,
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      listing: e.listing?.title || "Unknown",
      date: e.date?.slice(0, 10),
      vendor: e.vendor,
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ total: data.count, expenses }, null, 2),
      }],
    };
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
