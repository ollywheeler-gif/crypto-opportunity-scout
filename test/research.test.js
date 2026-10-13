import test from "node:test";
import assert from "node:assert/strict";
import { classifyFeedEntry, extractFeedLink, extractCanonicalUrl } from "../src/research.js";

const now = Date.parse("2026-10-13T12:00:00.000Z");
const url = "https://example.org/campaign";

test("rejects feed entries with missing titles or links separately", () => {
  assert.deepEqual(classifyFeedEntry({ title: "", url, date: "2026-10-13" }, now), {
    ok: false, reason: "missingTitle"
  });
  assert.deepEqual(classifyFeedEntry({ title: "Campaign", url: "", date: "2026-10-13" }, now), {
    ok: false, reason: "missingLink"
  });
});

test("distinguishes invalid, stale and implausibly future dates", () => {
  assert.deepEqual(classifyFeedEntry({ title: "Campaign", url, date: "not a date" }, now), {
    ok: false, reason: "invalidDate"
  });
  assert.deepEqual(classifyFeedEntry({ title: "Campaign", url, date: "2026-08-01T00:00:00Z" }, now), {
    ok: false, reason: "staleDate"
  });
  assert.deepEqual(classifyFeedEntry({ title: "Campaign", url, date: "2026-10-15T12:00:00Z" }, now), {
    ok: false, reason: "futureDate"
  });
});

test("accepts a current entry and returns its parsed publication time", () => {
  const publishedMs = Date.parse("2026-10-12T12:00:00Z");
  assert.deepEqual(
    classifyFeedEntry({ title: "Official reward campaign", url, date: "2026-10-12T12:00:00Z" }, now),
    { ok: true, publishedMs }
  );
});

test("allows a configurable freshness window without changing defaults", () => {
  assert.equal(
    classifyFeedEntry({ title: "Campaign", url, date: "2026-09-01T00:00:00Z" }, now, 60).ok,
    true
  );
});

test("extracts Atom alternate links and ignores self links", () => {
  const block = '<entry><link rel="self" href="https://example.org/feed"/><link rel="alternate" type="text/html" href="https://example.org/campaign?utm_source=feed"/></entry>';
  assert.equal(extractFeedLink(block), "https://example.org/campaign?utm_source=feed");
});

test("extracts same-site canonical URLs and removes tracking parameters", () => {
  const html = '<html><head><link rel="canonical" href="/campaign?id=7&amp;utm_source=feed"></head></html>';
  assert.equal(
    extractCanonicalUrl(html, "https://example.org/article", "example.org"),
    "https://example.org/campaign?id=7"
  );
});

test("does not trust cross-site canonical URL overrides", () => {
  const html = '<link rel="canonical" href="https://unrelated.example/clone">';
  assert.equal(
    extractCanonicalUrl(html, "https://example.org/article", "example.org"),
    "https://example.org/article"
  );
});
