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

// Dedicated campaign directories complement network blogs. They are discovery
// sources, not proof that a reward exists or that a campaign remains open.
const CAMPAIGN_DIRECTORIES = [
  { url: "https://app.galxe.com/quest/explore/all", name: "Galxe Quest", host: "app.galxe.com" },
  { url: "https://app.layer3.xyz/activations", name: "Layer3 Activations", host: "app.layer3.xyz" },
  { url: "https://questira.io/campaigns", name: "Questira Campaigns", host: "questira.io" }
];

const MAX_AGE_DAYS = 45;
const MAX_ITEMS = 24;
const PAGE_TIMEOUT_MS = 6000;

const REWARD_TERMS = /\bairdrop\b|\bclaim (?:your|rewards?|tokens?)\b|\breward (?:program|programme|campaign|pool)\b|\bincentive (?:program|programme|campaign|pool)\b|\bquest campaign\b|\bpoints campaign\b|\bretroactive rewards?\b|\bearn rewards?\b|\btoken rewards?\b|\b(?:earn|get|win|claim)\s+(?:up to )?[\d,.]+\s+(?:points?|tokens?|USDT|USDC|ETH|BTC)\b|\b(?:token reward|cash reward|prize pool|reward pool)\b/i;
const ACTION_TERMS = /\b(?:register|sign up|claim|connect (?:your )?wallet|complete (?:tasks|quests|missions)|join (?:the )?campaign|mint|bridge|stake|trade|submit (?:a )?(?:form|proof|application)|verify (?:your )?account|perform (?:eligible )?transactions|follow (?:the )?project|join (?:the )?(?:discord|telegram|community)|visit (?:the )?website|answer (?:a )?quiz)\b/i;
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

  const directoryDiagnostics = [];
  for (const directory of CAMPAIGN_DIRECTORIES) {
    try {
      const response = await fetch(directory.url, {
        headers: { "User-Agent": "CryptoOpportunityScout/2.1", "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) {
        directoryDiagnostics.push({ source: directory.name, kind: "campaign-directory", ok: false, status: response.status, entriesFound: 0, itemsAccepted: 0, issue: "Directory returned a non-success HTTP status." });
        continue;
      }
      const html = (await response.text()).slice(0, 1000000);
      const links = extractCampaignLinks(html, directory);
      let accepted = 0;
      for (const link of links) {
        all.push({
          title: link.title || directory.name + " campaign",
          url: link.url,
          source: directory.name,
          sourceFeed: directory.url,
          date: new Date().toUTCString(),
          publishedAt: new Date().toISOString(),
          summary: link.summary || "Discovered through a public campaign directory; verify the campaign's own terms.",
          relevance: 70,
          rewardSignal: /airdrop|reward|token|point|quest|incentive|campaign/i.test(link.title + " " + link.summary),
          reward: "Not confirmed",
          cost: "Not established",
          evidenceStatus: "Discovered in a campaign directory; campaign terms not yet checked",
          verificationStatus: "Awaiting individual campaign-page check",
          pageCheckedAt: null, sourcePageTitle: null, sourcePageDescription: null,
          deadline: "Not extracted — check original terms",
          eligibility: "Not established — check original terms",
          costsAndRequirements: "Not established — check original terms",
          risks: ["Directory listing is not proof that the campaign is live or legitimate.", "Eligibility and reward details have not been independently confirmed."],
          verdict: "Investigate — verify official campaign terms first",
          nextStep: "Open the campaign page and confirm status, reward type, eligibility, deadline, fees and any required capital before acting.",
          assessment: "Automated research lead; not a reward-probability score",
          researchCompleteness: 0,
          verification: "Directory discovery only. Rewards, campaign status and eligibility are not guaranteed."
        });
        accepted++;
      }
      directoryDiagnostics.push({
        source: directory.name, kind: "campaign-directory", ok: true, status: response.status,
        entriesFound: links.length, itemsAccepted: accepted,
        issue: links.length ? null : "No campaign links could be extracted; this may be a JavaScript-rendered directory."
      });
    } catch (error) {
      directoryDiagnostics.push({
        source: directory.name, kind: "campaign-directory", ok: false, status: null,
        entriesFound: 0, itemsAccepted: 0,
        issue: error?.name === "TimeoutError" ? "Directory request timed out." : "Directory could not be fetched or parsed."
      });
    }
  }

  const deduped = [...new Map(all.map(item => [item.url, item])).values()];
  deduped.sort((a, b) => Number(b.rewardSignal) - Number(a.rewardSignal) || b.relevance - a.relevance || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  // Keep high-signal candidates first, but prevent one campaign directory or
  // publisher from consuming the whole page-check budget. More source diversity
  // gives the strict economics filter a fairer chance to find real opportunities.
  const candidates = [];
  const selectedPerSource = new Map();
  const MAX_CANDIDATES_PER_SOURCE = 4;
  for (const candidate of deduped) {
    const sourceCount = selectedPerSource.get(candidate.source) || 0;
    if (sourceCount >= MAX_CANDIDATES_PER_SOURCE) continue;
    candidates.push(candidate);
    selectedPerSource.set(candidate.source, sourceCount + 1);
    if (candidates.length >= MAX_ITEMS) break;
  }
  const researchedItems = await Promise.all(candidates.map(item => enrichResearchItem(item)));
  // A reachable page is not an opportunity. Publish only leads with page evidence,
  // explicit reward wording and a concrete participation/action signal.
  const items = researchedItems.filter(item => item.actionable === true && item.investmentAssessment?.decision === "Worth investing in");
  items.sort((a, b) => b.relevance - a.relevance || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return {
    date: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    pipelineVersion: "2.5",
    items,
    sources: [...sources, ...directoryDiagnostics],
    qualitySummary: {
      feedsChecked: sources.length,
      feedsAvailable: sources.filter(source => source.ok).length,
      campaignDirectoriesChecked: directoryDiagnostics.length,
      campaignDirectoriesAvailable: directoryDiagnostics.filter(source => source.ok).length,
      campaignDirectoryLinksFound: directoryDiagnostics.reduce((sum, source) => sum + source.entriesFound, 0),
      candidatePagesChecked: researchedItems.filter(item => item.pageCheckedAt).length,
      possibleRewardSignals: researchedItems.filter(item => item.rewardSignal).length,
      actionableLeadsPublished: items.length,
      rejectedAsInsufficientEvidence: researchedItems.length - items.length,
      rejectionBreakdown: {
        sourcePageUnavailable: researchedItems.filter(item => item.rejectionReason === "Source page unavailable").length,
        noRewardSignal: researchedItems.filter(item => item.rejectionReason === "No explicit reward signal").length,
        noConcreteAction: researchedItems.filter(item => item.rejectionReason === "No concrete action").length,
        campaignEnded: researchedItems.filter(item => item.rejectionReason === "Campaign appears ended").length,
        economicsNotEstablished: researchedItems.filter(item => item.rejectionReason === "Worthwhile economics not established").length
      },
      fullyVerifiedRewards: 0
    },
    disclaimer: items.length
      ? "Only leads with a fetched source page, an explicit fixed per-person fiat/stablecoin reward, no required capital, fees absent/covered and current open-status evidence pass the conservative preliminary economics screen. Passing is not a risk-adjusted expected-return calculation. This does not guarantee rewards or legitimacy. Check campaign status, eligibility, deadlines, costs and official terms before acting."
      : "No demonstrably worthwhile opportunities met the conservative evidence threshold today. The filter does not estimate reward probability or time cost. This is preferable to presenting generic announcements as opportunities. Source diagnostics show feed health; rejected candidates lacked sufficient evidence of a concrete reward and action."
  };
}

export async function enrichResearchItem(item) {
  const enriched = { ...item };
  let page = null;
  try { page = await fetchArticlePage(item.url); } catch { page = null; }

  const combined = (item.title + " " + item.summary + " " + (page?.title || "") + " " + (page?.description || "") + " " + (page?.text || "")).slice(0, 30000);
  const compact = combined.replace(/\s+/g, " ").trim();
  const rewardSignal = REWARD_TERMS.test(compact);
  const actionSignal = ACTION_TERMS.test(compact);
  const endedSignal = /\b(?:campaign|airdrop|rewards?|quest|registration|claim period)\b.{0,60}\b(?:ended|closed|expired|has finished|is over|has concluded)\b|\b(?:ended|closed|expired|has finished|is over|has concluded)\b.{0,60}\b(?:campaign|airdrop|rewards?|quest|registration|claim period)\b|\b(?:campaign|quest|registration|claim period)\s+(?:is )?closed\b/i.test(compact);
  const actionable = Boolean(page && rewardSignal && actionSignal && !endedSignal);
  const percentReturnMatch = compact.match(/\b(\d{1,3}(?:\.\d+)?)\s*%\s*(?:return|reward|yield|APR|APY|interest|bonus|back|per day|per week|over the weekend)\b/i)
    || compact.match(/\b(?:earn|receive|get|up to)\s+(\d{1,3}(?:\.\d+)?)\s*%\b/i);
  const numericValueMatch = compact.match(/\b(?:\$|USD\s*)\s?([\d,]+(?:\.\d{1,2})?)\s*(?:USDC|USDT|reward|prize|pool)?\b/i)
    || compact.match(/\b([\d,]+(?:\.\d+)?)\s*(?:USDC|USDT|USD)\b/i);
  const numericValueContext = numericValueMatch ? (compact.split(/(?<=[.!?])\s+/).find(sentence => sentence.includes(numericValueMatch[0]) && /\b(?:reward|prize|pool|earn|receive|allocation|bonus|payout|return)\b/i.test(sentence)) || "") : "";
  const explicitNoCapital = /\b(?:free to participate|no purchase necessary|no deposit required|without (?:a )?deposit|no upfront capital)\b/i.test(compact);
  const capitalRisk = /\b(?:deposit|minimum balance|minimum purchase|trading volume|leverage|borrow|collateral|lock(?:ed)? funds|stake at least)\b/i.test(compact.replace(/\bno deposit required\b|\bwithout (?:a )?deposit\b/gi, ""));
  const walletRisk = /\b(?:connect (?:your )?wallet|sign (?:a )?(?:message|transaction)|approve (?:the )?token)\b/i.test(compact);
  const highReturn = Boolean(percentReturnMatch && Number(percentReturnMatch[1]) >= 5 && /\b(?:day|week|weekend|24 hours?|48 hours?|short term|short-term)\b/i.test(compact));
  const riskLevel = highReturn || /\b(?:guaranteed returns?|risk[- ]free|double your money|100% profit|leverage|borrow)\b/i.test(compact)
    ? "High"
    : capitalRisk || walletRisk || !explicitNoCapital
      ? "Medium / uncertain"
      : "Lower direct-capital risk";
  const economicEvidence = Boolean(percentReturnMatch || numericValueContext || /\b(?:token allocation|token distribution|published points conversion|points worth|prize pool of)\b/i.test(compact));
  // Evidence-first economics screen. We only publish when the source explicitly
  // states a fixed per-person stablecoin/fiat reward, a no-capital route, fees
  // absent/covered, and current availability. This gives a gross reward estimate;
  // time cost and reward probability remain unquantified, so those limits are shown.
  const perPersonWording = /\b(?:per user|each user|per participant|each participant|you will receive|you receive|fixed reward)\b/i;
  const stablecoinOrFiat = /\b(?:USDC|USDT|USD)\b/i;
  const rewardAmountMatch = numericValueContext.match(/(?:\$\s?([\d,]+(?:\.\d{1,2})?)|(?:USD\s*)?([\d,]+(?:\.\d{1,2})?)\s*(USDC|USDT|USD))/i);
  const grossRewardValue = rewardAmountMatch
    ? Number((rewardAmountMatch[1] || rewardAmountMatch[2] || "").replace(/,/g, ""))
    : null;
  const rewardCurrencyMatch = numericValueContext.match(/\b(USDC|USDT|USD)\b/i);
  const rewardCurrency = rewardCurrencyMatch ? rewardCurrencyMatch[1].toUpperCase() : (/\$/.test(numericValueContext) ? "USD" : null);
  const fixedPerPersonReward = Boolean(
    numericValueContext && perPersonWording.test(numericValueContext) &&
    stablecoinOrFiat.test(numericValueContext) && Number.isFinite(grossRewardValue) && grossRewardValue > 0
  );
  const feesExplicitlyAbsent = /\b(?:no fees|no fee|no transaction fees|no gas fees|gas fees covered|gas sponsored|gas-free|all fees covered)\b/i.test(compact);
  const prizeDraw = /\b(?:prize draw|prize pool|lottery|random winner|draw chances?)\b/i.test(compact);
  const currentStatusEvidence = /\b(?:live now|now live|campaign is live|campaign is active|registration open|claim is live|currently open|open for registration|ongoing campaign)\b/i.test(compact);
  const noCapitalRequired = explicitNoCapital && !capitalRisk;
  const worthwhileEvidence = Boolean(
    actionable && fixedPerPersonReward && noCapitalRequired &&
    feesExplicitlyAbsent && currentStatusEvidence && !prizeDraw
  );
  const investmentDecision = worthwhileEvidence
    ? "Worth investing in"
    : "Not recommended — insufficient evidence of worthwhile economics";
  const investmentReasons = [];
  if (percentReturnMatch) investmentReasons.push("Promotional percentage detected: " + percentReturnMatch[1] + "%; this alone does not establish the calculation basis or net return.");
  if (numericValueMatch) investmentReasons.push("A numeric monetary amount was detected; only an explicitly per-person payout is eligible for the shortlist.");
  if (!fixedPerPersonReward) investmentReasons.push("No clearly stated fixed per-person fiat/stablecoin reward was established. Token prices, points, total prize pools and promotional percentages are not treated as guaranteed cash value.");
  if (!noCapitalRequired) investmentReasons.push("Required capital is not explicitly ruled out, or the source mentions deposits, trading volume, leverage or other capital exposure.");
  if (!feesExplicitlyAbsent) investmentReasons.push("Participation, transaction and network fees are not explicitly ruled out or covered.");
  if (!currentStatusEvidence) investmentReasons.push("The source does not clearly establish that the campaign is currently open.");
  if (prizeDraw) investmentReasons.push("Prize-draw value cannot be assessed without credible odds and prize-value information.");
  if (walletRisk) investmentReasons.push("Wallet connection/signing language detected; this is a material risk to disclose, not an automatic rejection. Inspect permissions and never sign an unexplained transaction.");
  if (highReturn) investmentReasons.push("A return of 5% or more over a short period was detected. This is a risk signal, not proof of worthwhile value.");
  if (worthwhileEvidence) investmentReasons.push("A fixed per-person monetary reward, no required capital, fees absent/covered and open status are stated. The reward is gross value before time cost; payout probability and eligibility still require verification.");
  const eligibilityMatch = findContext(compact, /\b(?:eligible|eligibility|available in|excluding|excluded|residents of|restricted in|region|country|countries|KYC|identity verification)\b/i);
  const costMatch = findContext(compact, /\b(?:fee|fees|deposit|minimum purchase|minimum balance|trading volume|gas cost|transaction cost|purchase at least|spend at least|no purchase necessary|free to participate)\b/i);
  const deadlineMatch = findContext(compact, /\b(?:deadline|ends? on|ending on|expires? on|until|by \w+day|before \w+ \d{1,2}|ongoing|open until)\b/i);
  const rewardDetails = findContext(compact, /\b(?:reward|rewards|prize|prizes|token allocation|token distribution|points|USDC|USD|ETH|BTC|airdrop)\b/i);
  const taskDetails = findContext(compact, /\b(?:register|sign up|claim|connect (?:your )?wallet|complete (?:tasks|quests|missions)|join (?:the )?campaign|mint|bridge|stake|trade|submit|verify|transaction)\b/i);
  const statusMatch = findContext(compact, /\b(?:live now|now live|campaign is live|campaign is active|campaign has ended|campaign ended|closed campaign|registration open|registration closed|claim is live|claim period|snapshot taken|snapshot date)\b/i);
  const risks = RISK_TERMS.filter(([, regex]) => regex.test(compact)).map(([label]) => label);
  risks.push("Eligibility and reward details have not been independently confirmed.");
  if (!page) risks.push("The source page could not be fetched automatically; inspect the original link manually.");

  enriched.sourcePageTitle = page?.title || null;
  enriched.sourcePageDescription = page?.description || null;
  enriched.pageCheckedAt = page ? new Date().toISOString() : null;
  enriched.verificationStatus = page
    ? (page.sameHostAsFeed ? "Source page fetched on the same host as the monitored feed; claims remain unverified" : "Linked page fetched; publisher ownership and claims remain unverified")
    : "Source page could not be checked automatically";
  const payoutMatch = compact.match(/\b(?:paid|pays?|distributed|receive|received|rewarded|denominated|settled|claim(?:ed)? in)\s+(?:in\s+)?(USDC|USDT|USD|ETH|BTC|SOL|BNB|ARB|OP|points?|tokens?|NFTs?)\b/i)
    || compact.match(/\b(USDC|USDT|ETH|BTC|SOL|BNB|ARB|OP|points?|tokens?|NFTs?)\s+(?:reward|payout|allocation|distribution)\b/i);
  const payoutAsset = payoutMatch ? payoutMatch.slice(1).find(Boolean) : "";
  const payoutLabel = payoutAsset
    ? (/^points?$/i.test(payoutAsset) ? "Points (monetary value not established)" : (/^NFTs?$/i.test(payoutAsset) ? "NFT (resale value not established)" : (/^(USDC|USDT|USD)$/i.test(payoutAsset) ? payoutAsset.toUpperCase() + " stablecoin/fiat-denominated (issuer and redemption risk still apply)" : payoutAsset.toUpperCase() + " crypto token (market price can fluctuate)")))
    : ( /\bpoints?\b/i.test(compact) ? "Points mentioned — conversion/redemption not established" : (/\bNFTs?\b/i.test(compact) ? "NFT mentioned — resale value not established" : (/\bairdrop\b/i.test(compact) ? "Token/airdrop mentioned — payout asset not identified" : "Not established from the source text")));
  const rewardBasis = percentReturnMatch
    ? "Advertised percentage " + percentReturnMatch[1] + "%; calculation basis and payout conditions need confirmation"
    : (numericValueContext ? "Numeric reward amount may be present; confirm whether per-user or total pool" : "Not established");
  enriched.payoutAsset = payoutLabel;
  enriched.rewardBasis = rewardBasis;
  enriched.investmentAssessment = {
    decision: investmentDecision,
    riskLevel,
    economicEvidenceFound: economicEvidence,
    reasons: investmentReasons,
    estimatedNetReturn: worthwhileEvidence ? `Gross reward: ${rewardCurrency} ${grossRewardValue.toFixed(2)} per eligible participant before time cost; not a risk-adjusted expected return.` : "Not estimated — reward probability, costs and eligibility are not reliably established automatically",
    rule: "A candidate passing this filter is a shortlist candidate, not an instruction to invest. Gross reward is not risk-adjusted expected value; time cost, payout probability and eligibility remain unquantified."
  };
  enriched.reward = "Not confirmed";
  enriched.rewardDetails = rewardDetails || "No specific reward amount/type extracted";
  enriched.taskDetails = taskDetails || "No concrete task sequence extracted";
  enriched.statusEvidence = statusMatch || "Current campaign status not established";
  enriched.campaignStatus = endedSignal ? "Possibly ended — exclude" : (statusMatch ? "Status evidence found — manual confirmation needed" : "Unconfirmed");
  enriched.cost = "Not established — check original terms";
  enriched.rewardSignal = rewardSignal;
  enriched.actionSignal = actionSignal;
  enriched.actionable = actionable;
  enriched.rejectionReason = !page
    ? "Source page unavailable"
    : !rewardSignal
      ? "No explicit reward signal"
      : !actionSignal
        ? "No concrete action"
        : endedSignal
          ? "Campaign appears ended"
          : investmentDecision !== "Worth investing in"
            ? "Worthwhile economics not established"
            : null;
  enriched.evidenceStatus = actionable
    ? "Source page fetched; reward-related wording and a participation/action signal found, but offer status and terms remain unverified"
    : (!page ? "Rejected from report: source page could not be fetched" : (!rewardSignal ? "Rejected from report: no explicit reward-related wording found" : (!actionSignal ? "Rejected from report: no concrete participation/action signal found" : "Rejected from report: source appears to describe an ended campaign")));
  enriched.deadline = deadlineMatch || "Not extracted — check original terms";
  enriched.eligibility = eligibilityMatch || "Not extracted — check original terms";
  enriched.costsAndRequirements = costMatch || "Not extracted — check original terms";
  enriched.risks = [...new Set(risks)];
  enriched.verdict = !actionable
    ? "Reject — insufficient evidence of a current, actionable reward opportunity"
    : investmentDecision === "Worth investing in"
      ? "Worth investing in — preliminary economics pass; verify legitimacy and payout first"
      : "Reject — not demonstrably worthwhile from available evidence";
  enriched.nextStep = !actionable
    ? "Not shown in the daily opportunity report. A reachable source page alone is not evidence of an opportunity."
    : investmentDecision === "Potentially worth investing in"
      ? "Verify publisher legitimacy, eligibility, exact payout, current status and withdrawal terms before acting. A worthwhile-economics pass is not a guarantee."
      : "Do not pursue or promote this as an opportunity. Reconsider only if official terms establish a fixed per-person reward, no required capital, fees absent or covered, current availability and credible payout conditions.";
  const completeness = [
    Boolean(page?.title), Boolean(page?.description), Boolean(rewardDetails),
    Boolean(taskDetails), Boolean(statusMatch), Boolean(deadlineMatch),
    Boolean(eligibilityMatch), Boolean(costMatch)
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

function extractCampaignLinks(html, directory) {
  const found = new Map();
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].slice(0, 5000);
  for (const anchor of anchors) {
    const href = anchor[1].match(/\bhref=[\"']([^\"']+)[\"']/i)?.[1];
    if (!href) continue;
    let url;
    try { url = new URL(decodeEntities(href), directory.url); } catch { continue; }
    if (url.protocol !== "https:" || url.hostname !== directory.host || url.username || url.password) continue;
    const path = url.pathname;
    const isCampaign = directory.host === "app.galxe.com"
      ? /^\/quest\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+/.test(path)
      : directory.host === "questira.io"
        ? /^\/campaign\/[A-Za-z0-9_-]+/.test(path)
        : /^\/(?:activations|quests)\/[A-Za-z0-9_-]+/.test(path);
    if (!isCampaign) continue;
    url.hash = "";
    const title = cleanHtml(decodeEntities(anchor[2].replace(/<[^>]+>/g, " "))).slice(0, 200);
    if (title.length < 3) continue;
    const summary = title;
    found.set(url.toString(), { url: url.toString(), title, summary });
  }
  return [...found.values()].slice(0, 80);
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
