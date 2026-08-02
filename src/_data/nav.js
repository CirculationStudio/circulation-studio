/* Navigation lives in data, not markup, so it stays editable without touching
   templates. URLs are lowercase, hyphenated, no accents, per CLAUDE.md.

   Both sets come from the locked Header + Footer design. The primary four are
   the masthead nav and are repeated verbatim in the collapsed sticky bar. */
export default {
  primary: [
    { label: "Who We Are", url: "/who-we-are/" },
    { label: "What We Do", url: "/what-we-do/" },
    { label: "Results", url: "/results/" },
    { label: "Contact", url: "/contact/" }
  ],

  /* Footer colophon links. Deliberately no social links and no credential
     badges, per the locked design. */
  footer: [
    { label: "Library", url: "/library/" },
    { label: "Yelp Hub", url: "/yelp/" }
  ],

  /* THE TWO POLICY LINKS SHARE ONE ROW. Kept apart from `footer` above because
     they render as one list item with a separator between them, not as two
     rows, and a loop that produced both shapes would need a flag per entry.

     The separator is NOT part of either link. An anchor whose accessible name
     reads "Privacy /" is the defect this arrangement avoids, so the slash is a
     pseudo-element on the list item and is aria-hidden by virtue of being
     generated content. */
  /* The entity page, rendered beside the NAP in the colophon rather than as a
     row in the footer nav. Not an array, because there is one of it. */
  network: { label: "The Circulation Network", url: "/network/" },

  footerPolicy: [
    { label: "Privacy", url: "/privacy-policy/" },
    { label: "Accessibility", url: "/accessibility-statement/" }
  ]
};
