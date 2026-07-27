/* Site-wide content and metadata. Kept out of markup so it stays editable.

   ============================================================
   CANONICAL NAP. This object is the single source of truth for
   the business name, address and phone. Confirmed 2026-07-27.
   ============================================================

   Everything that shows or encodes the NAP reads from here: the footer
   colophon today, the Contact page and the Organization / LocalBusiness
   JSON-LD when they are built. Never re-type these values into a template,
   a schema block or a doc. NAP that disagrees with itself across a site is
   an entity-resolution problem for search engines, and CLAUDE.md requires
   schema to match visible content exactly.

   The `nap` keys deliberately use schema.org PostalAddress field names, so a
   JSON-LD block maps straight across with no transcription step:

     "address": {
       "@type": "PostalAddress",
       "streetAddress":   site.nap.streetAddress,
       "addressLocality": site.nap.addressLocality,
       "addressRegion":   site.nap.addressRegion,
       "postalCode":      site.nap.postalCode,
       "addressCountry":  site.nap.addressCountry
     }

   HISTORICAL NOTE: docs previously described the studio as based in San
   Miguel de Allende, Mexico. That was stale bleed-over and is wrong. Laguna
   Beach is canonical. Do not reintroduce the Mexico address anywhere. */
export default {
  name: "Circulation Studio",
  // Default metadata. Pages override title and description in front matter;
  // SITE_ARCHITECTURE.md is the source of truth for per-page keyword alignment.
  title: "Circulation Studio",
  description: "Creative agency based in Laguna Beach, California.",
  year: new Date().getFullYear(),

  // Shown at the masthead's left rail and on the footer's lower line.
  location: "Laguna Beach, California",

  // Time-sensitive. Shown in madder at the masthead's right rail and links to
  // contact. Update or remove when the booking window changes.
  booking: {
    label: "Now booking Q3",
    url: "/contact/"
  },

  nap: {
    name: "Circulation Studio",
    streetAddress: "1278 Glenneyre St #267",
    addressLocality: "Laguna Beach",
    addressRegion: "CA",
    postalCode: "92651",
    addressCountry: "US",
    telephone: "(949) 464-7246",
    // E.164 for the tel: href and for schema's telephone field
    telephoneHref: "tel:+19494647246",
    email: "info@circulationstudio.com",
    // Display convenience only, derived from the fields above. Never edit
    // this independently of them.
    cityStateZip: "Laguna Beach, CA 92651"
  }
};
