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
