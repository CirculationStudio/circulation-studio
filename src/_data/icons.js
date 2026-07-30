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
  },

  /* Outcome-group markers for What We Do. All three are materially more
     conformant than the three above: every coordinate is a whole unit, every
     shape sits inside the live area, and none carries a fill.

     get-found settles an open question from the earlier set. It builds its
     frame from `a1 1` arcs, which is rule 4's 1-unit radius applied in
     practice. That is good evidence rule 4 governs rect-shaped paths and not
     only literal <rect> elements, which in turn makes the sharp corners on
     since-2011 above, and on stay-ahead below, genuine deviations rather than
     open questions. Worth resolving across the set in one pass.

     One naming and semantics flag on get-found: the mark is, visually, the
     conventional external-link glyph, and design.md's committed eight already
     include external-link with that exact meaning ("opens elsewhere"). Reusing
     the form as a group marker for "found" risks teaching two meanings for one
     shape. Raise it before these are committed. */
  "get-found": {
    // frame with an arrow leaving it
    body: '<path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>' +
          '<path d="M13 11l8-8"/>' +
          '<path d="M15 3h6v6"/>'
  },
  "get-built": {
    // drafting pen on its rule
    body: '<path d="M4 20v-4L15 5l4 4L8 20H4z"/>' +
          '<path d="M13 7l4 4"/>' +
          '<path d="M15 20h6"/>'
  },
  "stay-ahead": {
    // document with a turned corner
    body: '<path d="M6 3h9l4 4v14H6z"/>' +
          '<path d="M15 3v4h4"/>' +
          '<path d="M9 12h6M9 16h6"/>'
  },

  /* Utility marks for the mobile bar. Unlike the six above these are NOT new
     icons: menu and close are two of the eight design.md already commits, so
     they need no proposal. Geometry is copied verbatim from the design
     system's own icon-menu.svg and icon-close.svg rather than redrawn.

     NON-CONFORMANCE, recorded not corrected, same as the block above:
       close
         - 5.6, 12.8 and 18.4 are not whole or half units (rule 1). The X is
           drawn as a true 45 degree cross inset from the live area, which
           lands on those values by construction. Both strokes sit inside the
           20x20 live area, so only rule 1 is at issue
       menu
         - fully conformant */
  menu: {
    // three rules, the masthead's own language at icon scale
    body: '<path d="M3 6h18M3 12h18M3 18h18"/>'
  },
  close: {
    // 45 degree cross
    body: '<path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>'
  }
};
