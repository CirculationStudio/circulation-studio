// Vite entry: importing the stylesheet lets Vite inject it via HMR in dev
// and extract it to a hashed <link> at build time. Keeps CSS on one pipeline.
import "/src/css/main.css";

/* Collapsed sticky masthead.

   Driven by an IntersectionObserver on a zero-height sentinel sitting just
   below the masthead, not by a scroll handler. The observer fires twice per
   scroll pass (out, then back in) instead of on every frame, so there is no
   per-frame main-thread work and nothing here reads layout. That matters for
   the INP budget in CLAUDE.md.

   Visibility is a class toggle; all the motion and the removal from the
   accessibility tree live in CSS. */
const stickybar = document.querySelector("[data-sticky-masthead]");
const sentinel = document.querySelector("[data-masthead-sentinel]");

if (stickybar && sentinel && "IntersectionObserver" in window) {
  new IntersectionObserver(
    ([entry]) => {
      stickybar.classList.toggle("is-visible", !entry.isIntersecting);
    },
    { threshold: 0 }
  ).observe(sentinel);
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
