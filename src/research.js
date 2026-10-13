const MAX_AGE_DAYS = 45;
const MAX_ITEMS = 12;
const PAGE_TIMEOUT_MS = 6000;

const REWARD_TERMS = /\bairdrop\b|\bclaim (?:your|rewards?|tokens?)\b|\breward (?:program|programme|campaign|pool)\b|\bincentive (?:program|programme|campaign|pool)\b|\bquest campaign\b|\bpoints campaign\b|\bretroactive rewards?\b|\bearn rewards?\b|\btoken rewards?\b/i;
const ACTION_TERMS = /\bregister\b|\bdeadline\b|\beligib(?:le|ility)\b|\bsnapshot\b|\bdeposit\b|\btrade\b|\bhold\b|\bcomplete (?:tasks|quests|missions)\b|\bclaim\b|\bparticipat(?:e|ion)\b/i;
const RISK_TERMS = [
  ["Capital or deposit required", /\bdeposit\b|\bminimum (?:balance|deposit|purchase)\b|\bhold (?:at least|a minimum)\b|\btrading volume\b/i],
  ["Fees may apply", /\bfee\b|\bspread\b|\bgas\b|\btransaction cost\b/i],
  ["Wallet permissions or signing may be required", /\bconnect (?:your )?wallet\b|\bsign (?:a )?(?:message|transaction)\b|\bapprove (?:the )?token\b/i],
  ["Reward or eligibility is not guaranteed", /\bsubject to eligibility\b|\bselected users\b|\bwhile supplies last\b|\bdiscretion\b|\bnot guaranteed\b/i],
  ["Time limit or expiry may apply", /\bdeadline\b|\bexpires?\b|\bends? on\b|\buntil \w+ \d{1,2}\b/i]
];

export async function collectReport() {
  const all = [];
  const sources = [];
  for (const feedUrl of FEEDS) {
    const feedHost = new URL(feedUrl).hostname;
    try {
      const response = await fetch(feedUrl, {
        headers: { "User-Agent": "CryptoOpportunityScout/1.1", "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) {
        sources.push({ source: feedHost, ok: false, status: response.status, entriesFound: 0, itemsAccepted: 0, issue: "Feed returned a non-success HTTP status." });
        continue;
      }
      const xml = (await response.text()).slice(0, 1500000);
      const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]).slice(0, 30);
      let accepted = 0;
      for (const block of blocks) {
        const title = cleanXml(getTag(block, "title"));
        const href = extractFeedLink(block);
        const date = cleanXml(getTag(block, "pubDate") || getTag(block, "updated") || getTag(block, "published") || getTag(block, "date"));
        const summary = cleanXml(getTag(block, "description") || getTag(block, "summary") || getTag(block, "content"));
        const url = normalizeArticleUrl(href);
        if (!title || !url) continue;
        const publishedMs = Date.parse(date);
        const ageMs = Date.now() - publishedMs;
        if (!Number.isFinite(publishedMs) || ageMs < -24 * 60 * 60 * 1000 || ageMs > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) continue;
        const text = title + " " + summary;
        const rewardSignal = REWARD_TERMS.test(text);
        const lower = text.toLowerCase();
        let relevance = 15;
        if (rewardSignal) relevance += 35;
        if (/\btestnet\b|\bdevnet\b|\bpoints\b/i.test(lower)) relevance += 12;
        if (ACTION_TERMS.test(text)) relevance += 10;
        if (/\beligibility\b|\bsnapshot\b|\bdeadline\b|\bregistration\b/i.test(lower)) relevance += 8;
        if (/\bsecurity\b|\bexploit\b|\bphishing\b|\bgovernance\b|\bresearch paper\b/i.test(lower)) relevance -= 12;
        all.push({
          title: title.slice(0, 200), url, source: feedHost, sourceFeed: feedUrl,
          date, publishedAt: new Date(publishedMs).toISOString(), summary: summary.slice(0, 500),
          relevance: Math.max(0, Math.min(100, relevance)), rewardSignal,
          reward: "Not confirmed", cost: "Not established",
          evidenceStatus: rewardSignal ? "Possible reward wording detected; terms not yet verified" : "No explicit reward detected in the feed summary",
          verificationStatus: "Awaiting source-page check",
          pageCheckedAt: null, sourcePageTitle: null, sourcePageDescription: null,
          deadline: "Not extracted — check original terms",
          eligibility: "Not established — check original terms",
          costsAndRequirements: "Not established — check original terms",
          risks: ["Eligibility and reward details have not been independently confirmed."],
          verdict: rewardSignal ? "Investigate — verify official terms first" : "Monitor — no confirmed reward identified",
          nextStep: rewardSignal
            ? "Open the original source and verify the campaign terms, eligible regions, deadline, required actions and any costs before participating."
            : "Review the official source for a concrete, currently available action. Do not assume an airdrop or reward will follow from general ecosystem activity.",
          assessment: "Automated research lead; not a reward-probability score",
          researchCompleteness: 0,
          verification: "This listing is not a guarantee of a reward or eligibility. Never share a seed phrase or private key, and do not sign a transaction solely because of this listing."
        });
        accepted++;
      }
      sources.push({ source: feedHost, ok: true, status: response.status, entriesFound: blocks.length, itemsAccepted: accepted, issue: blocks.length ? (accepted ? null : "Entries were found, but none passed link, date and freshness checks.") : "No RSS or Atom entries matched the expected format." });
    } catch (error) {
      sources.push({ source: feedHost, ok: false, status: null, entriesFound: 0, itemsAccepted: 0, issue: error?.name === "TimeoutError" ? "Feed request timed out." : "Feed could not be fetched or parsed." });
    }
  }

  const deduped = [...new Map(all.map(item => [item.url, item])).values()];
  deduped.sort((a, b) => Number(b.rewardSignal) - Number(a.rewardSignal) || b.relevance - a.relevance || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const candidates = deduped.slice(0, MAX_ITEMS);
  const items = await Promise.all(candidates.map(item => enrichResearchItem(item)));
  items.sort((a, b) => Number(b.rewardSignal) - Number(a.rewardSignal) || b.researchCompleteness - a.researchCompleteness || b.relevance - a.relevance || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return {
    date: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    pipelineVersion: "2.0",
    items,
    sources,
    qualitySummary: {
      feedsChecked: sources.length,
      feedsAvailable: sources.filter(source => source.ok).length,
      candidatePagesChecked: items.filter(item => item.pageCheckedAt).length,
      possibleRewardSignals: items.filter(item => item.rewardSignal).length,
      fullyVerifiedRewards: 0
    },
    disclaimer: items.length
      ? "Automated public-source research leads. A page fetch and keyword match are not independent proof that an offer is genuine, active, available in your country or payable. No reward is labelled confirmed by this pipeline. Verify the linked official terms before acting."
      : "No usable leads were collected. The source diagnostics show which feeds were unavailable or produced no fresh, parseable entries."
  };
}

export async function enrichResearchItem(item) {
  const enriched = { ...item };
  let page = null;
  try { page = await fetchArticlePage(item.url); } catch { page = null; }

  const combined = (item.title + " " + item.summary + " " + (page?.title || "") + " " + (page?.description || "") + " " + (page?.text || "")).slice(0, 30000);
  const compact = combined.replace(/\s+/g, " ").trim();
  const rewardSignal = REWARD_TERMS.test(compact);
  const eligibilityMatch = findContext(compact, /\b(?:eligible|eligibility|available in|excluding|excluded|residents of|restricted in|region|country|countries)\b/i);
  const costMatch = findContext(compact, /\b(?:fee|fees|deposit|minimum purchase|minimum balance|trading volume|gas cost|transaction cost|purchase at least|spend at least)\b/i);
  const deadlineMatch = findContext(compact, /\b(?:deadline|ends? on|ending on|expires? on|until|by \w+day|before \w+ \d{1,2})\b/i);
  const risks = RISK_TERMS.filter(([, regex]) => regex.test(compact)).map(([label]) => label);
  risks.push("Eligibility and reward details have not been independently confirmed.");
  if (!page) risks.push("The source page could not be fetched automatically; inspect the original link manually.");

  enriched.sourcePageTitle = page?.title || null;
  enriched.sourcePageDescription = page?.description || null;
  enriched.pageCheckedAt = page ? new Date().toISOString() : null;
  enriched.verificationStatus = page
    ? (page.sameHostAsFeed ? "Source page fetched on the same host as the monitored feed; claims remain unverified" : "Linked page fetched; publisher ownership and claims remain unverified")
    : "Source page could not be checked automatically";
  enriched.rewardSignal = rewardSignal;
  enriched.evidenceStatus = rewardSignal
    ? (page ? "Reward-related wording found on the linked page; reward and eligibility not independently confirmed" : "Reward-related wording found in feed; linked page could not be checked")
    : "No explicit reward signal confirmed by automated checks";
  enriched.deadline = deadlineMatch || "Not extracted — check original terms";
  enriched.eligibility = eligibilityMatch || "Not extracted — check original terms";
  enriched.costsAndRequirements = costMatch || "Not extracted — check original terms";
  enriched.risks = [...new Set(risks)];
  enriched.verdict = rewardSignal
    ? "Investigate — verify the official terms and eligibility before acting"
    : (/\btestnet\b|\bdevnet\b|\bpoints\b/i.test(compact) ? "Monitor — participation does not guarantee a reward" : "Skip as a reward lead — no concrete reward identified");
  enriched.nextStep = rewardSignal
    ? "Read the linked campaign terms. Confirm that the offer is live, you are eligible in your country, the deadline has not passed, and the expected value exceeds fees and capital risk."
    : "Treat this as ecosystem information unless the original source explicitly confirms an open campaign with published terms.";
  const completeness = [
    Boolean(page), Boolean(page?.title), Boolean(page?.description || item.summary),
    Boolean(Number.isFinite(Date.parse(item.publishedAt))), Boolean(rewardSignal),
    Boolean(deadlineMatch), Boolean(eligibilityMatch), Boolean(costMatch)
  ].filter(Boolean).length;
  enriched.researchCompleteness = Math.round(completeness / 8 * 100);
  enriched.assessment = enriched.researchCompleteness + "% research completeness — not a score for reward likelihood";
  enriched.verification = "Automated checks only. Source fetching and keyword extraction can miss conditions or misread context. Confirm the original terms, regional eligibility, deadline, fees and wallet permissions before acting.";
  return enriched;
}

async function fetchArticlePage(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) throw new Error("Unsupported source URL");
  const response = await fetch(parsed.toString(), {
    redirect: "follow",
    headers: { "User-Agent": "CryptoOpportunityScout/2.0", "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error("Source page returned non-success status");
  const type = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error("Source URL did not return HTML");
  const html = (await response.text()).slice(0, 500000);
  const titleRaw = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)/i)?.[1] || "";
  const descRaw = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]+content=["']([^"']*)/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description|twitter:description)/i)?.[1] || "";
  const title = cleanHtml(decodeEntities(titleRaw)).slice(0, 250);
  const description = cleanHtml(decodeEntities(descRaw)).slice(0, 600);
  const text = cleanHtml(decodeEntities(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  )).slice(0, 25000);
  const feedHost = new URL(url).hostname;
  const finalHost = new URL(response.url || url).hostname;
  return { title, description, text, sameHostAsFeed: finalHost === feedHost || finalHost.endsWith("." + feedHost) };
}

function extractFeedLink(block) {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)];
  for (const match of links) {
    const attrs = match[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1];
    if (href && (!rel || rel === "alternate")) return decodeEntities(href);
  }
  return cleanXml(getTag(block, "link"));
}

function normalizeArticleUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid|ref_src)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return null; }
}

function findContext(text, regex) {
  const match = regex.exec(text);
  if (!match) return null;
  const start = Math.max(0, match.index - 90);
  const end = Math.min(text.length, match.index + match[0].length + 170);
  return text.slice(start, end).trim();
}

function cleanHtml(text) { return String(text || "").replace(/\s+/g, " ").replace(/&nbsp;/gi, " ").trim(); }

function decodeEntities(text) {
  return String(text || "")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16))));
}

function cleanXml(s) {
  return decodeEntities(String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

function getTag(s, tag) {
  const re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i");
  const m = s.match(re);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "") : "";
}
