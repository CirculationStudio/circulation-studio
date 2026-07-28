/* Icon geometry, kept as data so the wrapper markup lives in exactly one place
   (components/icon.njk). That wrapper is what enforces the construction rules
   structurally: 24x24 viewBox, single 2px stroke, currentColor, fill none on
   the root, butt terminals, miter joins. A page cannot opt out of them by
   pasting a stray SVG, which is the failure mode design.md's icon section
   exists to prevent.

   Bodies are stored verbatim from the design so the built page matches the
   handoff exactly. Where the geometry departs from the construction rules the
   deviation is recorded below rather than quietly corrected, because these
   three are NEW icons: design.md commits only the eight utility icons
   (whitepaper, field-note, faq, contact, menu, close, external-link,
   download), and states that new icons enter "only against a confirmed need,
   proposed and reviewed first".

   NON-CONFORMANCES, all measured, all needing a decision before these ship:

   google-partner
     - 15.2 and 1.6 are not whole or half units (rule 1)
     - the dot device is r1.6, above the 1.0 to 1.5 range rule 5 allows
   yelp-certified
     - 9.8, 14.6, 14.8 and the relative steps 1.8, 2.6, 6.4 are not whole or
       half units (rule 1). This is the least conformant of the three
   since-2011
     - geometry is fully conformant
     - the door is drawn as a sharp-cornered path. Rule 4 gives rects a
       1-unit radius, so if that rule is meant to cover rect-shaped paths this
       needs a radius; if it only governs literal <rect> elements it is fine

   Naming note: the design system already ships icon-google-ads.svg and
   icon-yelp-ads.svg as uncommitted explorations. These are different marks
   (partner and certification badges, not service markers), so they are named
   for what they denote to avoid colliding with that set. */
export default {
  "google-partner": {
    // magnifier with the dot device at its centre
    body: '<circle cx="10.5" cy="10.5" r="6.5"/>' +
          '<path d="M15.2 15.2L21 21"/>' +
          '<circle cx="10.5" cy="10.5" r="1.6" fill="currentColor" stroke="none"/>'
  },
  "yelp-certified": {
    // rosette over a ribbon, with a check inside
    body: '<circle cx="12" cy="9" r="6"/>' +
          '<path d="M9.8 14.6L8 21l4-2.6 4 2.6-1.8-6.4"/>' +
          '<path d="M9.5 9l1.8 1.8L14.8 7"/>'
  },
  "since-2011": {
    // storefront, for the longevity claim
    body: '<path d="M4 9l2-5h12l2 5"/>' +
          '<path d="M4 9h16"/>' +
          '<path d="M5 9v12h14V9"/>' +
          '<path d="M10 21v-6h4v6"/>'
  }
};
