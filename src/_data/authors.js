/* Author roster. The data file SHORTCODES.md assumes when it says:
   "author is a key, not a name. Author bios live in a data file so a bio is
   written once and rendered everywhere. Free-text author names in frontmatter
   are how you end up with three spellings of the same person."

   So an article's frontmatter carries `author: steve` and never a display
   name. layouts/article.njk resolves the key here.

   ============================================================
   HEADS UP: THIS IS THE SECOND PLACE A TEAM MEMBER IS DESCRIBED.
   ============================================================

   The team roster lives in who-we-are.njk's front matter, and Steve's name and
   role are now stated both there and here. Two spellings of one person is
   precisely what SHORTCODES.md is trying to prevent, so this wants resolving:
   most likely by moving the whole roster into this file and having Who We Are
   read from it. That means editing a marketing page, which is out of scope for
   the article system, so it is recorded rather than done.

   Name and role below are NOT invented. Both are copied from the existing Who
   We Are team entry, which is the current source of truth for them.

   The bio is a marked placeholder on purpose. An author bio does a different
   job from a team-page bio (it establishes why this person is worth reading on
   this subject, not who they are at the studio), and nobody has written one.
   Placeholder style matches the repo's existing convention, the bracketed
   markers in results.njk. */
export default {
  steve: {
    name: "Steve Lepore",
    role: "Co-Founder & SEO Strategist",
    bio: "[Author bio to be supplied]"
  }
};
