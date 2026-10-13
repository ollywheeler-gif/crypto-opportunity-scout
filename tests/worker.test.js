import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { collectReport, enrichResearchItem } from "../src/research.js";

const webhookSecret = "unit-test-webhook-secret";
const settlementAddress = "0x1111111111111111111111111111111111111111";
const item = {
  title: "Example testnet announcement",
  url: "https://example.org/announcement",
  source: "example.org",
  date: "2026-10-13",
  summary: "Example item for integration tests.",
  category: "Testnet/developer update",
  relevance: 55,
  evidenceStatus: "No specific reward identified",
  assessment: "Worth a quick review",
  nextStep: "Review the official source.",
  verification: "Test fixture only."
};

class MemoryKV {
  constructor() { this.data = new Map(); }
  async get(key, type) {
    const value = this.data.get(key);
    if (value === undefined) return null;
    return type === "json" ? JSON.parse(value) : value;
  }
  async put(key, value) { this.data.set(key, String(value)); }
  async delete(key) { this.data.delete(key); }
}

async function sign(raw, timestamp) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = new Uint8Array(await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`)
  ));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

test("test checkout -> signed webhook -> protected report access", async (t) => {
  const kv = new MemoryKV();
  await kv.put("report:latest", JSON.stringify({ date: "2026-10-13", items: [item] }));
  const env = {
    SCOUT_KV: kv,
    SHIELDZ_API_KEY: "sk_test_unit_test",
    SHIELDZ_WEBHOOK_SECRET: webhookSecret,
    SCOUT_SETTLEMENT_ADDRESS: settlementAddress
  };

  const originalFetch = globalThis.fetch;
  let invoiceRequest;
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(String(input), "https://shieldz.cash/api/v1/invoices");
    invoiceRequest = JSON.parse(init.body);
    return Response.json({
      id: "inv_test_123",
      pay_url: "https://shieldz.cash/test-checkout/inv_test_123",
      amount_usd_cents: 100,
      mode: "test",
      settlement: { chain: "BASE", asset: "USDC", address: settlementAddress }
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const checkoutResponse = await worker.fetch(new Request("https://scout.example/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "daily_report", itemUrl: item.url })
  }), env, {});
  assert.equal(checkoutResponse.status, 200);
  const checkout = await checkoutResponse.json();
  assert.equal(checkout.checkout_url, "https://shieldz.cash/test-checkout/inv_test_123");
  assert.match(checkout.report_url, /^https:\/\/scout\.example\/report\?/);
  assert.equal(invoiceRequest.amount_usd_cents, 100);
  assert.equal(invoiceRequest.settlement.chain, "BASE");
  assert.equal(invoiceRequest.settlement.asset, "USDC");
  assert.equal(invoiceRequest.metadata.product, "daily_report");

  const reportUrl = new URL(checkout.report_url);
  const orderId = reportUrl.searchParams.get("order");
  const accessToken = reportUrl.searchParams.get("token");
  const event = {
    type: "invoice.paid",
    data: { invoice: {
      id: "inv_test_123",
      status: "paid",
      mode: "test",
      amount_usd_cents: 100,
      paid_after_expiry: false,
      settlement: { chain: "BASE", asset: "USDC", address: settlementAddress },
      metadata: { order_id: orderId, product: "daily_report" }
    } }
  };
  const raw = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sign(raw, timestamp);

  const badResponse = await worker.fetch(new Request("https://scout.example/webhooks/shieldz", {
    method: "POST",
    headers: { "X-Shieldz-Signature": "t=" + timestamp + ",v1=bad" },
    body: raw
  }), env, {});
  assert.equal(badResponse.status, 401);

  const beforePayment = await worker.fetch(new Request(checkout.report_url), env, {});
  assert.equal(beforePayment.status, 402);

  const webhookResponse = await worker.fetch(new Request("https://scout.example/webhooks/shieldz", {
    method: "POST",
    headers: { "X-Shieldz-Signature": signature, "X-Shieldz-Delivery": "delivery_test_1" },
    body: raw
  }), env, {});
  assert.equal(webhookResponse.status, 200);

  const reportResponse = await worker.fetch(new Request(checkout.report_url), env, {});
  assert.equal(reportResponse.status, 200);
  const html = await reportResponse.text();
  assert.match(html, /Example testnet announcement/);
  assert.equal((await kv.get(`order:${orderId}`, "json")).status, "paid");

  const deniedResponse = await worker.fetch(new Request(
    `https://scout.example/report?order=${encodeURIComponent(orderId)}&token=wrong-token`
  ), env, {});
  assert.equal(deniedResponse.status, 403);
  assert.ok(accessToken);
});


test("research enrichment extracts evidence but never marks a reward confirmed", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    '<!doctype html><html><head><title>Example Rewards Campaign</title><meta name="description" content="A campaign with rewards for eligible users"></head><body><main>Rewards campaign ends on 30 October. Eligible residents of Canada may participate. A minimum deposit of 50 USDC is required. Connect your wallet and pay network gas fees. Rewards are subject to eligibility and are not guaranteed.</main></body></html>',
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await enrichResearchItem({
    title: "Example rewards campaign",
    url: "https://example.org/campaign",
    source: "example.org",
    date: "2026-10-13",
    publishedAt: "2026-10-13T09:00:00.000Z",
    summary: "A reward campaign is available for eligible users."
  });
  assert.equal(result.reward, "Not confirmed");
  assert.match(result.evidenceStatus, /reward-related wording/);
  assert.match(result.rewardDetails, /rewards campaign/i);
  assert.match(result.taskDetails, /Connect your wallet/i);
  assert.match(result.statusEvidence, /status not established/i);
  assert.match(result.deadline, /ends on 30 October/i);
  assert.match(result.eligibility, /Eligible residents of Canada/i);
  assert.match(result.costsAndRequirements, /minimum deposit of 50 USDC/i);
  assert.ok(result.risks.some((risk) => /Fees may apply/.test(risk)));
  assert.ok(result.risks.some((risk) => /Capital or deposit required/.test(risk)));
  assert.equal(result.verificationStatus.includes("claims remain unverified"), true);
  assert.ok(result.researchCompleteness > 0 && result.researchCompleteness <= 100);
});

test("research enrichment fails safely when source page cannot be fetched", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await enrichResearchItem({
    title: "Possible airdrop rewards",
    url: "https://example.org/rewards",
    source: "example.org",
    date: "2026-10-13",
    publishedAt: "2026-10-13T09:00:00.000Z",
    summary: "A possible airdrop rewards campaign."
  });
  assert.equal(result.pageCheckedAt, null);
  assert.match(result.verificationStatus, /could not be checked automatically/);
  assert.equal(result.reward, "Not confirmed");
  assert.ok(result.risks.some((risk) => /could not be fetched automatically/.test(risk)));
});


test("daily collector deduplicates leads and reports transparent quality metrics", async (t) => {
  const originalFetch = globalThis.fetch;
  const now = new Date().toUTCString();
  const feed = '<rss><channel><item><title>Example rewards campaign</title><link>https://example.org/campaign</link><pubDate>' + now + '</pubDate><description>Register for the reward campaign and complete tasks; eligibility and deadline details apply.</description></item></channel></rss>';
  const page = '<!doctype html><html><head><title>Example Rewards Campaign</title><meta name="description" content="Official campaign terms"></head><body>Register for the reward campaign and complete tasks. Reward campaign deadline is 30 October. Eligible residents may participate. Minimum deposit of 50 USDC. Rewards are not guaranteed.</body></html>';
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "https://example.org/campaign" || url === "https://app.galxe.com/quest/Demo/ABC123") {
      return new Response(page, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url === "https://app.galxe.com/quest/explore/all") {
      return new Response('<html><body><a href="/quest/Demo/ABC123">Example Rewards Campaign</a></body></html>', { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url === "https://app.layer3.xyz/activations") {
      return new Response('<html><body><p>Explore activations</p></body></html>', { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return new Response(feed, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const report = await collectReport();
  assert.equal(report.pipelineVersion, "2.0");
  assert.equal(report.items.length, 2);
  assert.equal(report.qualitySummary.feedsChecked, 9);
  assert.equal(report.qualitySummary.campaignDirectoriesChecked, 2);
  assert.equal(report.qualitySummary.campaignDirectoryLinksFound, 1);
  assert.equal(report.qualitySummary.candidatePagesChecked, 2);
  assert.ok(report.items.some((candidate) => candidate.source === "Galxe Quest"));
  assert.equal(report.qualitySummary.fullyVerifiedRewards, 0);
  assert.match(report.items[0].verificationStatus, /claims remain unverified/);
  assert.equal(report.items[0].reward, "Not confirmed");
});
