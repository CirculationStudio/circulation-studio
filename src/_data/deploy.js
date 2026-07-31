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
 * THE MECHANISM. Cloudflare's own build environment, not a switch.
 * ============================================================
 *
 * Cloudflare Pages sets CF_PAGES=1 on every build and CF_PAGES_BRANCH to the
 * branch being deployed. A production deploy is the production branch; every
 * preview deploy is some other branch. Nothing has to be remembered, toggled or
 * un-toggled, which matters because the failure mode of a manual switch is
 * shipping the live site with it still flipped.
 *
 * CF_PAGES_URL was the other candidate and is the wrong one. On a production
 * deploy it holds the project's pages.dev address rather than the custom
 * domain, so comparing it against site.url would mark production as preview.
 *
 * ============================================================
 * WHAT HAPPENS ON THE PRODUCTION HOST. Nothing. Say it plainly.
 * ============================================================
 *
 * On a Cloudflare Pages deploy of the `main` branch, `indexable` is true, no
 * robots meta tag is emitted at all, and robots.txt allows everything. The rule
 * adds nothing to the live site and cannot suppress it: there is no state to
 * get stuck in, because the decision is recomputed from the branch name on
 * every build.
 *
 * Every other build is noindex: preview branches, and local builds, which are
 * never served publicly. The rule is stated positively on purpose. Indexable
 * requires a positive identification of the production deploy, rather than
 * noindex requiring a positive identification of a preview, because the list of
 * things that are not production is open ended and the list of things that are
 * has exactly one member.
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
 * quietly carrying noindex is not visible until traffic goes.
 *
 * If the production branch is ever renamed, PRODUCTION_BRANCH has to be renamed
 * with it. That is the one thing here a human still has to keep in step, so it
 * is a single named constant rather than a string buried in a condition, and
 * every build prints which mode it chose.
 */
const PRODUCTION_BRANCH = "main";

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

const where = !onPages
  ? "local build"
  : isProduction
    ? `Cloudflare Pages, branch ${branch}`
    : `Cloudflare Pages preview, branch ${branch}`;

console.log(
  `[deploy] ${where}: ${isProduction ? "INDEXABLE, no robots restrictions" : "NOINDEX"}`
);

export default {
  onPages,
  branch,
  isProduction,
  /* Read by base.njk for the robots meta tag and by robots.njk for robots.txt,
     so the two can never disagree about the same deploy. */
  indexable: isProduction
};
