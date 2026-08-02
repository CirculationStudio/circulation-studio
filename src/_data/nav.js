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
    /* Reference rather than a service page, so footer only. Someone who wants
       to know what the other practices are, or who found one of them and is
       working out how they relate. A top-level nav slot would be spent on
       something almost nobody arrives looking for. */
    { label: "The Circulation Network", url: "/network/" },
    { label: "Privacy Policy", url: "/privacy-policy/" },
    { label: "Accessibility Statement", url: "/accessibility-statement/" }
  ]
};
