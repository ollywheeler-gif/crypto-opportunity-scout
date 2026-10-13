import { collectReport } from "./research.js";
const FEEDS = [
  "https://blog.ethereum.org/en/feed.xml",
  "https://blog.base.dev/feed",
  "https://offchain.medium.com/feed",
  "https://blog.arbitrum.io/rss/",
  "https://blog.celestia.org/rss/",
  "https://solana.com/changelog/rss.xml",
  "https://blog.celer.network/feed/",
  "https://blog.chain.link/rss/"
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

    if (request.method === "GET" && url.pathname === "/api/history") {
      if (!env.SCOUT_KV) return Response.json({ reports: [] });
      if (typeof env.SCOUT_KV.list !== "function") {
        const latest = await readLatest(env);
        return Response.json({ reports: latest?.generatedAt ? [latest] : [] });
      }
      const keys = await env.SCOUT_KV.list({ prefix: "report:archive:", limit: 30 });
      const reports = (await Promise.all(keys.keys.map(key => env.SCOUT_KV.get(key.name, "json"))))
        .filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return Response.json({ reports }, { headers: { "Cache-Control": "no-store" } });
    }

    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/refresh") {
      if (!env.SCOUT_KV) return Response.json({ error: "Report storage is not configured." }, { status: 503 });
      const lock = await env.SCOUT_KV.get("refresh:lock");
      if (lock) return Response.json({ ...(await readLatest(env)), refresh: "cooldown" }, { status: 429, headers: { "Retry-After": "300" } });
      await env.SCOUT_KV.put("refresh:lock", "1", { expirationTtl: 300 });
      try {
        const report = await collectReport();
        await saveReport(env, report);
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
      const item = (digest.qualifiedItems || []).find(x => x.url === body.itemUrl);
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
      await saveReport(env, report);
      return Response.json({ ok: true, date: report.date, count: report.items.length });
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      const report = await collectReport();
      await saveReport(env, report);
    })());
  }
};

async function saveReport(env, report) {
  await env.SCOUT_KV.put("report:latest", JSON.stringify(report), { expirationTtl: 864000 });
  await env.SCOUT_KV.put("report:archive:" + report.date, JSON.stringify(report), { expirationTtl: 60 * 60 * 24 * 90 });
}

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
function homePage(){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Crypto Opportunity Scout</title><style>
*{box-sizing:border-box}body{font:16px system-ui;line-height:1.55;max-width:900px;margin:0 auto;padding:20px 16px 40px;color:#172033;background:#f6f8fc}h1{font-size:clamp(28px,6vw,40px);line-height:1.15}.muted{color:#596579}.hero,.panel,.item,.bottom{background:white;border:1px solid #dce2ec;border-radius:15px;padding:18px;margin:14px 0}.hero{background:#eef4ff}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.stat{background:#fff;border:1px solid #dce2ec;border-radius:12px;padding:12px}.stat b{display:block;font-size:22px}.btn{padding:12px 16px;border:0;border-radius:10px;background:#245fce;color:white;font:inherit;font-weight:650}.btn:disabled{opacity:.55}details{margin:18px 0}a{overflow-wrap:anywhere}small{color:#596579}
</style></head><body><header><p class="muted">PUBLIC-SOURCE RESEARCH · AUTOMATED COLLECTION</p><h1>Crypto Opportunity Scout</h1><p class="muted">Research leads, reward signals and evidence checks. A listing is not a guarantee of a reward.</p></header>
<section class="hero"><h2>Latest report</h2><p id="date">Loading latest report…</p><button id="refresh" class="btn">Collect latest public research</button><p id="message" class="muted"></p></section>
<section id="stats" class="stats"></section><section class="panel"><h2>Research leads</h2><p id="empty" class="muted">Loading…</p><div id="items"></div></section>
<section class="panel"><h2>Report history</h2><p id="history" class="muted">The current backend stores the latest report only. A dated archive is not yet available.</p></section>
<section class="bottom"><h2>Detailed report access</h2><p id="payment-copy">Checkout remains test-only and is available only for leads that pass the economic evidence screen.</p><label for="checkout-item">Eligible detailed report</label><br><select id="checkout-item" style="width:100%;padding:12px;margin:8px 0;border:1px solid #dce2ec;border-radius:8px" disabled><option>No economically qualified leads yet</option></select><br><button id="pay" class="btn" disabled>Checkout unavailable — no qualified lead</button><p id="checkout-message" class="muted"></p><p><small>Purchasing a report does not guarantee a reward or financial return.</small></p></section>
<details><summary>Technical diagnostics and source health</summary><div id="diagnostics" class="muted"></div></details><p class="muted"><small>Never share seed phrases or private keys. Verify terms, eligibility, expiry and costs before acting.</small></p>
<script>
const $=id=>document.getElementById(id);function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function show(d){$('stats').textContent='';$('items').textContent='';$('diagnostics').textContent='';$('date').textContent='Report date: '+(d.date||'not available')+(d.generatedAt?' · '+d.generatedAt:'');const q=d.qualitySummary||{};[['Feeds available',(q.feedsAvailable??'—')+'/'+(q.feedsChecked??'—')],['Pages checked',q.candidatePagesChecked??0],['Reward signals',q.possibleRewardSignals??0],['Verified rewards',q.fullyVerifiedRewards??0]].forEach(([a,b])=>{const x=node('div',undefined,'stat');x.append(node('small',a),node('b',String(b)));$('stats').append(x)});const items=d.items||[];const qualified=d.qualifiedItems||[];$('empty').textContent=items.length?'Review each lead and verify the original source.':'No leads currently meet the publication rules. This does not prove no opportunities exist.';for(const i of items){const card=node('article',undefined,'item');card.append(node('h3',i.title),node('p',i.summary||'No summary available.'),node('p','Scout verdict: '+(i.verdict||'Manual verification required')),node('p','Reward evidence: '+(i.evidenceStatus||'Not confirmed')),node('p','Deadline: '+(i.deadline||'Not established')),node('p','Eligibility: '+(i.eligibility||'Not established')),node('p','Costs: '+(i.costsAndRequirements||'Not established')));const a=node('a','Open original source');a.href=i.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);$('items').append(card)}$('checkout-item').textContent='';if(qualified.length){$('checkout-item').disabled=false;for(const i of qualified){const option=node('option',i.title);option.value=i.url;$('checkout-item').append(option)}}else{$('checkout-item').disabled=true;$('checkout-item').append(node('option','No economically qualified leads yet'))}$('pay').disabled=!qualified.length;$('pay').textContent=qualified.length?'Create $1 test checkout':'Checkout unavailable — no qualified lead';$('payment-copy').textContent=qualified.length?qualified.length+' lead(s) passed the current economic evidence screen. Checkout is test mode only.':'No leads currently pass the economic evidence screen. Research leads remain visible above, but checkout is deliberately unavailable for them.';$('history').textContent='Latest saved report: '+(d.date||'date unavailable')+'. Older saved collections appear here as they accumulate.';for(const s of d.sources||[])$('diagnostics').append(node('p',s.source+': '+(s.ok?'HTTP '+s.status+', '+s.entriesFound+' entries, '+s.itemsAccepted+' usable':'unavailable')+(s.contentType?' · '+s.contentType:'')+(s.issue?' — '+s.issue:'')));if(d.disclaimer)$('diagnostics').append(node('p',d.disclaimer))}
async function loadHistory(){try{const r=await fetch('/api/history',{cache:'no-store'});const d=await r.json();$('history').textContent='';if(!d.reports?.length){$('history').textContent='No archived collections yet. New collections will be saved here.';return}for(const report of d.reports){const row=node('p',report.date+' · '+(report.items?.length||0)+' research leads · '+(report.qualitySummary?.economicallyQualifiedLeads||0)+' economically qualified');$('history').append(row)}}catch(e){$('history').textContent='Saved report history could not be loaded.'}}
async function load(){try{const r=await fetch('/api/daily',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);show(await r.json());await loadHistory()}catch(e){$('date').textContent='Could not load report: '+e.message}}
$('refresh').onclick=async()=>{const b=$('refresh');b.disabled=true;b.textContent='Collecting…';$('message').textContent='Checking public sources…';try{const r=await fetch('/api/refresh',{method:'POST'}),d=await r.json();if(!r.ok&&r.status!==429)throw Error(d.error||'Refresh failed');show(d);await loadHistory();$('message').textContent=d.refresh==='cooldown'?'A recent collection is still within its cooldown.':'Collection finished.'}catch(e){$('message').textContent=e.message}finally{b.disabled=false;b.textContent='Collect latest public research'}};$('pay').onclick=async()=>{const b=$('pay');b.disabled=true;b.textContent='Creating test invoice…';$('checkout-message').textContent='';try{const r=await fetch('/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'daily_report',itemUrl:$('checkout-item').value})});const d=await r.json();if(!r.ok)throw Error(d.error||'Test checkout unavailable');$('checkout-message').textContent='Test invoice created. Continue only if you intend to test the payment flow.';const a=node('a','Open test checkout');a.href=d.checkout_url;a.target='_blank';a.rel='noopener noreferrer';$('checkout-message').append(document.createTextNode(' '),a);const report=node('a','Report access link (available after verified test payment)');report.href=d.report_url;report.target='_blank';report.rel='noopener noreferrer';$('checkout-message').append(document.createTextNode(' · '),report)}catch(e){$('checkout-message').textContent=e.message}finally{b.disabled=!$('checkout-item').value||$('checkout-item').disabled;b.textContent=$('checkout-item').disabled?'Checkout unavailable — no qualified lead':'Create $1 test checkout'}};load();
</script></body></html>`;}
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
