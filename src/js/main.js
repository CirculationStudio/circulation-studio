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
