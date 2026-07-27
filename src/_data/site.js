/* Site-wide content and metadata. Kept out of markup so it stays editable.

   NOTE on location: the masthead and footer carry a Laguna Beach, California
   address, taken verbatim from the locked Header + Footer design. Other docs
   in this repo (README.md, ARCHITECTURE.md) still describe the studio as based
   in San Miguel de Allende, Mexico. Those two cannot both be the business
   address. This is contact and claims content, which CLAUDE.md says is never
   auto-edited, so nothing here was guessed: these values are the design's.
   Confirm which is correct before any Organization schema is written, because
   schema must match visible content exactly. */
export default {
  name: "Circulation Studio",
  // Default metadata. Pages override title and description in front matter;
  // SITE_ARCHITECTURE.md is the source of truth for per-page keyword alignment.
  title: "Circulation Studio",
  description: "Creative agency based in San Miguel de Allende, Mexico.",
  year: new Date().getFullYear(),

  // Shown at the masthead's left rail and on the footer's lower line.
  location: "Laguna Beach, California",

  // Time-sensitive. Shown in madder at the masthead's right rail and links to
  // contact. Update or remove when the booking window changes.
  booking: {
    label: "Now booking Q3",
    url: "/contact/"
  },

  address: {
    street: "1278 Glenneyre St #267",
    cityStateZip: "Laguna Beach, CA 92651",
    phone: "(949) 464-7246",
    phoneHref: "tel:+19494647246",
    email: "info@circulationstudio.com"
  }
};
