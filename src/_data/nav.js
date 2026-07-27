/* Navigation lives in data, not markup, so it stays editable without touching
   templates. URLs are lowercase, hyphenated, no accents, per CLAUDE.md.

   Final URLs come from SITE_ARCHITECTURE.md. */
export default {
  primary: [
    { label: "Services", url: "/services/" },
    { label: "Work", url: "/work/" },
    { label: "About", url: "/about/" },
    { label: "Contact", url: "/contact/" }
  ]
};
