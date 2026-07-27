/* Navigation lives in data, not markup, so it stays editable without touching
   templates. URLs are lowercase, hyphenated, no accents, per CLAUDE.md.

   Placeholder set pending SITE_ARCHITECTURE.md sign-off on the final sitemap.
   The Spanish counterpart and the language switcher are not built yet. */
export default {
  primary: [
    { label: "Services", url: "/services/" },
    { label: "Work", url: "/work/" },
    { label: "About", url: "/about/" },
    { label: "Contact", url: "/contact/" }
  ]
};
