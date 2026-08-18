/* Whether a page may be indexed, as a fact about the PAGE rather than about the
 * deploy. One predicate, so the robots meta tag and sitemap.xml cannot disagree.
 *
 * ============================================================
 * THE PROBLEM THIS SOLVES. Two switches drift; one cannot.
 * ============================================================
 *
 * A page held out of the index needs two things to happen: the meta tag has to
 * say noindex, and the sitemap has to not list it. If those read separate
 * values, the failure mode is a page sitting in the sitemap still carrying
 * noindex, which is a direct contradiction handed to a crawler and reads as a
 * mistake in whichever direction it decides to believe.
 *
 * So both read this. Adding a reason to the OR below covers the meta tag and
 * the sitemap in the same edit, and there is no way to add one and forget the
 * other.
 *
 * ============================================================
 * THE THREE REASONS, AND WHY THEY ARE SEPARATE KEYS.
 * ============================================================
 *
 * `noindex`    an internal tool, permanently. /yelp-map/ and 404.njk.
 * `comingSoon` a placeholder that will be published later. /library/ today.
 * `fixture`    a test fixture that builds but is not writing. The two files in
 *              src/library/ that ARTICLE_SYSTEM.md section 11 marks for deletion.
 *
 * They stay three keys rather than collapsing into one, because they carry
 * different intent and unwind on different days. `comingSoon` gets flipped when
 * the library opens; `fixture` disappears when the fixtures are deleted;
 * `noindex` is permanent. One key would make all three look like the same
 * decision and the flip checklist would have nothing specific to name.
 *
 * ============================================================
 * WHY THIS IS A MODULE RATHER THAN AN INLINE FUNCTION.
 * ============================================================
 *
 * It is registered at TWO levels of the data cascade, and it has to be, because
 * of a shadowing hazard that would otherwise fail silently.
 *
 * tools/eleventy/article-directory-data.js already returns an `eleventyComputed`
 * object, and it is the directory data for BOTH src/library/ and src/yelp/.
 * Those are exactly the directories where `fixture` has to work. Eleventy's
 * data deep merge decides whether a global src/_data/eleventyComputed.js merges
 * with that object or is replaced by it, and eleventy.config.js never calls
 * setDataDeepMerge, so the answer rests on a framework default.
 *
 * Betting on that default is not acceptable here, because the failure is
 * silent: `pageNoindex` would resolve undefined in src/library/, both fixtures
 * would ship indexed AND in the sitemap, and nothing in the build would say so.
 *
 * So the predicate is imported and registered in both places. Whichever way the
 * merge goes, both directories resolve it, and there is still exactly one copy
 * of the rule. tools/verify greps the built fixture HTML for the tag, so if this
 * ever stops working it fails a check rather than shipping.
 */
export default (data) =>
  Boolean(data.noindex || data.comingSoon || data.fixture);
