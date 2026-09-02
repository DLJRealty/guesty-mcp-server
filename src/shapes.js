/**
 * Pure response-shape mappers for tools whose Guesty payloads were measured
 * live on 2026-09-02 (issues #2 and #4). Kept side-effect-free and exported so
 * tests/test-shapes.mjs can exercise them against the recorded shapes without
 * importing server.js (which connects a transport at module load).
 */

// GET /v1/reviews returns { data: [...], limit, skip } — NOT { results, count }.
// Each row carries the review text and ratings under rawReview (channel-native
// field names). get_reviews read `data.results` and `r.rating` / `r.comment`
// since launch, so it returned `[]` for EVERY caller; issue #2's multi-unit
// hypothesis was a red herring. Measured: 100 rows on a 10-listing account, and
// a bogus listingId returns 0 rows (the filter is real and server-side).
export function extractReviewRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

export function mapReviewRow(r) {
  const raw = r.rawReview || {};
  const text = raw.public_review ?? raw.comments ?? raw.comment ?? r.comment ?? "";
  const priv = raw.private_feedback ?? "";
  return {
    id: r._id,
    listingId: r.listingId,
    reservationId: r.reservationId,
    guestId: r.guestId,
    channel: r.channelId,
    reviewerRole: raw.reviewer_role,
    rating: raw.overall_rating ?? raw.rating ?? r.rating ?? null,
    categoryRatings: raw.category_ratings ?? null,
    comment: String(text).slice(0, 300),
    privateFeedback: String(priv).slice(0, 200),
    hidden: raw.hidden ?? null,
    submittedAt: raw.submitted_at ?? null,
    date: (r.createdAt || "").slice(0, 10),
  };
}

// Guesty calendar-day `blocks` flag keys, as measured live. The four the user
// asked for in #4 are named; the rest are passed through with Guesty's key so
// nothing is hidden and nothing is guessed.
export const BLOCK_TYPE_LEGEND = {
  m: "manual block",
  o: "owner block",
  b: "booking",
  r: "reserved (held, not yet confirmed)",
  bd: "bd (Guesty flag, passed through)",
  sr: "sr (Guesty flag, passed through)",
  abl: "abl (Guesty flag, passed through)",
  a: "a (Guesty flag, passed through)",
  bw: "bw (Guesty flag, passed through)",
  pt: "pt (Guesty flag, passed through)",
  an: "an (Guesty flag, passed through)",
};

export function mapBlockedDay(d) {
  const flags = d.blocks && typeof d.blocks === "object" ? d.blocks : {};
  const blockTypes = Object.keys(flags).filter((k) => flags[k] === true);
  const refs = Array.isArray(d.blockRefs) ? d.blockRefs.map((b) => ({
    type: b.type,
    startDate: (b.startDate || "").slice(0, 10),
    endDate: (b.endDate || "").slice(0, 10),
    reservationId: b.reservationId ?? null,
    confirmationCode: b.reservation?.confirmationCode ?? null,
    source: b.reservation?.source ?? null,
    note: b.note ?? b.reason ?? null,
  })) : [];
  return {
    date: d.date,
    status: d.status,
    blockTypes,
    blockReason: blockTypes.length
      ? blockTypes.map((k) => BLOCK_TYPE_LEGEND[k] || k).join(", ")
      : (d.blockReason || d.note || "unknown"),
    reservationId: d.reservationId ?? null,
    blockRefs: refs,
  };
}
