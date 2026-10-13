import { collectReport } from "./research.js";
const FEEDS = [
  "https://blog.ethereum.org/en/feed.xml",
  "https://blog.base.dev/feed",
  "https://offchain.medium.com/feed",
  "https://blog.arbitrum.io/rss/",
  "https://blog.uniswap.org/rss.xml",
  "https://blog.celestia.org/rss/",
  "https://solana.com/changelog/rss.xml",
  "https://www.circle.com/blog/rss.xml",
  "https://filecoin.io/blog/feed/index.xml"
];
const PRODUCT = { id: "daily_report", amountUsdCents: 100, title: "Crypto Opportunity Scout — Detailed Report" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return html(homePage());
    }

    if (request.method === "GET" && url.pathname === "/api/daily") {
      return Response.json(await readLatest(env), { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
    }

    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/refresh") {
      if (!env.SCOUT_KV) return Response.json({ error: "Report storage is not configured." }, { status: 503 });
      const lock = await env.SCOUT_KV.get("refresh:lock");
      if (lock) return Response.json({ ...(await readLatest(env)), refresh: "cooldown" }, { status: 429, headers: { "Retry-After": "300" } });
      await env.SCOUT_KV.put("refresh:lock", "1", { expirationTtl: 300 });
      try {
        const report = await collectReport();
        await env.SCOUT_KV.put("report:latest", JSON.stringify(report), { expirationTtl: 864000 });
        return Response.json({ ...report, refresh: "completed" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" } });
      } catch (error) {
        return Response.json({ error: "Research collection failed. Please try again shortly." }, { status: 502 });
      } finally {
        await env.SCOUT_KV.delete("refresh:lock");
      }
    }

    if (request.method === "POST" && url.pathname === "/checkout") {
      if (!env.SCOUT_KV) return Response.json({ error: "Report storage is not configured." }, { status: 503 });
      if (!env.SHIELDZ_API_KEY || !env.SHIELDZ_API_KEY.startsWith("sk_test_")) return Response.json({ error: "Checkout is locked to Shieldz test mode until end-to-end payment checks pass." }, { status: 503 });
      if (!env.SHIELDZ_WEBHOOK_SECRET) return Response.json({ error: "Shieldz webhook signing secret is not configured; checkout remains disabled." }, { status: 503 });
      if (!env.SCOUT_SETTLEMENT_ADDRESS) return Response.json({ error: "Set the merchant receiving wallet address as SCOUT_SETTLEMENT_ADDRESS before testing checkout." }, { status: 503 });
      const body = await request.json().catch(() => ({}));
      if (body.product !== PRODUCT.id || typeof body.itemUrl !== "string") return Response.json({ error: "Choose a specific opportunity to purchase a report for." }, { status: 400 });
      const digest = await readLatest(env);
      const item = (digest.items || []).find(x => x.url === body.itemUrl);
      if (!item) return Response.json({ error: "That opportunity is no longer in the latest digest. Refresh and choose it again." }, { status: 400 });
      const orderId = crypto.randomUUID();
      const accessToken = randomToken();
      const payload = {
        amount_usd_cents: PRODUCT.amountUsdCents,
        memo: PRODUCT.title + ": " + item.title.slice(0, 100),
        expires_in_seconds: 1800,
        idempotency_key: orderId,
        settlement: { chain: "BASE", asset: "USDC", address: env.SCOUT_SETTLEMENT_ADDRESS },
        metadata: { order_id: orderId, product: PRODUCT.id }
      };
      const response = await fetch("https://shieldz.cash/api/v1/invoices", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.SHIELDZ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) return Response.json({ error: "Shieldz test invoice could not be created. Check the test key and provider response." }, { status: 502 });
      const invoice = await response.json();
      if (!invoice.id || !invoice.pay_url || invoice.amount_usd_cents !== PRODUCT.amountUsdCents || invoice.mode !== "test" || invoice.settlement?.chain?.toUpperCase() !== "BASE" || invoice.settlement?.asset?.toUpperCase() !== "USDC") return Response.json({ error: "Shieldz returned an invoice that does not match the expected test amount, mode and Base/USDC settlement. No checkout link was issued." }, { status: 502 });
      await env.SCOUT_KV.put(`order:${orderId}`, JSON.stringify({
        id: orderId, invoiceId: invoice.id, product: PRODUCT.id, item,
        expectedAmountUsdCents: PRODUCT.amountUsdCents, expectedChain: "BASE", expectedAsset: "USDC",
        expectedMode: "test", expectedSettlementAddress: env.SCOUT_SETTLEMENT_ADDRESS,
        status: "pending", accessToken, createdAt: new Date().toISOString()
      }), { expirationTtl: 60 * 60 * 24 * 45 });
      return Response.json({ checkout_url: invoice.pay_url, report_url: `${url.origin}/report?order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(accessToken)}` });
    }

    if (request.method === "POST" && url.pathname === "/webhooks/shieldz") {
      const raw = await request.text();
      if (!await verifySignature(raw, request.headers.get("X-Shieldz-Signature") || "", env.SHIELDZ_WEBHOOK_SECRET)) return new Response("Invalid signature", { status: 401 });
      const delivery = request.headers.get("X-Shieldz-Delivery") || "";
      if (delivery && await env.SCOUT_KV.get(`delivery:${delivery}`)) return new Response("OK");
      let event;
      try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

      if (event.type === "invoice.paid") {
        const invoice = event.data?.invoice;
        const orderId = invoice?.metadata?.order_id;
        if (!orderId || !invoice?.id) return new Response("Missing invoice details", { status: 400 });
        const order = await env.SCOUT_KV.get(`order:${orderId}`, "json");
        if (!order || order.invoiceId !== invoice.id) return new Response("Order/invoice mismatch", { status: 404 });
        if (invoice.status !== "paid" || invoice.paid_after_expiry === true || invoice.mode !== order.expectedMode || invoice.amount_usd_cents !== order.expectedAmountUsdCents || invoice.settlement?.chain?.toUpperCase() !== order.expectedChain || invoice.settlement?.asset?.toUpperCase() !== order.expectedAsset || invoice.settlement?.address !== order.expectedSettlementAddress) return new Response("Invoice mode, amount, status, expiry or settlement mismatch", { status: 400 });
        if (order.status !== "paid") {
          order.status = "paid";
          order.paidAt = new Date().toISOString();
          await env.SCOUT_KV.put(`order:${orderId}`, JSON.stringify(order), { expirationTtl: 60 * 60 * 24 * 45 });
        }
      }
      if (delivery) await env.SCOUT_KV.put(`delivery:${delivery}`, "1", { expirationTtl: 172800 });
      return new Response("OK");
    }

    if (request.method === "GET" && url.pathname === "/report") {
      const id = url.searchParams.get("order");
      const token = url.searchParams.get("token");
      if (!id || !token) return new Response("Missing access details", { status: 400 });
      const order = await env.SCOUT_KV.get(`order:${id}`, "json");
      if (!order || !constantTimeEqual(order.accessToken, token)) return new Response("Access denied", { status: 403 });
      if (order.status !== "paid") return new Response("Payment not confirmed yet. Refresh this page shortly.", { status: 402 });
      return html(reportPage({ date: order.createdAt.slice(0, 10), items: order.item ? [order.item] : [], disclaimer: "Paid report based on one selected public-source lead. This is structured research guidance, not independent confirmation of a reward or guarantee of eligibility." }));
    }

    if (request.method === "POST" && url.pathname === "/admin/collect") {
      if (!env.SCOUT_ADMIN_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.SCOUT_ADMIN_TOKEN}`) return new Response("Unauthorized", { status: 401 });
      const report = await collectReport();
      await env.SCOUT_KV.put("report:latest", JSON.stringify(report), { expirationTtl: 864000 });
      return Response.json({ ok: true, date: report.date, count: report.items.length });
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      const report = await collectReport();
      await env.SCOUT_KV.put("report:latest", JSON.stringify(report), { expirationTtl: 864000 });
    })());
  }
};

async function readLatest(env) {
  return env.SCOUT_KV ? (await env.SCOUT_KV.get("report:latest", "json")) || {
    date: new Date().toISOString().slice(0, 10), items: [],
    disclaimer: "No digest collected yet. The scheduled collector will populate this page."
  } : {
    date: new Date().toISOString().slice(0, 10), items: [],
    disclaimer: "Storage is not configured yet. The site is online, but its report store needs to be connected."
  };
}
function classify(s, rewardSignal = false) {
  if (rewardSignal) return "Possible reward — manual verification required";
  if (/security|scam|exploit|phishing/i.test(s)) return "Security update";
  if (/testnet|devnet/i.test(s)) return "Testnet/developer update";
  return "Ecosystem announcement";
}
function getTag(s, tag) {
  const re = new RegExp("<"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+tag+">", "i");
  const m = s.match(re); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "") : "";
}
function cleanXml(s) {
  return String(s||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g," ").trim();
}
function randomToken() { return [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function constantTimeEqual(a,b) { if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0; }
async function verifySignature(raw, header, secret) {
  if(!secret||!header)return false;
  const parts=header.split(","), ts=parts.find(p=>p.startsWith("t="))?.slice(2), sigs=parts.filter(p=>p.startsWith("v1=")).map(p=>p.slice(3));
  if(!ts||!Number.isFinite(Number(ts))||Math.abs(Date.now()/1000-Number(ts))>300)return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${ts}.${raw}`));
  const expected=[...new Uint8Array(signed)].map(b=>b.toString(16).padStart(2,"0")).join("");
  return sigs.some(s=>constantTimeEqual(s,expected));
}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function html(body){return new Response(body,{headers:{"Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});}
function homePage(){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Crypto Opportunity Scout</title><style>body{font:16px system-ui;max-width:800px;margin:32px auto;padding:0 16px;color:#172033;line-height:1.5}.item{border:1px solid #d9deea;border-radius:12px;padding:16px;margin:14px 0}.muted{color:#596579}</style></head><body><h1>Crypto Opportunity Scout</h1><p class="muted">Daily public-source crypto research. Leads are not verified rewards or financial advice.</p><main id="items">Loading…</main><script>const root=document.getElementById('items');function show(d){root.textContent='';const p=document.createElement('p');p.textContent='Report date: '+(d.date||'not available');root.append(p);if(d.qualitySummary){const q=document.createElement('p');q.className='muted';q.textContent='Quality checks: '+(d.qualitySummary.feedsAvailable||0)+'/'+(d.qualitySummary.feedsChecked||0)+' feeds available · '+(d.qualitySummary.candidatePagesChecked||0)+' source pages checked · '+(d.qualitySummary.possibleRewardSignals||0)+' possible reward signals · '+(d.qualitySummary.actionableLeadsPublished||0)+' actionable leads published · '+(d.qualitySummary.rejectedAsInsufficientEvidence||0)+' rejected for weak evidence · '+(d.qualitySummary.fullyVerifiedRewards||0)+' fully verified rewards';root.append(q);if(d.qualitySummary.rejectionBreakdown){const rb=d.qualitySummary.rejectionBreakdown;const reasons=document.createElement('p');reasons.className='muted';reasons.textContent='Why candidates were rejected: '+(rb.sourcePageUnavailable||0)+' source pages unavailable · '+(rb.noRewardSignal||0)+' with no explicit reward · '+(rb.noConcreteAction||0)+' with no concrete action · '+(rb.campaignEnded||0)+' apparently ended · '+(rb.economicsNotEstablished||0)+' without sufficient economic evidence';root.append(reasons)}}for(const i of d.items||[]){const box=document.createElement('article');box.className='item';const h=document.createElement('h3');h.textContent=i.title;const meta=document.createElement('p');meta.className='muted';meta.textContent=(i.category||'Research lead')+(Number.isFinite(i.relevance)?' · Relevance score '+i.relevance+'/100':'');const s=document.createElement('p');s.textContent=i.summary||'Open the source for details.';const ev=document.createElement('p');ev.textContent='Reward status: '+(i.evidenceStatus||'Not verified');const assessment=document.createElement('p');assessment.textContent='Priority: '+(i.assessment||'Manual review needed');const action=document.createElement('p');action.textContent='Suggested next step: '+(i.nextStep||'Review the original source before acting.');const verdict=document.createElement('p');verdict.textContent='Scout verdict: '+(i.verdict||'Investigate — verify the source first');const checked=document.createElement('p');checked.textContent='Source check: '+(i.verificationStatus||'Not independently verified');const deadline=document.createElement('p');deadline.textContent='Deadline: '+(i.deadline||'Not extracted — check original terms');const eligibility=document.createElement('p');eligibility.textContent='Eligibility: '+(i.eligibility||'Not established — check original terms');const costs=document.createElement('p');costs.textContent='Costs and requirements: '+(i.costsAndRequirements||i.cost||'Not established — check original terms');const rewardDetails=document.createElement('p');rewardDetails.textContent='Reward evidence: '+(i.rewardDetails||'No specific reward amount/type extracted');const taskDetails=document.createElement('p');taskDetails.textContent='Task evidence: '+(i.taskDetails||'No concrete task sequence extracted');const statusEvidence=document.createElement('p');statusEvidence.textContent='Campaign status evidence: '+(i.statusEvidence||'Current campaign status not established');const campaignStatus=document.createElement('p');campaignStatus.textContent='Campaign status: '+(i.campaignStatus||'Unconfirmed');const warning=document.createElement('p');warning.className='muted';warning.textContent=i.verification||'Verify claims before acting.';const a=document.createElement('a');a.href=i.url;a.rel='noopener noreferrer';a.textContent='Open original source';const buy=document.createElement('button');buy.textContent='Get detailed report — $1 USDC on Base (test mode)';buy.style='display:block;margin-top:14px;padding:12px 16px;border-radius:8px;border:1px solid #aaa;background:white;font:inherit';buy.onclick=async()=>{buy.disabled=true;buy.textContent='Preparing test checkout…';try{const cr=await fetch('/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'daily_report',itemUrl:i.url})});const data=await cr.json();if(!cr.ok)throw new Error(data.error||'Checkout unavailable');const go=document.createElement('a');go.href=data.checkout_url;go.textContent='Continue to Shieldz test checkout';go.style='display:block;margin-top:10px';buy.replaceWith(go);const reportLink=document.createElement('a');reportLink.href=data.report_url;reportLink.textContent='Report access link (available after test payment)';reportLink.style='display:block;margin-top:8px';box.append(reportLink)}catch(e){buy.disabled=false;buy.textContent='Test checkout unavailable';const msg=document.createElement('p');msg.textContent=e.message;box.append(msg)}};box.append(h,meta,s,ev,assessment,verdict,checked,campaignStatus,statusEvidence,rewardDetails,taskDetails,deadline,eligibility,costs,action,warning,a,buy);root.append(box)}const n=document.createElement('p');n.className='muted';n.textContent=d.disclaimer||d.note||'';root.append(n);for(const source of d.sources||[]){const detail=document.createElement('p');detail.className='muted';detail.textContent=source.source+': '+(source.ok?'HTTP '+source.status+', '+source.entriesFound+' entries, '+source.itemsAccepted+' usable':'unavailable')+(source.issue?' — '+source.issue:'');root.append(detail)}if(!(d.items||[]).length){const b=document.createElement('button');b.textContent='Collect latest public research';b.style='padding:12px 16px;border-radius:8px;border:1px solid #aaa;background:white;font:inherit';b.onclick=async()=>{b.disabled=true;b.textContent='Collecting…';try{const r=await fetch('/api/refresh',{method:'POST'});const x=await r.json();if(!r.ok&&r.status!==429)throw new Error(x.error||'Refresh failed');show(x)}catch(e){b.disabled=false;b.textContent='Try collecting again';const m=document.createElement('p');m.textContent=e.message;root.append(m)}};root.append(b)}}async function loadDigest(){root.textContent='Loading the latest report…';try{const r=await fetch('/api/daily',{cache:'no-store'});if(!r.ok)throw new Error('The report API returned HTTP '+r.status+'.');const d=await r.json();show(d)}catch(e){root.textContent='';const p=document.createElement('p');p.textContent='The digest could not load. '+(e.message||'The report service may be temporarily unavailable.');root.append(p);const b=document.createElement('button');b.textContent='Retry';b.style='padding:12px 16px;border-radius:8px;border:1px solid #aaa;background:white;font:inherit';b.onclick=loadDigest;root.append(b)}}loadDigest()</script></body></html>`;}
function reportPage(report) {
  const cards = (report.items || []).map(i => {
    const risks = (i.risks || ["Eligibility and reward details have not been independently confirmed."])
      .map(risk => "<li>" + esc(risk) + "</li>").join("");
    return '<article style="border:1px solid #d9deea;border-radius:14px;padding:18px;margin:16px 0">' +
      '<p style="color:#526173;font-size:13px">SOURCE: ' + esc(i.source || "Unknown") + ' · PUBLISHED: ' + esc(i.date || "Date unavailable") + '</p>' +
      '<h2 style="margin:8px 0">' + esc(i.title) + '</h2>' +
      '<p><b>Scout verdict:</b> ' + esc(i.verdict || "Investigate — verify the source first") + '</p>' +
      '<p><b>Source check:</b> ' + esc(i.verificationStatus || "Not independently verified") + '</p>' +
      '<p><b>Research completeness:</b> ' + esc(i.assessment || "Not assessed") + '</p>' +
      (i.summary ? '<p>' + esc(i.summary) + '</p>' : '') +
      (i.sourcePageDescription ? '<p><b>Page description:</b> ' + esc(i.sourcePageDescription) + '</p>' : '') +
      '<p><a href="' + esc(i.url) + '" rel="noopener noreferrer">Open original source and terms</a></p>' +
      '<h3>Investment snapshot</h3>' +
      '<p><b>Risk level:</b> ' + esc(i.investmentAssessment?.riskLevel || "Unassessed") + '</p>' +
      '<p><b>Scout decision:</b> ' + esc(i.investmentAssessment?.decision || "Not assessed") + '</p>' +
      '<p><b>How the reward is paid:</b> ' + esc(i.payoutAsset || "Not established from the source text") + '</p>' +
      '<p><b>Advertised reward basis:</b> ' + esc(i.rewardBasis || "Not established") + '</p>' +
      '<p><b>Potential net return:</b> ' + esc(i.investmentAssessment?.estimatedNetReturn || "Not estimated") + '</p>' +
      '<ul>' + (i.investmentAssessment?.reasons || []).map(reason => "<li>" + esc(reason) + "</li>").join("") + '</ul>' +
      '<h3>What the automated checks found</h3>' +
      '<p><b>Reward evidence:</b> ' + esc(i.evidenceStatus || "Not confirmed") + '</p>' +
      '<p><b>Deadline:</b> ' + esc(i.deadline || "Not extracted — check original terms") + '</p>' +
      '<p><b>Eligibility:</b> ' + esc(i.eligibility || "Not established — check original terms") + '</p>' +
      '<p><b>Costs and requirements:</b> ' + esc(i.costsAndRequirements || i.cost || "Not established — check original terms") + '</p>' +
      '<h3>Risks and unknowns</h3><ul>' + risks + '</ul>' +
      '<h3>Recommended next step</h3><p>' + esc(i.nextStep || "Read the original terms before acting.") + '</p>' +
      '<p style="font-size:13px;color:#526173">' + esc(i.verification || "Automated research only; important terms may be missed.") + '</p>' +
      '</article>';
  }).join("");
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Crypto Opportunity Scout — Detailed Report</title><style>body{font:16px system-ui;line-height:1.55;max-width:820px;margin:28px auto;padding:0 16px;color:#172033}a{overflow-wrap:anywhere}h1{line-height:1.2}.muted{color:#526173}.notice{background:#f3f6fa;border-radius:12px;padding:14px}</style></head><body>' +
    '<p class="muted">CRYPTO OPPORTUNITY SCOUT · DETAILED REPORT</p><h1>Your opportunity research report</h1>' +
    '<p class="muted">Generated: ' + esc(report.generatedAt || report.date || "Date unavailable") + '</p>' +
    '<div class="notice"><b>How to read this report</b><p>Automated source checks help organise research, but they do not prove that a reward is genuine, still open, available in your country or payable. The system does not label rewards as confirmed. Verify the original terms before spending money or connecting a wallet.</p></div>' +
    (cards || "<p>No research item is available for this order.</p>") +
    '<p class="muted">' + esc(report.disclaimer || "Automated public-source research; not financial advice.") + '</p>' +
    '<p class="muted">Never share a seed phrase or private key. Never spend money solely because an item appears in this report.</p></body></html>';
}
