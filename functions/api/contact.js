/* The contact form handler. A Cloudflare Pages Function at /api/contact.
 *
 * ============================================================
 * THE ORDER OF OPERATIONS IS THE WHOLE DESIGN.
 * ============================================================
 *
 * The submission is written to KV BEFORE the send is attempted, and the write is
 * not conditional on the send succeeding. The user is told it worked as soon as
 * the record exists, and the send happens after the response has gone.
 *
 * That ordering is deliberate and it is the opposite of the obvious one. Send
 * first and report the result, and a Resend outage becomes an error message on
 * a form the visitor filled in correctly, about a system they have no stake in,
 * with nothing they can do except try again and produce a duplicate. The
 * inquiry is also gone: nothing recorded it.
 *
 * At this site's volume, roughly two inquiries a quarter, one silently dropped
 * message is a meaningful share of the year's leads. So the store is not
 * optional and it is not a log. It is the system of record, and the email is a
 * notification about it.
 *
 * WHAT THE USER SEES, IN EVERY BRANCH:
 *
 *   validation fails      an error, naming the field. It is theirs and it is
 *                         actionable.
 *   recorded, sent        success.
 *   recorded, send failed success. The failure is ours and invisible to them.
 *   nothing recorded      an error, with the phone number and email address,
 *                         because this is the only case where retrying is on
 *                         them and the only case where a fallback is needed.
 *
 * ============================================================
 * SPAM HANDLING, AND WHAT IS DELIBERATELY ABSENT.
 * ============================================================
 *
 * NO TURNSTILE, NO RECAPTCHA. Both are third-party scripts, and
 * src/about-this-site.njk states in visible copy that this site loads none and
 * sets no cookies. A spam control that falsifies a claim the site makes about
 * itself costs more than the spam does.
 *
 * NO HMAC-SIGNED RENDER TIMESTAMP, and this is a correction to the plan rather
 * than an omission. Signing a render timestamp needs a render moment, and Pages
 * serves static HTML: every visitor gets byte-identical bytes for /contact/, so
 * a token in that HTML is identical for everyone and replayable. Fetching a
 * per-session token at runtime would work but excludes anyone without
 * JavaScript, who then needs a path that accepts no token, which a bot claims by
 * simply not sending one. It buys nothing here.
 *
 * WHAT IS LEFT IS HONEST AND MOSTLY SERVER SIDE:
 *
 *   same-origin check     a POST whose Origin is not this host is refused. Stops
 *                         a form scraped and posted from somewhere else.
 *   honeypot              a field no human sees. Filled means a bot. Answered
 *                         with success, never an error, because an error tells
 *                         the author which control caught them.
 *   per-IP rate limit     the real control, in KV, unspoofable from the client.
 *   timing                a soft signal only. The client stamps the form on load
 *                         and a submission faster than a human could type is
 *                         refused, but ONLY when the stamp is present. Absent is
 *                         the no-JavaScript case and is never held against
 *                         anyone.
 *
 * If spam becomes real, the answer is a tighter rate limit, not a script.
 */

/* The recipient is READ, never typed. src/_data/site.js is the canonical NAP
   and the same object the footer colophon and the contact page render from, so
   the address a submission is sent to cannot drift from the address the site
   shows. .claude/CLAUDE.md requires this.

   Worth stating because it is the exact trap here: the Resend account is
   registered under studio@circulationstudio.com, which is NOT where inquiries
   go. Typing an address into this file is how those two become the same by
   accident. */
import site from "../../src/_data/site.js";

/* 24 months, as the KV TTL rather than as a sentence in the privacy policy.
   The policy claims this period, and a claimed retention period that nothing
   enforces is a claim that is false the first time somebody checks. This is the
   enforcement, and the policy's number is read off this constant.

   It governs the FORM STORE only. The delivered email sits in the inbox and
   nothing here governs that, which is why the policy scopes its claim rather
   than stating one period for both.

   CHANGING THIS NUMBER MAKES src/privacy-policy.njk WRONG THE SAME DAY. That
   page states 24 months and reads it off this constant. Change both or
   neither. Cloudflare documents a 60 second minimum for expirationTtl and no
   maximum, so there is headroom in either direction. */
const RETENTION_SECONDS = 60 * 60 * 24 * 730;

/* Deliberately generous. Two inquiries a quarter is the expected volume, so
   anything approaching this is either a mistake or a machine. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60;

/* Below this, nothing typed the message. Only applied when the client stamp is
   present at all. */
const MIN_FILL_MS = 2000;

const LIMITS = { name: 200, email: 254, message: 5000, listing: 500 };
const MAX_BODY_BYTES = 32 * 1024;

const FROM_FALLBACK = "Circulation Studio <contact@send.circulationstudio.com>";

const text = (value) => (typeof value === "string" ? value.trim() : "");

/* Deliberately permissive. The job is to catch a typo and an empty box, not to
   adjudicate RFC 5322. A stricter pattern rejects real addresses, and rejecting
   a real address on a form that receives two inquiries a quarter is far more
   expensive than accepting one that bounces. */
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/* THE LISTING'S SCHEME IS ADDED HERE, AND THIS IS NOT VALIDATION.
   Nothing rejects anything below. The only thing that happens is that a value
   which is unambiguously a bare hostname gets https:// in front of it, so the
   line in the notification email is a link that opens rather than plain text
   somebody has to retype.

   IT EXISTS BECAUSE THE FIELD STOPPED BEING type=url. That control was doing
   two jobs at once: it guaranteed a scheme, and it refused the entry without
   one. The refusal was the defect (an optional field blocking `nhl.com` with
   "Please enter a URL"), so the field is type=text now, which means the
   guarantee left with it. This is the guarantee, moved to the side that can
   keep it without telling anyone they are wrong.

   ANYTHING NOT CLEARLY A HOSTNAME IS PASSED THROUGH UNTOUCHED. The field is
   optional and free text, so somebody will write "we don't have one" in it,
   and "https://we don't have one" is worse than the sentence they wrote. The
   test is deliberately narrow: no whitespace, a dot, and a letters-only tail.

   A VALUE THAT ALREADY CARRIES A SCHEME IS LEFT ALONE, any scheme and not just
   http(s), because rewriting one we did not anticipate is the same mistake as
   mangling the sentence. The email body is text/plain and every HTML path
   escapes, so an odd scheme reaching the inbox is a string, never a link.

   THE SCHEME TEST FORBIDS A DOT, which RFC 3986 allows and which is the one
   place this got interesting. With a dot permitted, `yelp.com:8080/biz/x`
   parses as the scheme `yelp.com` and is passed through unchanged, so a
   listing on a non-default port is the single input that silently keeps
   missing its scheme. No scheme anyone will paste here has a dot in it, and
   `mailto:` and the rest still match, so dropping it costs nothing and fixes
   that case. */
const HAS_SCHEME = /^[a-z][a-z0-9+-]*:/i;
const BARE_HOST = /^[^\s/?#]+\.[a-z]{2,}(?:[:/?#]\S*)?$/i;

function normalizeListing(value) {
  if (!value || HAS_SCHEME.test(value)) return value;
  return BARE_HOST.test(value) ? `https://${value}` : value;
}

function validate(fields) {
  const errors = {};

  if (!fields.name) errors.name = "Please give us a name to reply to.";
  else if (fields.name.length > LIMITS.name) errors.name = "That name is too long.";

  if (!fields.email) errors.email = "We need an email address to reply to.";
  else if (fields.email.length > LIMITS.email) errors.email = "That address is too long.";
  else if (!looksLikeEmail(fields.email)) errors.email = "That does not look like an email address.";

  if (!fields.message) errors.message = "Tell us a little about what you are after.";
  else if (fields.message.length > LIMITS.message) errors.message = "That message is too long to send. Please shorten it.";

  /* The listing is checked for length and nothing else, matching the decision
     recorded on the field itself in src/contact.njk: people paste these, and a
     failed format check on a correct paste is worse than no check at all. No
     scheme is required and none ever was; normalizeListing above adds one when
     it can, and that runs before this so the limit applies to what is actually
     stored rather than to what was typed. */
  if (fields.listing && fields.listing.length > LIMITS.listing) {
    errors.listing = "That address is too long.";
  }

  return errors;
}

/* A no-JavaScript client cannot be handed JSON, so validation failure on that
   path is a real page. Self-contained, because this Function has no way to name
   the fingerprinted stylesheet and a broken link on an error page is worse than
   plain type. Rare in practice: the fields carry `required`, so the browser
   blocks the common case before it ever reaches here. */
function errorPage(errors) {
  const items = Object.values(errors)
    .map((message) => `      <li>${escapeHtml(message)}</li>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>That message did not send</title>
  <style>
    body { margin: 0; padding: 3rem 1.5rem; background: #f5f2ec; color: #1a1a1a;
           font: 1rem/1.6 Georgia, "Times New Roman", serif; }
    main { max-width: 34rem; margin: 0 auto; }
    h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 1rem; }
    ul { padding-left: 1.2rem; }
    a { color: #8f1d2e; }
  </style>
</head>
<body>
  <main>
    <h1>That message did not send</h1>
    <p>Nothing was lost. Go back and correct the following, then send it again.</p>
    <ul>
${items}
    </ul>
    <p><a href="/contact/">Back to the contact page</a></p>
  </main>
</body>
</html>`;
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

function wantsJson(request) {
  return (request.headers.get("accept") || "").includes("application/json");
}

/* Success is a 303 rather than a 200 on the no-JavaScript path, so the browser
   issues a fresh GET for /thank-you/ and the form POST leaves the history
   stack. Without it, a back-then-refresh re-submits. */
function success(request) {
  return wantsJson(request)
    ? Response.json({ ok: true })
    : new Response(null, { status: 303, headers: { Location: "/thank-you/" } });
}

function failure(request, errors, status = 400) {
  return wantsJson(request)
    ? Response.json({ ok: false, errors }, { status })
    : new Response(errorPage(errors), {
        status,
        headers: { "content-type": "text/html; charset=utf-8" }
      });
}

async function sendEmail(env, record) {
  const body = [
    `Name:    ${record.name}`,
    `Email:   ${record.email}`,
    record.listing ? `Listing: ${record.listing}` : null,
    "",
    record.message,
    "",
    "---",
    `Submitted ${record.received}`,
    `Reference ${record.id}`
  ]
    .filter((line) => line !== null)
    .join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || FROM_FALLBACK,
      to: [site.nap.email],
      /* So a reply goes to the person who wrote in, rather than to the send
         subdomain, which is not a mailbox anyone reads. */
      reply_to: record.email,
      subject: `Contact form: ${record.name}`,
      text: body
    })
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" }
    });
  }

  /* Same-origin only. A form scraped and posted from another host fails here
     before anything is stored or sent. Origin is present on every cross-origin
     POST a browser makes; a missing Origin is a non-browser client and is
     refused for the same reason. */
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== new URL(request.url).host) {
    return new Response("Cross-origin submissions are not accepted.", { status: 403 });
  }

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) {
    return failure(request, { message: "That message is too long to send. Please shorten it." }, 413);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return failure(request, { message: "That submission could not be read. Please try again." });
  }

  /* THE HONEYPOT ANSWERS WITH SUCCESS, NEVER AN ERROR. An error tells whoever
     wrote the bot which control caught them, which is a free iteration. A
     success tells them nothing and costs us nothing, since neither a record nor
     a send happens. */
  if (text(form.get("reference"))) {
    return success(request);
  }

  const fields = {
    name: text(form.get("name")),
    email: text(form.get("email")),
    message: text(form.get("message")),
    listing: normalizeListing(text(form.get("listing")))
  };

  const errors = validate(fields);
  if (Object.keys(errors).length) {
    return failure(request, errors);
  }

  /* Timing, and ONLY when the stamp is there. A page loaded without JavaScript
     never sets it, and that visitor must not be penalised for it. */
  const stamped = Number(text(form.get("rendered")));
  if (stamped && Number.isFinite(stamped) && Date.now() - stamped < MIN_FILL_MS) {
    return success(request);
  }

  const store = env.SUBMISSIONS;
  if (!store) {
    /* The binding is missing, so nothing can be recorded, so this is the one
       branch where the user has to be told. Failing loudly beats accepting a
       message into nowhere and reporting success. */
    console.error("[contact] SUBMISSIONS KV binding is not configured. Nothing was stored.");
    return failure(
      request,
      {
        message:
          `Something on our side is not working. Please email ${site.nap.email} ` +
          `or call ${site.nap.telephone} and we will pick it up from there.`
      },
      503
    );
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rateKey = `rate:${ip}`;
  const seen = Number((await store.get(rateKey)) || 0);
  if (seen >= RATE_LIMIT_MAX) {
    return failure(
      request,
      { message: "That is several messages in a short time. Please try again later." },
      429
    );
  }

  const id = crypto.randomUUID();
  const received = new Date().toISOString();
  const record = { id, received, ...fields, delivered: false, ip };

  try {
    await store.put(`submission:${received}:${id}`, JSON.stringify(record), {
      expirationTtl: RETENTION_SECONDS
    });
  } catch (error) {
    /* Same branch as a missing binding: nothing was recorded, so the visitor is
       the only copy and has to be told. */
    console.error(`[contact] KV write failed, submission NOT recorded: ${error}`);
    return failure(
      request,
      {
        message:
          `Something on our side is not working. Please email ${site.nap.email} ` +
          `or call ${site.nap.telephone} and we will pick it up from there.`
      },
      503
    );
  }

  await store.put(rateKey, String(seen + 1), { expirationTtl: RATE_LIMIT_WINDOW });

  /* THE SEND HAPPENS AFTER THE RESPONSE. waitUntil keeps the Function alive
     without the visitor waiting on Resend, which is what lets the success above
     be honest rather than optimistic: the thing being reported is the record,
     and the record already exists. */
  context.waitUntil(
    (async () => {
      const key = `submission:${received}:${id}`;
      try {
        await sendEmail(env, record);
        await store.put(key, JSON.stringify({ ...record, delivered: true }), {
          expirationTtl: RETENTION_SECONDS
        });
      } catch (first) {
        /* One retry. Most Resend failures are transient, and a second attempt
           costs nothing the visitor can perceive. */
        try {
          await sendEmail(env, record);
          await store.put(key, JSON.stringify({ ...record, delivered: true, retried: true }), {
            expirationTtl: RETENTION_SECONDS
          });
        } catch (second) {
          const reason = String(second);
          console.error(`[contact] delivery failed twice for ${key}: ${reason}`);
          await store.put(
            key,
            JSON.stringify({ ...record, delivered: false, error: reason }),
            { expirationTtl: RETENTION_SECONDS }
          );
          /* A separate marker so undelivered submissions can be listed without
             reading every record:
               wrangler kv key list --prefix failed: --binding SUBMISSIONS
             Documented in DEPLOYMENT.md. Nothing pushes a notification; being
             told rather than having to look needs a scheduled Worker, which is
             deliberately not built here. */
          await store.put(`failed:${received}:${id}`, JSON.stringify({ key, reason }), {
            expirationTtl: RETENTION_SECONDS
          });
        }
      }
    })()
  );

  return success(request);
}
