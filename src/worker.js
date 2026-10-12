const FEEDS = [
  "https://blog.ethereum.org/en/feed.xml",
  "https://blog.base.dev/feed",
  "https://offchain.medium.com/feed",
  "https://optimism.mirror.xyz/feed/atom",
  "https://blog.chain.link/rss/",
  "https://www.circle.com/blog/rss.xml",
  "https://solana.com/changelog/rss.xml",
  "https://www.bnbchain.org/en/blog/rss.xml",
  "https://trondao.org/blog/feed/"
];
const PRODUCT = { id: "daily_report", amountUsdCents: 100, title: "Crypto Opportunity Scout — Detailed Report" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return html(homePage());
    }

    if (request.method === "GET" && url.pathname === "/api/daily") {
      return Response.json(await readLatest(env));
    }

    if (request.method === "POST" && url.pathname === "/api/refresh") {
      if (!env.SCOUT_KV) return Response.json({ error: "Report storage is not configured." }, { status: 503 });
      const lock = await env.SCOUT_KV.get("refresh:lock");
      if (lock) return Response.json({ ...(await readLatest(env)), refresh: "cooldown" }, { status: 429, headers: { "Retry-After": "300" } });
      await env.SCOUT_KV.put("refresh:lock", "1", { expirationTtl: 300 });
      const report = await collectReport();
      await env.SCOUT_KV.put("report:latest", JSON.stringify(report), { expirationTtl: 864000 });
      return Response.json({ ...report, refresh: "completed" });
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
        if (invoice.status !== "paid" || invoice.mode !== order.expectedMode || invoice.amount_usd_cents !== order.expectedAmountUsdCents || invoice.settlement?.chain?.toUpperCase() !== order.expectedChain || invoice.settlement?.asset?.toUpperCase() !== order.expectedAsset || invoice.settlement?.address !== order.expectedSettlementAddress) return new Response("Invoice mode, amount, status or settlement mismatch", { status: 400 });
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
async function collectReport() {
  const all = [];
  const sources = [];
  for (const feedUrl of FEEDS) {
    const source = new URL(feedUrl).hostname;
    try {
      const response = await fetch(feedUrl, {
        headers: { "User-Agent": "CryptoOpportunityScout/1.0", "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        sources.push({ source, ok: false, status: response.status, entriesFound: 0, itemsAccepted: 0, issue: "Feed returned a non-success HTTP status." });
        continue;
      }
      const xml = await response.text();
      const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]).slice(0, 30);
      let accepted = 0;
      for (const block of blocks) {
        const title = cleanXml(getTag(block, "title"));
        const linkTag = getTag(block, "link");
        const href = (block.match(/<link[^>]+href=["']([^"']+)/i) || [])[1] || cleanXml(linkTag);
        const date = cleanXml(getTag(block, "pubDate") || getTag(block, "updated") || getTag(block, "published"));
        const summary = cleanXml(getTag(block, "description") || getTag(block, "summary") || getTag(block, "content"));
        if (!title || !/^https:\/\/[^/]/i.test(href)) continue;
        const text = title + " " + summary;
        const lower = text.toLowerCase();
        let category = classify(text);
        let relevance = 20;
        if (/airdrop|claim|reward|incentive|quest|points campaign|retroactive|testnet|mainnet incentive/.test(lower)) relevance += 45;
        if (/eligibility|snapshot|deadline|registration|official campaign/.test(lower)) relevance += 20;
        if (/security|exploit|phishing|governance|upgrade|research paper/.test(lower)) relevance -= 10;
        if (source.includes("ethereum.org") || source.includes("base.dev")) relevance += 5;
        const item = {
          title: title.slice(0, 200), url: href, source, date, summary: summary.slice(0, 280),
          category, relevance, reward: "Unverified", cost: "Not established",
          evidenceStatus: /airdrop|reward|incentive|claim|points campaign|retroactive/i.test(text) ? "Possible reward mentioned — not confirmed" : "No specific reward identified",
          nextStep: /testnet|devnet/i.test(text) ? "Check the official project page for live testnet instructions. Participation does not guarantee a reward." : /airdrop|reward|incentive|claim|points campaign|retroactive/i.test(text) ? "Check the official source for eligibility, dates and claim instructions before acting." : /security|exploit|phishing/i.test(text) ? "Review the official security notice for any recommended action." : "Review the official announcement to see whether it contains a concrete action relevant to you.",
          assessment: relevance >= 65 ? "Higher keyword relevance; manual verification needed" : relevance >= 40 ? "Worth a quick review" : "General ecosystem information",
          verification: "Research lead only. Eligibility, fees, deadlines and withdrawal conditions are not independently verified. Never share a seed phrase or sign a transaction solely because of this listing."
        };
        all.push(item);
        accepted++;
      }
      sources.push({ source, ok: true, status: response.status, entriesFound: blocks.length, itemsAccepted: accepted, issue: blocks.length ? (accepted ? null : "Feed entries were found, but none had a usable title and HTTPS link.") : "No RSS or Atom entries matched the expected format." });
    } catch (error) {
      sources.push({ source, ok: false, status: null, entriesFound: 0, itemsAccepted: 0, issue: error?.name === "TimeoutError" ? "Feed request timed out." : "Feed could not be fetched or parsed." });
    }
  }
  const unique = [...new Map(all.map(x => [x.url, x])).values()];
  const items = unique.sort((a,b) => b.relevance - a.relevance || (Date.parse(b.date)||0)-(Date.parse(a.date)||0)).slice(0, 15);
  return {
    date: new Date().toISOString().slice(0,10), generatedAt: new Date().toISOString(), items, sources,
    disclaimer: items.length
      ? "Ranked public-source research leads, not verified airdrops or guaranteed income. Scores indicate keyword relevance only, not likelihood of reward. Never deposit funds, reveal a seed phrase, or sign a transaction solely because of a listing."
      : "No usable leads were collected. Source diagnostics are available to help identify whether a feed was unavailable or its format changed."
  };
}
function classify(s) {
  if (/airdrop|reward|campaign|incentive|quest|points/i.test(s)) return "Possible reward — manual verification required";
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
function homePage(){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Crypto Opportunity Scout</title><style>body{font:16px system-ui;max-width:800px;margin:32px auto;padding:0 16px;color:#172033;line-height:1.5}.item{border:1px solid #d9deea;border-radius:12px;padding:16px;margin:14px 0}.muted{color:#596579}</style></head><body><h1>Crypto Opportunity Scout</h1><p class="muted">Daily public-source crypto research. Leads are not verified rewards or financial advice.</p><main id="items">Loading…</main><script>const root=document.getElementById('items');function show(d){root.textContent='';const p=document.createElement('p');p.textContent='Report date: '+(d.date||'not available');root.append(p);for(const i of d.items||[]){const box=document.createElement('article');box.className='item';const h=document.createElement('h3');h.textContent=i.title;const meta=document.createElement('p');meta.className='muted';meta.textContent=(i.category||'Research lead')+(Number.isFinite(i.relevance)?' · Relevance score '+i.relevance+'/100':'');const s=document.createElement('p');s.textContent=i.summary||'Open the source for details.';const ev=document.createElement('p');ev.textContent='Reward status: '+(i.evidenceStatus||'Not verified');const assessment=document.createElement('p');assessment.textContent='Priority: '+(i.assessment||'Manual review needed');const action=document.createElement('p');action.textContent='Suggested next step: '+(i.nextStep||'Review the official source before acting.');const warning=document.createElement('p');warning.className='muted';warning.textContent=i.verification||'Verify claims before acting.';const a=document.createElement('a');a.href=i.url;a.rel='noopener noreferrer';a.textContent='Open official source';const buy=document.createElement('button');buy.textContent='Get detailed report — $1 USDC on Base (test mode)';buy.style='display:block;margin-top:14px;padding:12px 16px;border-radius:8px;border:1px solid #aaa;background:white;font:inherit';buy.onclick=async()=>{buy.disabled=true;buy.textContent='Preparing test checkout…';try{const cr=await fetch('/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'daily_report',itemUrl:i.url})});const data=await cr.json();if(!cr.ok)throw new Error(data.error||'Checkout unavailable');const go=document.createElement('a');go.href=data.checkout_url;go.textContent='Continue to Shieldz test checkout';go.style='display:block;margin-top:10px';buy.replaceWith(go);const reportLink=document.createElement('a');reportLink.href=data.report_url;reportLink.textContent='Report access link (available after test payment)';reportLink.style='display:block;margin-top:8px';box.append(reportLink)}catch(e){buy.disabled=false;buy.textContent='Test checkout unavailable';const msg=document.createElement('p');msg.textContent=e.message;box.append(msg)}};box.append(h,meta,s,ev,assessment,action,warning,a,buy);root.append(box)}const n=document.createElement('p');n.className='muted';n.textContent=d.disclaimer||d.note||'';root.append(n);for(const source of d.sources||[]){const detail=document.createElement('p');detail.className='muted';detail.textContent=source.source+': '+(source.ok?'HTTP '+source.status+', '+source.entriesFound+' entries, '+source.itemsAccepted+' usable':'unavailable')+(source.issue?' — '+source.issue:'');root.append(detail)}if(!(d.items||[]).length){const b=document.createElement('button');b.textContent='Collect latest public research';b.style='padding:12px 16px;border-radius:8px;border:1px solid #aaa;background:white;font:inherit';b.onclick=async()=>{b.disabled=true;b.textContent='Collecting…';try{const r=await fetch('/api/refresh',{method:'POST'});const x=await r.json();if(!r.ok&&r.status!==429)throw new Error(x.error||'Refresh failed');show(x)}catch(e){b.disabled=false;b.textContent='Try collecting again';const m=document.createElement('p');m.textContent=e.message;root.append(m)}};root.append(b)}}async function loadDigest(){root.textContent='Loading digest…';try{const r=await fetch('/api/daily',{cache:'no-store'});if(!r.ok)throw new Error('The report API returned HTTP '+r.status+'.');let d=await r.json();if(!(d.items||[]).length){try{const rr=await fetch('/api/refresh',{method:'POST',cache:'no-store'});const x=await rr.json().catch(()=>({}));if(rr.ok||rr.status===429){d=x}else{d.disclaimer=x.error||d.disclaimer}}catch(e){d.disclaimer=(d.disclaimer||'No digest is available yet.')+' Collection request failed: '+(e.message||'network error')+'.'}}show(d)}catch(e){root.textContent='';const p=document.createElement('p');p.textContent='The digest could not load. '+(e.message||'The report service may be temporarily unavailable.');root.append(p);const b=document.createElement('button');b.textContent='Retry';b.style='padding:12px 16px;border-radius:8px;border:1px solid #aaa;background:white;font:inherit';b.onclick=loadDigest;root.append(b)}}loadDigest()</script></body></html>`;}
function reportPage(report){const cards=(report.items||[]).map(i=>`<article style="border:1px solid #ddd;border-radius:10px;padding:14px;margin:12px 0"><h3>${esc(i.title)}</h3><p>${esc(i.category)}</p><p>${esc(i.summary)}</p><p><a href="${esc(i.url)}" rel="noopener noreferrer">Read original official source</a></p><h4>What the Scout can establish</h4><p><b>Reward status:</b> ${esc(i.evidenceStatus||"Not verified")}</p><p><b>Current cost:</b> ${esc(i.cost||"Not established")}</p><p><b>Priority:</b> ${esc(i.assessment||"Manual review needed")}</p><p><b>Suggested next step:</b> ${esc(i.nextStep||"Review the official source before acting.")}</p><h4>Before you act, verify</h4><ul><li>Is there an official campaign page, and is it linked from the project's genuine website?</li><li>Are eligibility rules, dates and any reward explicitly published?</li><li>What transaction fees, deposits or approvals are required?</li><li>Can you participate without sharing a seed phrase or granting unnecessary wallet permissions?</li></ul><p>${esc(i.verification||"This is a research lead, not a verified reward.")}</p></article>`).join("");return `<!doctype html><meta name="viewport" content="width=device-width"><title>Scout Report</title><main style="font:16px system-ui;max-width:800px;margin:32px auto;padding:0 16px"><h1>Your detailed Scout report</h1><p>Date: ${esc(report.date)}</p><p>This report organizes public-source leads into next steps and verification checks. It does not independently confirm rewards or guarantee eligibility.</p>${cards||"<p>No items available today.</p>"}<p>${esc(report.disclaimer)}</p></main>`;}
