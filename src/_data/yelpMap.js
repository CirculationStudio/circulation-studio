/**
 * Yelp topical authority map.
 *
 * Hand-maintained plan data for /yelp-map/. Everything about an article
 * that EXISTS is derived from collections.yelp at build time and
 * overrides what is written here. This file only describes what is
 * planned, and the current pipeline state of things not yet built.
 *
 * State is one of:
 *   SHIPPED   built, no brackets, no placeholder slots
 *   PASS1     brief written and approved
 *   PASS2     prose written
 *   PASS3     marked up, on the dev site, likely carrying brackets
 *   TO_BUILD  planned, no work started
 *   HOLD      blocked on a decision, not on capacity
 *
 * `source` records where a state came from when it was not derived:
 *   repo      confirmed in the build
 *   sitemap   confirmed in the live sitemap, August 2, 2026
 *   plan      asserted by the content plan and NOT independently
 *             confirmed. The plan has been wrong at least once.
 *
 * Seeded from yelp-content-map-and-faqs.md, August 3, 2026.
 *
 * CONVERTED FROM module.exports ON ARRIVAL. package.json sets
 * "type": "module", so a .js file here is ESM and `module` is not
 * defined in it. As delivered this file threw at load and took the
 * whole build with it. Every other file in src/_data/ uses
 * `export default`; this one now does too. Content is untouched.
 */

export default {

  pillar: {
    url: "/yelp-advertising-guide/",
    title: "The Complete Guide to Yelp Advertising",
    keyword: "yelp advertising",
    state: "TO_BUILD",
    source: "plan",
    note:
      "4,000 to 6,000 words. Every spoke currently carries an INTERIM " +
      "up-link to /yelp/ instead. When this ships, one pass retargets " +
      "every up-link in the cluster."
  },

  // Not articles. Page templates, listed because the clusters hang off
  // them and their state is not visible in collections.yelp.
  templates: [
    {
      url: "/yelp/",
      title: "Yelp Advertising Services",
      keyword: "yelp advertising agency",
      state: "SHIPPED",
      source: "sitemap",
      note: "Commercial service page and the cluster hub. Interim up-link target."
    },
    {
      url: "/yelp-partners/",
      title: "Yelp Certified Partner",
      keyword: "yelp certified partner",
      state: "SHIPPED",
      source: "repo",
      note: "Highest-stakes page in the migration. Ranks at position 3 to 4."
    },
    {
      url: "/yelp-rank-tracking-tool/",
      title: "Yelp Rank Tracking",
      keyword: "yelp rank tracking",
      state: "SHIPPED",
      source: "repo",
      note: "/yelp-rank-tracking-landing-page 301s into this."
    },
    {
      url: "/yelp/state-of-yelp-advertising-2026/",
      title: "The State of Yelp Advertising",
      keyword: "yelp advertising statistics",
      state: "SHIPPED",
      source: "repo",
      note:
        "Section 6 is bracketed and not publishable. Blocked on " +
        "first-party cost-per-lead data."
    },
    {
      url: "/yelp-faqs/",
      title: "Yelp FAQs",
      keyword: "yelp advertising faq",
      state: "TO_BUILD",
      source: "sitemap",
      note:
        "50 answers written, none marked up. Only 12 can carry a live " +
        "internal link today. Ships with 38 links stripped."
    }
  ],

  clusters: [
    {
      slug: "cost-and-pricing",
      name: "Cost and pricing",
      intent: "Commercial investigation",
      faqCount: 7,
      faqLinkable: 0,
      note:
        "Four pages that overlap each other more than they overlap the " +
        "pillar. Cost owns the number, CPC owns why it varies, budget " +
        "owns the decision procedure. If any starts explaining the " +
        "others, merge them. All four want Connor's data.",
      spokes: [
        {
          url: "/how-much-do-yelp-ads-cost/",
          title: "How Much Do Yelp Ads Cost?",
          keyword: "how much do yelp ads cost",
          state: "TO_BUILD",
          source: "plan",
          blocker: "First-party cost-per-lead data. Cluster anchor."
        },
        {
          url: "/yelp-ads-cost-per-click/",
          title: "Yelp Ads Cost Per Click",
          keyword: "yelp cost per click",
          state: "TO_BUILD",
          source: "plan",
          blocker: "First-party CPC by trade."
        },
        {
          url: "/yelp-ads-budget/",
          title: "How to Set a Yelp Ads Budget",
          keyword: "yelp ads budget",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/yelp-ads-cost-calculator/",
          title: "Yelp Ads Cost Calculator",
          keyword: "yelp ads cost calculator",
          state: "TO_BUILD",
          source: "plan",
          blocker: "Interactive tool, not an article. Needs a page template."
        }
      ]
    },

    {
      slug: "value-and-results",
      name: "Value and results",
      intent: "Commercial investigation, decision",
      faqCount: 6,
      faqLinkable: 3,
      note: "Carries the strongest proof content. Links to case studies and the whitepaper.",
      spokes: [
        {
          url: "/is-yelp-advertising-worth-it/",
          title: "Is Yelp Advertising Worth It?",
          keyword: "is yelp advertising worth it",
          state: "PASS3",
          source: "plan",
          migration: true,
          blocker:
            "Seven bracketed figures, B1 to B7, all blocked on " +
            "first-party data. Three robots-blocked sources need a " +
            "human read. Check-by date August 6 on every Q1 2026 figure."
        },
        {
          url: "/why-yelp-ads-not-working/",
          title: "Why Yelp Ads Didn't Work for You",
          keyword: "yelp ads not working",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/yelp-ads-results/",
          title: "Yelp Ads Results: What to Expect",
          keyword: "yelp ads results",
          state: "TO_BUILD",
          source: "plan",
          blocker: "First-party data."
        },
        {
          url: "/case-studies/",
          title: "Yelp Advertising Case Studies",
          keyword: "yelp advertising case study",
          state: "TO_BUILD",
          source: "plan",
          blocker: "Page template, not an article. Client permissions."
        }
      ]
    },

    {
      slug: "mechanics-and-how-to",
      name: "Mechanics and how-to",
      intent: "Informational",
      faqCount: 14,
      faqLinkable: 1,
      note:
        "The depth that answer engines cite. Light CTAs only. Largest " +
        "FAQ category and the one with almost no live link targets.",
      spokes: [
        {
          url: "/difference-between-yelp-personal-business-account/",
          title: "Yelp Personal vs Business Account",
          keyword: "yelp personal vs business account",
          state: "SHIPPED",
          source: "repo",
          migration: true
        },
        {
          url: "/yelp-portfolios-optimization/",
          title: "Yelp Portfolios",
          keyword: "yelp portfolio",
          state: "PASS2",
          source: "repo",
          migration: true,
          blocker:
            "Four display dimensions bracketed. The 1.25 and 1.33 crop " +
            "ratios contradict each other. Four behaviors need " +
            "re-observing in a managed account."
        },
        {
          url: "/how-do-yelp-ads-work/",
          title: "How Do Yelp Ads Work? The Auction Explained",
          keyword: "how do yelp ads work",
          state: "TO_BUILD",
          source: "plan",
          note:
            "Cluster anchor. No first-party data needed and no sibling " +
            "overlap. Best candidate for the first new spoke."
        },
        {
          url: "/yelp-keyword-targeting/",
          title: "Yelp Keyword Targeting and Negative Keywords",
          keyword: "yelp negative keywords",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/yelp-ad-placements/",
          title: "Where Do Yelp Ads Appear?",
          keyword: "where do yelp ads show",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/how-to-cancel-yelp-ads/",
          title: "How to Cancel or Pause Yelp Ads",
          keyword: "how to cancel yelp ads",
          state: "TO_BUILD",
          source: "plan",
          note:
            "Trust play. Also the page that has to carry the " +
            "self-serve against Purchase Order distinction properly."
        }
      ]
    },

    {
      slug: "profile-and-reviews",
      name: "Profile, reviews, and reputation",
      intent: "Informational, troubleshooting",
      faqCount: 10,
      faqLinkable: 7,
      note:
        "The biggest emotional objection to Yelp. Every page states " +
        "plainly that advertising does not influence the filter.",
      spokes: [
        {
          url: "/why-does-yelp-filter-reviews/",
          title: "Why Yelp Hides Reviews",
          keyword: "why does yelp hide reviews",
          state: "PASS2",
          source: "repo",
          migration: true,
          blocker:
            "Cluster anchor. Two VERIFIED (index) claims need a human " +
            "read. Screenshot slot is load-bearing. Dental filter-rate " +
            "study unconfirmed."
        },
        {
          url: "/yelp-enhanced-profile/",
          title: "Yelp Enhanced Profile",
          keyword: "yelp enhanced profile",
          state: "HOLD",
          source: "sitemap",
          migration: true,
          blocker:
            "Enhanced Profile moved up-market to regional and national " +
            "footprints. The page describes a product most clients " +
            "cannot buy. Retarget to Upgrade Package or split. Keyword " +
            "call, not editorial."
        },
        {
          url: "/how-to-get-more-yelp-reviews/",
          title: "How to Get More Yelp Reviews (Within the Rules)",
          keyword: "how to get yelp reviews",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/remove-negative-yelp-review/",
          title: "How to Respond to and Dispute Negative Reviews",
          keyword: "how to remove yelp review",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/yelp-profile-optimization/",
          title: "Yelp Profile Optimization Checklist",
          keyword: "yelp profile optimization",
          state: "TO_BUILD",
          source: "plan"
        }
      ]
    },

    {
      slug: "comparisons-and-alternatives",
      name: "Comparisons and alternatives",
      intent: "Commercial investigation",
      faqCount: 8,
      faqLinkable: 0,
      note:
        "Must be genuinely evenhanded to earn citations. Nothing here " +
        "exists, and it is the cluster with the second-largest FAQ " +
        "category behind it.",
      spokes: [
        {
          url: "/yelp-vs-google-ads/",
          title: "Yelp Ads vs Google Ads for Local Businesses",
          keyword: "yelp vs google ads",
          state: "TO_BUILD",
          source: "plan",
          blocker:
            "No source class authorizes Google's own documentation. " +
            "Decide before writing, not during."
        },
        {
          url: "/google-business-profile-vs-yelp/",
          title: "Google Business Profile vs Yelp",
          keyword: "google business profile vs yelp",
          state: "TO_BUILD",
          source: "plan",
          blocker: "Same Google source class question."
        },
        {
          url: "/yelp-vs-angi-vs-thumbtack/",
          title: "Yelp vs Angi vs Thumbtack",
          keyword: "yelp vs thumbtack",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/yelp-ai-search/",
          title: "Yelp and AI Search",
          keyword: "yelp ai search",
          state: "TO_BUILD",
          source: "plan",
          note:
            "Bridge page between the Yelp cluster and the Search " +
            "Everywhere positioning."
        }
      ]
    },

    {
      slug: "partners-and-management",
      name: "Partners and management",
      intent: "Transactional",
      faqCount: 4,
      faqLinkable: 1,
      note:
        "Bottom of funnel. Every informational page site-wide that " +
        "mentions professional management links here with " +
        "'Yelp Certified Partner' anchor text.",
      spokes: [
        {
          url: "/how-to-choose-yelp-agency/",
          title: "How to Choose a Yelp Advertising Agency",
          keyword: "yelp advertising agency questions",
          state: "TO_BUILD",
          source: "plan"
        },
        {
          url: "/yelp-ads-management-pricing/",
          title: "Yelp Ads Management Pricing",
          keyword: "yelp ads management cost",
          state: "TO_BUILD",
          source: "plan",
          blocker:
            "Depends on the rebate disclosure decision and on what the " +
            "partner agreement permits publishing."
        }
      ]
    },

    {
      slug: "industry-verticals",
      name: "Industry verticals",
      intent: "Commercial investigation, segmented",
      faqCount: 1,
      faqLinkable: 0,
      note:
        "The plan's verticals and the client base disagree. The plan " +
        "says therapists, restaurants, contractors, hotels. The data " +
        "says dentists, solar, garage door, windshield, restaurants. " +
        "Search equity and client evidence are both valid arguments.",
      spokes: [
        {
          url: "/yelp-for-restaurants/",
          title: "Yelp Advertising for Restaurants",
          keyword: "yelp advertising for restaurants",
          state: "TO_BUILD",
          source: "plan",
          note: "Client data and search demand both support it."
        },
        {
          url: "/yelp-for-contractors/",
          title: "Yelp Advertising for Contractors and Home Services",
          keyword: "yelp ads for contractors",
          state: "TO_BUILD",
          source: "plan",
          note:
            "Covers solar and garage door. Does not cover windshield, " +
            "which is auto repair."
        },
        {
          url: "/yelp-for-therapists/",
          title: "Should Therapists Advertise on Yelp?",
          keyword: "yelp for therapists",
          state: "TO_BUILD",
          source: "plan",
          note:
            "No client data, but /therapists ranks and bridges to it. " +
            "Search equity argument."
        },
        {
          url: "/yelp-for-dentists/",
          title: "Yelp Advertising for Dental Practices",
          keyword: "yelp for dentists",
          state: "TO_BUILD",
          source: "plan",
          note:
            "Not in the original plan. Added on client data. Bridges " +
            "to a /dental page that does not exist yet. Check the " +
            "overlap with Circulation Dental before writing."
        },
        {
          url: "/yelp-for-hotels/",
          title: "Yelp for Hotels and Hospitality",
          keyword: "yelp for hotels",
          state: "HOLD",
          source: "plan",
          blocker:
            "No client data and no bridge page. Weakest of the five. " +
            "Recommend cutting until /hospitality exists."
        }
      ]
    }
  ],

  /**
   * Blockers that are not attached to a single page. Rendered in the
   * aggregated list alongside the per-article ones the build derives.
   */
  globalBlockers: [
    {
      what: "First-party cost-per-lead data",
      owner: "Connor",
      gates:
        "Whitepaper section 6, the $307 stat, roughly a dozen FAQ " +
        "answers, all four cost-and-pricing spokes, and seven brackets " +
        "in /is-yelp-advertising-worth-it/."
    },
    {
      what: "Search Console backlink export",
      owner: "Connor",
      gates: "The redirect map, which gates DNS cutover."
    },
    {
      what: "Portfolio display dimensions, re-measured",
      owner: "Steve, browser",
      gates:
        "/yelp-portfolios-optimization/. Reconcile the 1.25 and 1.33 " +
        "crop ratios and record which surface each belongs to."
    },
    {
      what: "Four Portfolio behaviors, re-observed in a managed account",
      owner: "Steve, managed account",
      gates:
        "The four-live display cap, the description character limit, " +
        "the CTA option list, and whether a portfolio-only photo stays " +
        "out of the profile Photos section."
    },
    {
      what: "Human read of robots-blocked Yelp sources",
      owner: "Steve",
      gates:
        "biz.yelp.com DOs and DON'Ts, the CPC and cancellation support " +
        "articles, and the Master Advertising Terms. Load-bearing " +
        "corrections in articles 3 and 4."
    },
    {
      what: "Does the dental filter-rate study exist?",
      owner: "Steve",
      gates:
        "The conclusion of /why-does-yelp-filter-reviews/. Not " +
        "blocking; the piece is written to stand without it."
    },
    {
      what: "Yelp rep, three questions",
      owner: "Steve",
      gates:
        "Current partner count; what the agreement permits disclosing " +
        "about rebate structure; whether Portfolio can be bought " +
        "standalone and at what price."
    },
    {
      what: "The pillar does not exist",
      owner: "Unassigned",
      gates:
        "Every spoke carries an interim up-link to /yelp/. One pass " +
        "retargets them all when /yelp-advertising-guide/ ships."
    },
    {
      what: "Canonical host mismatch",
      owner: "Claude Code",
      gates:
        "The build emits non-www, production serves www. Must not " +
        "reach cutover."
    }
  ],

  /**
   * The 50 FAQs are tagged to clusters but only 12 can carry a live
   * internal link today. Counts are per cluster above. The 12 point at:
   * /is-yelp-advertising-worth-it, /why-does-yelp-filter-reviews,
   * /yelp-enhanced-profile,
   * /difference-between-yelp-personal-business-account, /yelp-partners.
   *
   * 27 of the 50 carry VERIFY flags, consolidated into a 17-item
   * checklist. Three of the 17 need first-party data. The other 14 are
   * primary-source confirmations and are not blocked.
   */
  faqs: {
    total: 50,
    linkableToday: 12,
    verifyFlagged: 27,
    checklistItems: 17,
    checklistBlockedOnData: 3
  }
};
