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
    { label: "Yelp Hub", url: "/yelp/" },
    { label: "Privacy Policy", url: "/privacy-policy/" },
    { label: "Accessibility Statement", url: "/accessibility-statement/" }
  ]
};
