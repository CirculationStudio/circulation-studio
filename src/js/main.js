// Vite entry: importing the stylesheet lets Vite inject it via HMR in dev
// and extract it to a hashed <link> at build time. Keeps CSS on one pipeline.
import "/src/css/main.css";

/* ============================================================
   THE MASTHEAD CONDENSE.
   ============================================================

   Two jobs: flip the condensed state on scroll, and derive where the four nav
   items have to land once they part around the mark.

   WHY THIS REPLACED AN IntersectionObserver. The observer watched a sentinel
   and could express exactly one threshold, so it flipped on the same line it
   flipped back. The design wants HYSTERESIS: condense past 96px, expand back
   above 48px, deliberately apart so it cannot flicker when someone rests on the
   boundary. That needs two numbers, which a single sentinel cannot carry.

   The listener is passive and does nothing but compare a number until the
   threshold is actually crossed, so the per-frame cost is a read of scrollY and
   a comparison. Nothing here reads layout on scroll. */
const masthead = document.querySelector("[data-masthead]");
const stickybar = document.querySelector("[data-sticky-masthead]");
const navlist = document.querySelector("[data-masthead-nav]");

const CONDENSE_AT = 96;
const EXPAND_AT = 48;

if (masthead || stickybar) {
  let condensed = null;

  const setCondensed = (next) => {
    if (next === condensed) return;
    condensed = next;
    if (masthead) masthead.setAttribute("data-cond", next ? "true" : "false");
    // The mobile bar takes the same state, so the site has ONE threshold pair.
    if (stickybar) stickybar.classList.toggle("is-visible", next);
  };

  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (!condensed && y > CONDENSE_AT) setCondensed(true);
    else if (condensed && y < EXPAND_AT) setCondensed(false);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  setCondensed(false);
  onScroll();

  /* ----------------------------------------------------------
     THE DERIVED OFFSET, AND THE FONT-LOAD TRAP.
     ----------------------------------------------------------

     Who We Are and What We Do are wider together than Results and Contact, so
     equal gaps around the mark put the middle gap's centre right of the
     viewport axis. The mark holds the axis it had expanded and the RUN carries
     the difference instead, because the alternative slides the composition's
     one fixed point off the axis on the way down.

     Hand-tuned gaps were the other option and they are worse than a cost, they
     are a liability: rename Results to Case Studies and the right pair becomes
     the wider one, so a tuned correction does not go stale, it INVERTS, and
     nothing in the code would say so. This measures instead.

     THE TRAP THIS CLOSES. A measurement taken against a fallback face is wrong
     for the life of the page and silently so: Dual and the fallback set the
     same ten characters to different widths, so the run would settle at a
     plausible but incorrect position and nothing would ever recompute it. Dual
     is self-hosted with font-display:swap, so the fallback IS what paints
     first. Three hooks close it: once on mount, again when document.fonts.ready
     resolves, and again on every loadingdone event, which is what catches a
     late or cached-cold Dual. Plus resize.

     Until the first measurement lands the CSS falls back to a symmetric 44px
     split, which is wrong by the same amount but is a designed position rather
     than an accident.

     Measurement comes from offsetLeft and offsetWidth, which report
     UNTRANSFORMED layout, so a reading stays valid whichever state the header
     is in.

     NOTE FOR ANYONE CHANGING THE NAV: this assumes the mark is the middle item
     of five, so four labels. A fifth destination needs the derivation rewritten
     rather than retuned, which is the right kind of fragility: it fails at the
     length check below rather than quietly at a rename.

     The comp this came from queried an attribute its own markup did not carry,
     so its measurement never ran and it always used the fallback. The
     data-masthead-nav hook exists so that cannot happen here silently. */
  const MARK_HALF = 22;
  const GAP_MARK = 28;
  const GAP_PAIR = 40;

  let applied = null;

  const measure = () => {
    if (!navlist || !masthead) return;
    if (!masthead.clientWidth) return;
    const items = Array.prototype.slice.call(navlist.children);
    if (items.length !== 4) return;
    const w = items.map((el) => el.offsetWidth);
    if (w.some((x) => !x)) return;

    const axis = masthead.clientWidth / 2;
    const target = [];
    target[1] = axis - MARK_HALF - GAP_MARK - w[1];
    target[0] = target[1] - GAP_PAIR - w[0];
    target[2] = axis + MARK_HALF + GAP_MARK;
    target[3] = target[2] + w[2] + GAP_PAIR;

    const tx = items.map(
      (el, k) => Math.round((target[k] - el.offsetLeft) * 100) / 100
    );
    const key = tx.join(",");
    if (key === applied) return;
    applied = key;
    tx.forEach((v, k) => navlist.style.setProperty(`--cs-tx${k + 1}`, `${v}px`));
  };

  measure();
  if (document.fonts) {
    document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
  }
  window.addEventListener("resize", measure);
}

/* Mobile menu: the full-pane ink overlay behind the bar's rule icon.

   Only the .is-open class and the button's aria-expanded live here; the pane,
   the fade and the reduced-motion case are all in menu.css. The pane is
   rendered at every width and hidden above 1120 with display:none, so there is
   no template branch, and the only thing to unwind when the viewport grows is
   the trap itself (see the matchMedia guard at the bottom).

   Focus is trapped rather than merely moved: the pane covers the viewport, so
   tabbing out of it lands on controls the user cannot see. */
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");

if (menu && menuToggle) {
  // Mirrors the 1120px breakpoint in masthead.css and menu.css. Above it the
  // pane is display:none and the rail nav carries the same destinations.
  const desktop = window.matchMedia("(min-width: 1121px)");

  // Read fresh each time. The pane's contents are static today, but a stale
  // list is the classic way a focus trap starts letting Tab escape.
  const tabbables = () => menu.querySelectorAll("a[href], button:not([disabled])");

  const openMenu = () => {
    menu.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("has-menu-open");
    // The dismiss control, not the first link: it is the first thing in the
    // pane and it tells a keyboard user how to get back out.
    menu.querySelector("[data-menu-close]")?.focus();
  };

  /* Focus returns to the toggle, which is always where it came from: the
     toggle is the only thing that can open the pane. restoreFocus is false
     when the menu is closing because the viewport grew or because a link is
     navigating away. Pulling focus back to a button that is now display:none,
     or onto a page about to be replaced, is worse than leaving it alone. */
  const closeMenu = ({ restoreFocus = true } = {}) => {
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("has-menu-open");
    if (restoreFocus) menuToggle.focus();
  };

  menuToggle.addEventListener("click", openMenu);
  menu.querySelector("[data-menu-close]")?.addEventListener("click", () => closeMenu());

  /* Bound to the document, not to the pane. Tapping dead space inside the
     overlay blurs to <body> in several browsers, and a listener on the pane
     would then never see the keystroke: Escape would stop working and Tab
     would walk out into the hidden page behind. Guarding on .is-open keeps it
     inert the rest of the time. */
  document.addEventListener("keydown", (event) => {
    if (!menu.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    if (event.key !== "Tab") return;

    const items = tabbables();
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    // Focus fell out of the pane (the blur-to-body case above). Pull it back
    // rather than letting Tab continue into the page behind.
    if (!menu.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    // Wrap at both ends. Everything between the two is the browser's own tab
    // order, untouched.
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Each nav item is a real page load, so state resets on its own. Closing
  // first only avoids the pane sitting open over the outgoing page.
  for (const link of menu.querySelectorAll("a[href]")) {
    link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  }

  /* Growing past 1120 hides the pane in CSS. Without this the trap would still
     be armed and the scroll lock still applied on a page whose menu is no
     longer visible. */
  desktop.addEventListener("change", (event) => {
    if (event.matches) closeMenu({ restoreFocus: false });
  });
}

/* Assemble obfuscated email addresses.

   The markup ships the user and domain in separate data attributes and no
   mailto: anywhere, so a scraper reading the raw HTML finds no address to
   harvest. The link is built here, at runtime. Without JS the noscript
   fallback in the markup shows a readable "user [at] domain" instead, which is
   the deliberate trade: a real mailto fallback would defeat the point. */
for (const node of document.querySelectorAll("[data-email-user][data-email-domain]")) {
  const address = `${node.dataset.emailUser}@${node.dataset.emailDomain}`;
  const link = document.createElement("a");
  link.href = `mailto:${address}`;
  link.textContent = address;
  node.replaceChildren(link);
}

/* Contact form is a static mockup this pass, with no action and no backend.
   Blocking submit keeps a click from reloading the page, which would read as a
   broken form rather than an unwired one. Remove this when the form is
   actually wired. */
for (const form of document.querySelectorAll("[data-form-mockup]")) {
  form.addEventListener("submit", (event) => event.preventDefault());
}

/* ============================================================
   CONTACT PROMPTS. Four topics that light as the message is written.
   ============================================================

   ENTIRELY CLIENT SIDE. No request is made, nothing is sent before submit, and
   nothing about this touches the network. That matters beyond privacy: the
   third-party request count published on /about-this-site/ is measured from a
   real page load, and adding a call here would move a number the site publishes
   about itself.

   THE SUBMIT IS NEVER GATED. No disabled state, no count, no threshold. Send it
   with all four unlit and the form behaves identically. The rows are guidance,
   not a form control, which is also why they are list items rather than
   checkboxes: a checkbox implies something is being submitted.

   TEMPLATE SHAPES ONLY EVER SUPPRESS, and are never named on screen. If the
   message reads like a cold outreach template, no row lights, and nothing tells
   the sender why. Saying so would teach anyone sending them how to get past it.

   THE LOCATION MATCH IS A WEAK HEURISTIC and is known to be. A place name not
   on the list leaves the row unlit on a perfectly complete message. That is
   survivable precisely because nothing is gated: a wrong guess costs a grey
   tick, not a blocked form. */
const promptGroup = document.querySelector("[data-prompts]");
const promptSource = document.querySelector("[data-prompts-source]");

if (promptGroup && promptSource) {
  const BIZ = ["dentist","dental","orthodont","plumb","hvac","heating","air conditioning","roof","electrician","electrical","landscap","law firm","attorney","lawyer","med spa","medspa","salon","restaurant","contractor","remodel","veterinar","chiroprac","clinic","practice","dealership","auto repair","body shop","pest control","movers","moving company","flooring","pool service","garage door","locksmith","optometr","dermatolog","physical therapy","urgent care","accounting","bookkeeping","insurance agency","real estate","realtor","bakery","brewery","cafe","gym","boutique","hotel","property management","cleaning service","junk removal","solar","window","fencing","paving","septic","tree service","catering","photograph","daycare","tutoring","storage","franchise","dispensary","barber","tattoo","florist"];
  const GEO = ["california","orange county","los angeles","san diego","laguna","irvine","newport","costa mesa","anaheim","long beach","san francisco","sacramento","riverside","san bernardino","ventura","pasadena","texas","arizona","nevada","florida","oregon","washington","colorado","utah","new york","chicago","phoenix","seattle","portland","denver","austin","dallas","houston","atlanta","boston","miami","nashville","charlotte"];
  const WANT = ["seo","yelp","google ads","ppc","paid search","ads","website","web design","redesign","new site","reviews","reputation","ranking","rank","leads","calls","phone","traffic","visibility","map pack","conversion","bookings","appointments","more customers","more clients","grow","found"];
  const MONEY = ["budget","per month","a month","monthly spend","retainer","price range","ballpark","what do you charge","how much","invest","spend"];
  const TEMPLATE = ["hope this email finds you well","came across your website","came across your site","increase your traffic","first page of google","guest post","link building","dear sir","to whom it may concern","we are a leading","affordable seo","white label","free audit","no obligation","i am reaching out to offer","dofollow"];

  const rows = new Map();
  for (const row of promptGroup.querySelectorAll("[data-prompt]")) {
    rows.set(row.getAttribute("data-prompt"), row);
  }

  const update = () => {
    const t = (promptSource.value || "").toLowerCase();
    const any = (list) => list.some((k) => t.indexOf(k) !== -1);
    const suppressed = any(TEMPLATE);

    const on = {
      what: any(BIZ),
      where:
        any(GEO) ||
        /\b[a-z]+,\s?(ca|ny|tx|fl|az|nv|or|wa|co|ut|il|ga|ma|nc|tn)\b/.test(t) ||
        /\b\d{5}\b/.test(t),
      want: any(WANT),
      money: any(MONEY) || /\$\s?\d/.test(t)
    };

    for (const [id, row] of rows) {
      row.setAttribute("data-on", on[id] && !suppressed ? "true" : "false");
    }
  };

  promptSource.addEventListener("input", update);
  update();
}
