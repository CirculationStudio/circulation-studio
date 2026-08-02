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

  /* Canonical origin, and the base every absolute URL in the JSON-LD is built
     from. Taken from DEPLOYMENT.md's stated Production URL, not invented.

     DELIBERATELY THE PRODUCTION DOMAIN, NOT THE PREVIEW HOST. DNS has not been
     cut over yet and review happens on circulation-studio.pages.dev, so the
     schema currently declares an origin the build is not served from. That is
     the right way round: schema names the entity's canonical home, and baking
     a temporary Cloudflare hostname into the Organization's @id would have to
     be unpicked at cutover, after search engines had already resolved the
     entity against it. Worth confirming the preview host stays noindexed until
     the cutover so the two are never both crawlable.

     WWW, AND THE HOST IS PART OF THE ORIGIN. This read
     https://circulationstudio.com until 2026-08-02, while production serves
     www and self-canonicalises to it: the live /yelp-partners page emits
     <link rel="canonical" href="https://www.circulationstudio.com/yelp-partners">.
     So every page this repo built was declaring a canonical origin that
     production redirects away from, and the JSON-LD was resolving the
     Organization and WebSite @ids against a host that 308s.

     A canonical pointing at a redirect is not a small error. It asks the
     crawler to consolidate signals onto a URL that immediately sends it
     somewhere else, on every page at once, and it would have shipped at
     cutover on the pages with the most to lose. Non-www still resolves and
     redirects, so no link is broken by this; the declaration just now matches
     what the server does.

     Everything absolute is built from this one value. The canonical tag goes
     through the absoluteUrl filter, and schema.njk concatenates it for the
     Organization @id, the WebSite @id, the logo, the breadcrumb root and every
     worksFor and provider reference. That is why this is one line rather than
     a search and replace. */
  url: "https://www.circulationstudio.com",

  /* The brand mark, at a STABLE unhashed path. Pages reference the icon
     through /brand/, which Vite fingerprints into /assets/<name>-<hash>.svg;
     a JSON-LD string is not an href, so Vite never rewrites it and that path
     would 404. eleventy.config.js copies this one file through public/ as
     well, verbatim, so the schema has a URL that survives a rebuild.

     This is the isotype, not the full stacked lockup. It is the only brand
     artwork in the repo. */
  logo: "/brand/Circulation-Studio-icon.svg",

  /* Stated in visible copy twice: the home page's proof line ("since 2011")
     and the Who We Are lede. Both still type the year inline; they should read
     from here when either is next touched, so there is one source rather than
     three. */
  founded: "2011",

  // Shown at the masthead's left rail and on the footer's lower line.
  location: "Laguna Beach, California",

  /* Image CDN base. Images are served from here, never committed to the repo,
     so the build stays light and art direction can be reissued without a
     deploy. Reference as {{ site.cdn }}<name>.webp; the CDN holds the WebP
     conversions of the source JPEGs from the design system's image library. */
  cdn: "https://cdn.circulationstudio.com/assets/images/",

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
    /* Split off the address above, never typed separately. The contact page
       assembles the visible address from these in JS so the markup carries no
       harvestable mailto string. Schema and the footer still use `email`. */
    get emailUser() { return this.email.split("@")[0] },
    get emailDomain() { return this.email.split("@")[1] },
    // Display convenience only, derived from the fields above. Never edit
    // this independently of them.
    cityStateZip: "Laguna Beach, CA 92651"
  }
};
