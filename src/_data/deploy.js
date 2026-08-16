/* Which deploy this is, and therefore whether it may be indexed.
 *
 * ============================================================
 * THE PROBLEM. There are two crawlable origins serving this site.
 * ============================================================
 *
 * circulation-studio.pages.dev is publicly reachable and always will be:
 * Cloudflare Pages serves every deploy there, and preview deploys keep getting
 * their own subdomains after DNS cutover. Two origins serving identical pages
 * is duplicate content competing with itself, and the preview is the copy that
 * must lose, before cutover and permanently after it.
 *
 * The canonical link added alongside this already points every preview page at
 * production, which is a strong hint. This is the part that is not a hint.
 *
 * ============================================================
 * THE MECHANISM. Cloudflare's build environment, plus one deliberate flag.
 * ============================================================
 *
 * Cloudflare Pages sets CF_PAGES=1 on every build and CF_PAGES_BRANCH to the
 * branch being deployed. A production deploy is the production branch; every
 * preview deploy is some other branch.
 *
 * CF_PAGES_URL was the other candidate and is the wrong one. On a production
 * deploy it holds the project's pages.dev address rather than the custom
 * domain, so comparing it against site.url would mark production as preview.
 *
 * ============================================================
 * WHY THE BRANCH ALONE IS NOT ENOUGH. Added 2026-08-16.
 * ============================================================
 *
 * The branch answers "is this the production BUILD". It does not answer "is
 * there a production HOST yet", and until DNS cutover those are different
 * questions with different answers.
 *
 * Measured on 2026-08-16, before this flag existed:
 * www.circulationstudio.com still resolved to the old Brizy site, so no
 * customer ever reached this build. But circulation-studio.pages.dev resolved,
 * served this build, emitted no robots meta tag at all, and published a
 * robots.txt reading Allow: /. A deploy of `main` was therefore fully crawlable
 * on a public host that was not the site anyone had cut over to.
 *
 * Worse, the canonical that was supposed to make that host lose the duplicate
 * content fight pointed at www.circulationstudio.com, where /what-we-do/,
 * /contact/, /yelp/ and /accessibility-statement/ all returned 404. A
 * cross-domain canonical aimed at a 404 is ignored, so those pages were
 * indexable in their own right and the protection was inoperative on every page
 * except the home page.
 *
 * So indexability now requires BOTH: the production branch, and a human saying
 * the production host is real. SITE_LIVE=1 is set once in the Cloudflare Pages
 * dashboard at cutover and never touched again.
 *
 * THE MANUAL SWITCH THIS FILE USED TO ARGUE AGAINST IS NOW THE POINT, and the
 * reversal is deliberate rather than forgotten. The old objection was that a
 * switch can be left flipped the wrong way. True, and the failure it names is
 * shipping the live site with noindex still on, which is invisible until
 * traffic goes. The failure that actually happened is the opposite one: no
 * switch at all, and a crawlable host nobody decided to publish. Between a
 * failure that is loud at cutover and a failure that is silent for months,
 * this takes the loud one. The value is also validated below rather than
 * coerced, so the common way to leave a switch wrong, typing something that
 * quietly reads as false, throws instead.
 *
 * ============================================================
 * WHAT HAPPENS ON THE PRODUCTION HOST. Nothing, once SITE_LIVE=1.
 * ============================================================
 *
 * On a Cloudflare Pages deploy of `main` with SITE_LIVE=1, `indexable` is true,
 * no robots meta tag is emitted at all, and robots.txt allows everything. The
 * rule adds nothing to the live site and cannot suppress it.
 *
 * Every other build is noindex: preview branches, local builds, and `main`
 * before cutover. The rule is stated positively on purpose. Indexable requires
 * a positive identification of BOTH facts, rather than noindex requiring a
 * positive identification of a preview, because the list of things that are not
 * a live production deploy is open ended and the list of things that are has
 * exactly one member.
 *
 * THE NOINDEX IS THE META TAG, NOT A robots.txt Disallow. robots.txt allows
 * crawling on every deploy, so that a crawler can reach a preview page and read
 * the directive. Disallow would hide the directive rather than enforce it, and
 * on an already indexed host it would lock the URLs in place. The reasoning is
 * in src/robots.njk, next to the file it governs.
 *
 * THE ONE WAY THIS COULD SILENTLY HIDE THE LIVE SITE is a production build
 * where the branch is not readable, which would fall through to noindex. That
 * case throws instead. A failed deploy is visible within minutes; a live site
 * quietly carrying noindex is not visible until traffic goes. SITE_LIVE takes
 * the same treatment: a value that is neither on nor off throws rather than
 * being coerced, because SITE_LIVE=true silently reading as false at cutover is
 * exactly the invisible failure above.
 *
 * If the production branch is ever renamed, PRODUCTION_BRANCH has to be renamed
 * with it. That is the one thing here a human still has to keep in step, so it
 * is a single named constant rather than a string buried in a condition, and
 * every build prints which mode it chose.
 */
const PRODUCTION_BRANCH = "main";

/* Set to "1" in the Cloudflare Pages dashboard at DNS cutover, on the
   production environment only. Unset is the pre-cutover state and is correct
   until then, so its absence is never an error. */
const LIVE_FLAG = "SITE_LIVE";
const LIVE_ON = "1";
const LIVE_OFF = "0";

const onPages = Boolean(process.env.CF_PAGES);
const branch = (process.env.CF_PAGES_BRANCH || "").trim() || null;

if (onPages && !branch) {
  throw new Error(
    "[deploy] running on Cloudflare Pages with no CF_PAGES_BRANCH. " +
      "Which deploy this is cannot be determined, and guessing would either " +
      "index a preview or ship the live site with noindex. Failing instead, " +
      "because a failed deploy is visible and a hidden live site is not. " +
      "See src/_data/deploy.js."
  );
}

const isProduction = onPages && branch === PRODUCTION_BRANCH;

/* Absent and empty both mean not live. Anything else present has to be one of
   the two words this understands, or it is a typo that would otherwise decide
   the indexing of the live site by falling through to false. */
const liveRaw = process.env[LIVE_FLAG];
const liveValue = typeof liveRaw === "string" ? liveRaw.trim() : "";

if (liveValue !== "" && liveValue !== LIVE_ON && liveValue !== LIVE_OFF) {
  throw new Error(
    `[deploy] ${LIVE_FLAG} is set to ${JSON.stringify(liveRaw)}, which is ` +
      `neither ${JSON.stringify(LIVE_ON)} nor ${JSON.stringify(LIVE_OFF)}. ` +
      "Coercing it would answer whether the live site may be indexed by " +
      "guessing at a typo, and the wrong guess is invisible for months. " +
      "Failing instead. See src/_data/deploy.js."
  );
}

const siteLive = liveValue === LIVE_ON;

/* BOTH facts, positively identified. The branch says this is the production
   build; the flag says there is a production host to be. */
const indexable = isProduction && siteLive;

const where = !onPages
  ? "local build"
  : isProduction
    ? `Cloudflare Pages, branch ${branch}`
    : `Cloudflare Pages preview, branch ${branch}`;

const why = indexable
  ? "INDEXABLE, no robots restrictions"
  : isProduction
    ? `NOINDEX, production branch but ${LIVE_FLAG} is not ${LIVE_ON}: ` +
      "pre-cutover, nothing here may be indexed yet"
    : "NOINDEX";

console.log(`[deploy] ${where}: ${why}`);

export default {
  onPages,
  branch,
  /* The production BUILD. Says nothing about whether a production host exists,
     which is why it is no longer the same thing as indexable. */
  isProduction,
  /* Whether a human has declared the production host live. */
  siteLive,
  /* Read by base.njk for the robots meta tag and by robots.njk for robots.txt,
     so the two can never disagree about the same deploy. Also gates the article
     audit strip, which is why that strip now appears on the pages.dev host:
     until cutover that host IS a preview, which is what the strip is for. */
  indexable
};
